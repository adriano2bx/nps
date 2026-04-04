import makeWASocket, { 
  DisconnectReason, 
  fetchLatestBaileysVersion, 
  makeCacheableSignalKeyStore,
  WASocket
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import pino from 'pino';
import { prisma } from '../lib/prisma.js';
import { usePrismaAuthState } from '../lib/baileys-auth.js';
import { invalidateTenantCache, getLock, releaseLock } from '../lib/redis.js';

const logger = pino({ level: 'silent' });

interface BaileysSession {
  socket?: WASocket;
  qr?: string;
  status: 'INITIALIZING' | 'QR' | 'CONNECTING' | 'CONNECTED' | 'ERROR' | 'DISCONNECTED';
  error?: string;
}

class BaileysManager {
  private sessions = new Map<string, BaileysSession>();
  private connectingPromises = new Map<string, Promise<WASocket>>();
  private badMacCount = new Map<string, number>();

  constructor() {}

  public getSession(channelId: string) {
    return this.sessions.get(channelId);
  }

  public async connect(channelId: string, tenantId: string): Promise<WASocket> {
    // 0. Distributed Lock check to prevent multi-process conflicts
    const lockKey = `baileys:connect:${channelId}`;
    const acquired = await getLock(lockKey, 60000); // 1-minute lock
    if (!acquired) {
      const ownerId = await (await import('../lib/redis.js')).redis.get(`lock:${lockKey}`);
      console.warn(`[BaileysManager] 🔒 Channel ${channelId} is already being managed by another process (Owner: ${ownerId}).`);
      throw new Error(`Channel ${channelId} locked by another process (Owner: ${ownerId})`);
    }

    // 1. If already connecting in THIS process, return existing promise
    if (this.connectingPromises.has(channelId)) {
      return this.connectingPromises.get(channelId)!;
    }

    const currentSession = this.sessions.get(channelId);
    if (currentSession?.status === 'CONNECTED' && currentSession.socket) {
      return currentSession.socket;
    }

    const connectPromise = (async () => {
      try {
        const { state, saveCreds } = await usePrismaAuthState(channelId);
        const { version } = await fetchLatestBaileysVersion();

        const socket = makeWASocket({
          version,
          printQRInTerminal: false,
          auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
          },
          logger,
        });

        this.sessions.set(channelId, { socket, status: 'INITIALIZING' });

        socket.ev.on('creds.update', async () => {
           await saveCreds();
           // Refresh lock on each major activity
           await getLock(lockKey, 60000);
        });

        socket.ev.on('connection.update', async (update) => {
          const { connection, lastDisconnect, qr } = update;
          const session = this.sessions.get(channelId) || { status: 'INITIALIZING' };

          if (qr) {
            const qrBase64 = await QRCode.toDataURL(qr);
            this.sessions.set(channelId, { ...session, status: 'QR', qr: qrBase64 });
          }

          if (connection === 'close') {
            const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            console.log(`[Baileys] Connection closed for ${channelId}. Reason: ${statusCode}. Reconnect: ${shouldReconnect}`);
            
            this.sessions.set(channelId, { ...session, status: 'DISCONNECTED', qr: undefined });

            // Update status in DB and invalidate cache
            await prisma.whatsAppChannel.update({
              where: { id: channelId },
              data: { status: 'DISCONNECTED' }
            });
            await invalidateTenantCache(tenantId);

            if (shouldReconnect) {
              setTimeout(() => this.connect(channelId, tenantId), 3000);
            } else {
              await this.logout(channelId, tenantId);
            }
          } else if (connection === 'open') {
            console.log(`[Baileys] ✅ Connected: ${channelId}`);
            this.sessions.set(channelId, { ...session, socket, status: 'CONNECTED', qr: undefined });
            this.badMacCount.set(channelId, 0); // Reset error count on successful connection
            
            await prisma.whatsAppChannel.update({
              where: { id: channelId },
              data: { status: 'CONNECTED' }
            });

            // Invalidate cache so frontend reflects the new status
            await invalidateTenantCache(tenantId);
          }
        });

        socket.ev.on('messages.upsert', async (m) => {
          // Heartbeat the lock on activity (Refreshing TTL)
          await getLock(lockKey, 60000);

          console.log(`[BaileysManager] 📨 messages.upsert event received (type: ${m.type}) for channel ${channelId}`);
          try {
            if (m.type === 'notify') {
              for (const msg of m.messages) {
                console.log(`[BaileysManager] Message Detail: fromMe: ${msg.key.fromMe}, remoteJid: ${msg.key.remoteJid}, hasMessageContent: ${!!msg.message}`);
                
                // --- Bad MAC / Decryption Failure Detection ---
                // If message is present but has no content and isn't a stub, it's likely a decryption failure
                const isDecryptionFailure = !msg.message && !msg.messageStubType && !msg.key.fromMe;
                
                if (isDecryptionFailure) {
                   const count = (this.badMacCount.get(channelId) || 0) + 1;
                   this.badMacCount.set(channelId, count);
                   console.error(`[Baileys] ❌ Decryption Failure (Bad MAC) on ${channelId} (Total: ${count})`);
                   
                   if (count >= 3) {
                      console.error(`[Baileys] 🚨 Critical instability on ${channelId}. Clearing session keys for recovery.`);
                      // Deep clean of keys while trying to keep creds
                      await prisma.baileysSession.deleteMany({
                         where: { 
                            channelId,
                            key: { not: 'creds' } // Keep the login, but kill the out-of-sync keys
                         }
                      });
                      this.badMacCount.set(channelId, 0);
                      socket.end(new Error('Persistent Bad MAC - Restarting session keys'));
                      return;
                   }
                }

                if (!msg.message || msg.key.fromMe || msg.key.remoteJid === 'status@broadcast' || msg.key.remoteJid?.endsWith('@g.us')) continue;

                // Robust text extraction from various Baileys message formats
                const extractText = (m: any) => {
                  return m.conversation || 
                         m.extendedTextMessage?.text || 
                         m.imageMessage?.caption || 
                         m.videoMessage?.caption ||
                         m.buttonsResponseMessage?.selectedButtonId ||
                         m.listResponseMessage?.singleSelectReply?.selectedRowId ||
                         null;
                };

                const textContent = extractText(msg.message);
                console.log(`[BaileysManager] Incoming message from ${msg.key.remoteJid}. Extracted Text: "${textContent}"`);

                if (textContent) {
                  this.badMacCount.set(channelId, 0); // Successful message = healthy session
                  const { surveyEngine } = await import('./survey-engine.js');
                  await surveyEngine.handleIncomingMessage(channelId, msg.key.remoteJid!, textContent, msg.pushName || undefined);
                } else {
                  console.log(`[BaileysManager] ⚠️ Could not extract text from message type: ${Object.keys(msg.message).join(', ')}`);
                }
              }
            }
          } catch (err) {
            console.error(`[BaileysManager] Error in messages.upsert:`, err);
          }
        });

        return socket;
      } catch (error) {
        console.error(`[BaileysManager] Failed to start session ${channelId}:`, error);
        this.sessions.delete(channelId);
        throw error;
      }
    })();

    this.connectingPromises.set(channelId, connectPromise);
    try {
      return await connectPromise;
    } finally {
      this.connectingPromises.delete(channelId);
      // We explicitly DO NOT release the connection lock here 
      // because we want this process to OWN the channel permanently 
      // while the socket is active (heartbeated in upsert/creds).
    }
  }

  public async logout(channelId: string, tenantId: string) {
    const session = this.sessions.get(channelId);
    if (session?.socket) {
      try {
        await session.socket.logout();
      } catch (e) {}
    }
    this.sessions.delete(channelId);
    
    // Clear storage in DB
    await prisma.baileysSession.deleteMany({
      where: { channelId }
    });

    // Update status in DB
    await prisma.whatsAppChannel.update({
      where: { id: channelId },
      data: { status: 'DISCONNECTED' }
    });
  }

  public async sendMessage(channelId: string, tenantId: string, to: string, text: string) {
    let session = this.sessions.get(channelId);

    // Auto-connect if not in memory but session exists in DB
    if (!session || session.status !== 'CONNECTED') {
      const sessionExists = await prisma.baileysSession.findFirst({
        where: { channelId, key: 'creds' }
      });
      
      if (sessionExists) {
        await this.connect(channelId, tenantId);
        // Wait briefly for connection
        await new Promise(resolve => setTimeout(resolve, 3000));
        session = this.sessions.get(channelId);
      }
    }

    if (session?.status === 'CONNECTED' && session.socket) {
      // If the "to" already has a JID suffix, use it. Otherwise, assume @s.whatsapp.net. 
      const jid = (to.includes('@s.whatsapp.net') || to.includes('@lid')) 
        ? to 
        : `${to.replace(/\D/g, '')}@s.whatsapp.net`;
        
      await session.socket.sendMessage(jid, { text });
      return true;
    }
    
    throw new Error(`Channel ${channelId} not connected`);
  }

  private isInitializing = false;

  /**
   * Initialize all active Baileys channels from the database on startup.
   */
  public async init() {
    if (this.isInitializing) return;
    this.isInitializing = true;
    
    try {
      const activeChannels = await prisma.whatsAppChannel.findMany({
        where: { provider: 'BAILEYS' }
      });

      console.log(`[BaileysManager] 🔄 Initializing ${activeChannels.length} Baileys channels...`);

      for (const channel of activeChannels) {
        const sessionExists = await prisma.baileysSession.findFirst({
          where: { channelId: channel.id, key: 'creds' }
        });
        
        if (sessionExists) {
          console.log(`[BaileysManager] Automated Reconnect: ${channel.name} (${channel.id})`);
          // We don't await each to avoid blocking the whole boot process, 
          // but we want them to start connecting.
          this.connect(channel.id, channel.tenantId).catch(err => {
            console.error(`[BaileysManager] Failed to auto-reconnect ${channel.id}:`, err);
          });
        }
      }
    } catch (error) {
      console.error('[BaileysManager] Error during initialization:', error);
    }
  }
}

export const baileysManager = new BaileysManager();
