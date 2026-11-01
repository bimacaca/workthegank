import { createWorker, PSM } from 'tesseract.js';
import ffmpegPath from 'ffmpeg-static';
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

async function getVideoDurationSeconds(videoPath) {
  if (!ffmpegPath) throw new Error('Pemroses video lokal belum tersedia');
  return new Promise((resolve, reject) => {
    const probe = spawn(ffmpegPath, ['-hide_banner', '-i', videoPath]);
    const timeout = setTimeout(() => probe.kill('SIGKILL'), 8_000);
    let stderr = '';
    probe.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    probe.on('error', reject);
    probe.on('close', () => {
      clearTimeout(timeout);
      const match = stderr.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
      if (!match) return reject(new Error('Durasi video tidak dapat dibaca'));
      const duration = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
      if (!Number.isFinite(duration) || duration <= 0) return reject(new Error('Durasi video tidak valid'));
      resolve(duration);
    });
  });
}

async function extractTextFromVideo(videoPath, maxFrames) {
  if (!ffmpegPath) throw new Error('Pemroses video lokal belum tersedia');
  const duration = await getVideoDurationSeconds(videoPath);
  const samplingRate = (maxFrames / duration).toFixed(10);
  const frameDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wtg-ocr-'));
  try {
    await new Promise((resolve, reject) => {
      const process = spawn(ffmpegPath, [
        '-hide_banner', '-loglevel', 'error', '-threads', '1', '-i', videoPath,
        '-vf', `fps=${samplingRate},scale=1600:-2:flags=lanczos,format=gray,eq=contrast=1.25:brightness=0.02,unsharp=5:5:0.8:5:5:0`,
        '-frames:v', String(maxFrames), '-q:v', '3', path.join(frameDir, 'frame-%03d.jpg'),
      ]);
      process.on('error', reject);
      process.on('close', (code) => code === 0 ? resolve() : reject(new Error('Gagal membaca video')));
    });
    const frames = fs.readdirSync(frameDir).filter((file) => file.endsWith('.jpg'));
    if (!frames.length) throw new Error('Tidak ada frame video yang dapat dibaca');
    const worker = await createWorker('eng', 1, {
      langPath: path.resolve(process.cwd(), 'node_modules/@tesseract.js-data/eng/4.0.0'),
      gzip: true,
    });
    try {
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SPARSE_TEXT,
        tessedit_char_whitelist: '0123456789+()- .',
      });
      const text = [];
      for (const frame of frames) {
        const result = await worker.recognize(path.join(frameDir, frame), {}, { text: true });
        text.push(result.data.text);
      }
      return { text: text.join('\n'), framesScanned: frames.length };
    } finally {
      await worker.terminate();
    }
  } finally {
    fs.rmSync(frameDir, { recursive: true, force: true });
  }
}

process.on('message', async (message) => {
  try {
    const proofFiles = message.proofFiles || [];
    const maxFrames = Math.max(2, Number(message.maxFrames) || 2);
    const scans = [];
    for (const file of proofFiles) scans.push(await extractTextFromVideo(file, maxFrames));
    process.send?.({ type: 'result', scans });
  } catch (error) {
    process.send?.({ type: 'error', error: error?.message || 'Worker OCR gagal' });
  }
});
