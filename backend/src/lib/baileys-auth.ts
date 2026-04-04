import { 
  AuthenticationState, 
  AuthenticationCreds, 
  SignalDataTypeMap, 
  initAuthCreds, 
  BufferJSON, 
  proto 
} from '@whiskeysockets/baileys';
import { prisma } from './prisma.js';

/**
 * Custom Baileys Authentication State that stores data in Prisma (Postgres)
 * instead of the file system. This ensures better stability and prevents
 * session corruption in multi-instance environments.
 */
export const usePrismaAuthState = async (channelId: string): Promise<{ state: AuthenticationState, saveCreds: () => Promise<void> }> => {
  
  const writeData = async (data: any, key: string) => {
    const value = JSON.stringify(data, BufferJSON.replacer);
    await prisma.baileysSession.upsert({
      where: { channelId_key: { channelId, key } },
      create: { channelId, key, value },
      update: { value }
    });
  };

  const readData = async (key: string) => {
    try {
      const result = await prisma.baileysSession.findUnique({
        where: { channelId_key: { channelId, key } }
      });
      return result ? JSON.parse(result.value, BufferJSON.reviver) : null;
    } catch (e) {
      return null;
    }
  };

  const removeData = async (key: string) => {
    try {
      await prisma.baileysSession.delete({
        where: { channelId_key: { channelId, key } }
      });
    } catch (e) {}
  };

  const creds: AuthenticationCreds = await readData('creds') || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data: { [id: string]: SignalDataTypeMap[typeof type] } = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}`);
              if (type === 'app-state-sync-key' && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            })
          );
          return data;
        },
        set: async (data: any) => {
          const tasks: Promise<void>[] = [];
          for (const category in data) {
            const categoryData = data[category];
            for (const id in categoryData) {
              const value = categoryData[id];
              const key = `${category}-${id}`;
              tasks.push(value ? writeData(value, key) : removeData(key));
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: async () => {
      await writeData(creds, 'creds');
    },
  };
};
