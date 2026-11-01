import makeWASocket, { Browsers, DisconnectReason, useMultiFileAuthState, type WASocket } from '@whiskeysockets/baileys';
import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';

const AUTH_DIR = path.resolve(process.cwd(), 'data', 'baileys-auth');
const READY_TIMEOUT_MS = 20_000;

let socket: WASocket | null = null;
let connection: 'disconnected' | 'connecting' | 'open' | 'close' = 'disconnected';
let registered = false;
let pairingCode: string | null = null;
let lastError: string | null = null;
let qrCode: string | null = null;
let connecting: Promise<void> | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;

const normalizePhone = (value: string) => {
  const cleaned = String(value || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  const digits = cleaned.replace(/\D/g, '');
  const normalized = !cleaned.startsWith('+') && digits.startsWith('08') ? `62${digits.slice(1)}` : digits;
  if (normalized.length < 8 || normalized.length > 15) throw new Error('Nomor WhatsApp tidak valid');
  return normalized;
};

const jidFromPhone = (value: string) => `${normalizePhone(value)}@s.whatsapp.net`;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForConnection(): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < READY_TIMEOUT_MS) {
    if (socket && (connection === 'connecting' || connection === 'open')) return;
    if (lastError && !socket) throw new Error(lastError);
    await wait(200);
  }
  throw new Error(lastError || 'WhatsApp belum siap menerima permintaan');
}

function scheduleReconnect() {
  if (reconnectTimer || registered) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void startBaileys().catch((error: any) => {
      lastError = error?.message || 'Gagal menyambungkan ulang WhatsApp';
    });
  }, 1_000);
}

export async function startBaileys(): Promise<void> {
  if (connecting) return connecting;
  if (socket && (connection === 'connecting' || connection === 'open')) return;

  connecting = (async () => {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    registered = Boolean(state.creds.registered);
    pairingCode = null;
    qrCode = null;
    lastError = null;
    connection = 'connecting';

    const nextSocket = makeWASocket({
      auth: state,
      browser: Browsers.ubuntu('Chrome'),
      printQRInTerminal: false,
      markOnlineOnConnect: false,
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
    });
    socket = nextSocket;
    nextSocket.ev.on('creds.update', saveCreds);
    nextSocket.ev.on('connection.update', async ({ connection: next, lastDisconnect, qr }) => {
      if (socket !== nextSocket) return;
      if (next) connection = next;
      if (qr) {
        pairingCode = null;
        qrCode = await QRCode.toDataURL(qr, { margin: 1, width: 320 });
      }
      if (next === 'open') {
        registered = true;
        pairingCode = null;
        qrCode = null;
        lastError = null;
      }
      if (next === 'close') {
        const code = (lastDisconnect?.error as any)?.output?.statusCode;
        const reason = (lastDisconnect?.error as any)?.message || 'koneksi ditutup oleh WhatsApp';
        socket = null;
        connection = 'disconnected';
        pairingCode = null;
        qrCode = null;
        lastError = `Baileys connection closed${code ? ` (${code})` : ''}: ${reason}`;

        if (code === DisconnectReason.loggedOut) {
          registered = false;
          lastError = 'Sesi WhatsApp telah logout. Pairing ulang diperlukan.';
        } else {
          scheduleReconnect();
        }
      }
    });
  })().finally(() => {
    connecting = null;
  });

  await connecting;
}

export async function requestPairing(phone: string) {
  const cleanPhone = normalizePhone(phone);
  await startBaileys();
  if (registered || socket?.user) throw new Error('WhatsApp sudah terhubung. Logout sesi terlebih dahulu untuk pairing ulang.');
  await waitForConnection();

  const activeSocket = socket;
  if (!activeSocket) throw new Error('Socket WhatsApp belum tersedia');
  let lastPairingError: any;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      pairingCode = await activeSocket.requestPairingCode(cleanPhone);
      return pairingCode;
    } catch (error: any) {
      lastPairingError = error;
      await wait(500);
    }
  }
  throw new Error(lastPairingError?.message || lastError || 'Pairing code belum diterima dari WhatsApp');
}

export const baileysStatus = () => ({
  connection,
  paired: Boolean(socket?.user || registered),
  user: socket?.user || null,
  pairingCode,
  qrCode,
  error: lastError,
});

export async function requestQr() {
  await startBaileys();
  if (registered || socket?.user) throw new Error('WhatsApp sudah terhubung. QR tidak diperlukan.');
  if (qrCode) return qrCode;

  const startedAt = Date.now();
  while (Date.now() - startedAt < READY_TIMEOUT_MS) {
    if (qrCode) return qrCode;
    if (connection === 'open') throw new Error('WhatsApp sudah terhubung.');
    if (!socket && lastError) throw new Error(lastError);
    await wait(250);
  }
  throw new Error(lastError || 'QR belum diterima dari WhatsApp');
}

export async function checkProfilePhoto(phone: string) {
  if (!socket || connection !== 'open') throw new Error('WhatsApp belum terhubung. Minta pairing terlebih dahulu.');
  const jid = jidFromPhone(phone);
  try {
    const url = await socket.profilePictureUrl(jid, 'image');
    return { phone, exists: true, photoUrl: url };
  } catch (error: any) {
    const message = String(error?.message || error || '').toLowerCase();
    if (error?.output?.statusCode === 404 || error?.status === 404 || message.includes('item-not-found') || message.includes('item not found')) {
      return { phone, exists: false, photoUrl: null };
    }
    throw error;
  }
}
