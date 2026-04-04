import pino from 'pino';
import fs from 'fs-extra';
import path from 'path';

// Garante que o diretório de logs exista
const logDir = path.resolve(process.cwd(), 'logs');
fs.ensureDirSync(logDir);
const logFile = path.join(logDir, 'nps-app.log');

// Setup dos destinos de stream (Terminal e Disco)
const streams = [
  { 
    stream: pino.destination({ 
      dest: logFile, 
      sync: false // Gravação assíncrona para não travar o event loop
    }) 
  },
  {
    stream: process.stdout // Imprime na tela nativamente
  }
];

// Instância principal (singleton)
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
}, pino.multistream(streams));

/**
 * Função responsável por sequestrar o "console.log" e redirecionar
 * os logs estáticos antigos de todos os outros arquivos para o Pino,
 * garantindo que mesmo os logs não refatorados apareçam no disco.
 */
export function setupGlobalLogger() {
  const originalLog = console.log;
  const originalInfo = console.info;
  const originalWarn = console.warn;
  const originalError = console.error;

  console.log = (...args: any[]) => {
    logger.info({ context: 'console' }, args.join(' '));
    // Opcional: imprimir estrito à cor original do Node. Comentado pois Pino fará isso.
  };

  console.info = (...args: any[]) => {
    logger.info({ context: 'console' }, args.join(' '));
  };

  console.warn = (...args: any[]) => {
    logger.warn({ context: 'console' }, args.join(' '));
  };

  console.error = (...args: any[]) => {
    logger.error({ context: 'console' }, args.join(' '));
  };

  // Traumas e Exceções não tratadas no root
  process.on('uncaughtException', (err) => {
    logger.fatal(err, 'Uncaught Exception detectada no Node.js!');
    // Idealmente você reiniciaria o processo após gravar o fatal.
    process.exit(1); 
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.fatal({ reason, promise }, 'Unhandled Rejection (Promise) detectada!');
  });
}
