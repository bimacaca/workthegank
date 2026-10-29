import makeWASocket, { Browsers, DisconnectReason, useMultiFileAuthState, type WASocket } from '@whiskeysockets/baileys';
import path from 'path';
import fs from 'fs';

const AUTH_DIR = path.resolve(process.cwd(), 'data', 'baileys-auth');
let socket: WASocket | null = null;
let connection = 'disconnected';
let pairingCode: string | null = null;
let lastError: string | null = null;
let connecting: Promise<void> | null = null;

const jidFromPhone = (value: string) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) throw new Error('Nomor WhatsApp tidak valid');
  return `${digits}@s.whatsapp.net`;
};

export async function startBaileys(phone?: string): Promise<void> {
  if (connecting) return connecting;
  connecting = (async () => {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    socket = makeWASocket({ auth: state, browser: Browsers.ubuntu('Chrome'), printQRInTerminal: false });
    socket.ev.on('creds.update', saveCreds);
    socket.ev.on('connection.update', async ({ connection: next, lastDisconnect }) => {
      if (next) connection = next;
      if (next === 'open') { pairingCode = null; lastError = null; }
      if (next === 'close') {
        socket = null;
        const code = (lastDisconnect?.error as any)?.output?.statusCode;
        if (code !== DisconnectReason.loggedOut) {
          connecting = null;
          void startBaileys();
        } else { lastError = 'Sesi WhatsApp telah logout. Pairing ulang diperlukan.'; }
      }
    });
    if (phone && !state.creds.registered) {
      const cleanPhone = phone.replace(/\D/g, '');
      pairingCode = await socket.requestPairingCode(cleanPhone);
    }
  })().finally(() => { connecting = null; });
  return connecting;
}

export async function requestPairing(phone: string) {
  await startBaileys(phone);
  return pairingCode;
}

export const baileysStatus = () => ({ connection, paired: Boolean(socket?.user), user: socket?.user || null, pairingCode, error: lastError });

export async function checkProfilePhoto(phone: string) {
  if (!socket || connection !== 'open') throw new Error('WhatsApp belum terhubung. Minta pairing terlebih dahulu.');
  const jid = jidFromPhone(phone);
  try {
    const url = await socket.profilePictureUrl(jid, 'image');
    return { phone, exists: true, photoUrl: url };
  } catch (error: any) {
    // Baileys returns a 404 when the number has no visible profile photo.
    if (error?.output?.statusCode === 404 || error?.status === 404) return { phone, exists: false, photoUrl: null };
    throw error;
  }
}
