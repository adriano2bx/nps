import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger.js';

/**
 * Middleware do Express para registrar todas as rotas passadas e métricas.
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Hook quando a resposta termina (response.end)
  res.on('finish', () => {
    const duration = Date.now() - start;
    const msg = `[${req.method}] ${req.originalUrl} - ${res.statusCode} - ${duration}ms`;

    // Se o status HTTP representar problema, log com erro. Senão, info.
    if (res.statusCode >= 500) {
      logger.error({ method: req.method, url: req.originalUrl, status: res.statusCode, duration, ip: req.ip }, msg);
    } else if (res.statusCode >= 400) {
      logger.warn({ method: req.method, url: req.originalUrl, status: res.statusCode, duration }, msg);
    } else {
      logger.info({ method: req.method, url: req.originalUrl, status: res.statusCode, duration }, msg);
    }
  });

  next();
};
