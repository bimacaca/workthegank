import fs from 'fs';
import path from 'path';

type ProfileResult = { phoneNumber: string; profilePictureUrl?: string; status: 'matched' | 'not_found' | 'disconnected' | 'error'; detail?: string };

let socketPromise: Promise<any> | null = null;

async function getSocket(): Promise<any> {
  if (socketPromise) return socketPromise;
  socketPromise = (async () => {
    try {
      // Dynamic loader keeps the OCR/admin app usable when Baileys is not installed yet.
      const baileys: any = await new Function('moduleName', 'return import(moduleName)')('@whiskeysockets/baileys');
      const authDir = path.resolve(process.env.WHATSAPP_AUTH_DIR || 'data/whatsapp-auth');
      fs.mkdirSync(authDir, { recursive: true });
      const { state, saveCreds } = await baileys.useMultiFileAuthState(authDir);
      const socket = baileys.default({ auth: state, printQRInTerminal: false, browser: ['WTG Admin', 'Chrome', '1.0.0'] });
      socket.ev.on('creds.update', saveCreds);
      socket.ev.on('connection.update', ({ connection }: any) => {
        if (connection === 'close') socketPromise = null;
      });
      return socket;
    } catch (error) {
      socketPromise = null;
      throw error;
    }
  })();
  return socketPromise;
}

export async function lookupWhatsAppProfilePictures(numbers: string[]): Promise<{ results: ProfileResult[]; available: boolean; note: string }> {
  try {
    const socket = await getSocket();
    const results: ProfileResult[] = [];
    for (const phoneNumber of numbers) {
      try {
        const jid = `${phoneNumber}@s.whatsapp.net`;
        const exists = await socket.onWhatsApp(jid);
        if (!exists?.[0]?.exists) {
          results.push({ phoneNumber, status: 'not_found', detail: 'Nomor tidak terdaftar di WhatsApp' });
          continue;
        }
        const profilePictureUrl = await socket.profilePictureUrl(jid, 'image').catch(() => undefined);
        results.push({ phoneNumber, profilePictureUrl, status: profilePictureUrl ? 'matched' : 'not_found', detail: profilePictureUrl ? 'Foto profil ditemukan' : 'Nomor ada, tetapi foto profil tidak tersedia' });
      } catch (error: any) {
        results.push({ phoneNumber, status: 'error', detail: error?.message || 'Gagal mengambil foto profil' });
      }
    }
    return { results, available: true, note: 'Foto profil diambil dari sesi WhatsApp Baileys. Perbandingan visual dengan video tetap perlu konfirmasi jika tampilan video buram atau foto profil tidak terlihat.' };
  } catch (error: any) {
    return { results: numbers.map((phoneNumber) => ({ phoneNumber, status: 'disconnected' as const, detail: 'Sesi WhatsApp Baileys belum tersambung' })), available: false, note: `Baileys belum aktif: ${error?.message || 'dependensi atau sesi belum tersedia'}` };
  }
}
