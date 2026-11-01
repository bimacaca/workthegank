import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import ffmpegPath from 'ffmpeg-static';
import { createWorker } from 'tesseract.js';

const execFileAsync = promisify(execFile);
const MAX_FRAME_BYTES = 12 * 1024 * 1024;

function parseDuration(stderr) {
  const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) : 0;
}

async function getDuration(file) {
  try {
    const result = await execFileAsync(ffmpegPath, ['-hide_banner', '-i', file], { maxBuffer: 2 * 1024 * 1024 });
    return parseDuration(result.stderr || '');
  } catch (error) {
    return parseDuration(error?.stderr || '');
  }
}

async function scanVideo(file, maxFrames, worker) {
  const duration = await getDuration(file);
  if (!duration) throw new Error(`Durasi video tidak dapat dibaca: ${path.basename(file)}`);
  const frameCount = Math.max(1, Math.min(maxFrames, Math.ceil(duration)));
  const sampleInterval = Math.max(1, duration / frameCount);
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'proof-ocr-'));
  try {
    const framePattern = path.join(tempDir, 'frame-%06d.jpg');
    await execFileAsync(ffmpegPath, [
      '-hide_banner', '-loglevel', 'error', '-i', file,
      '-vf', `fps=1/${sampleInterval.toFixed(3)},scale=min(1440\\,iw):-2`,
      '-frames:v', String(frameCount), '-q:v', '3', '-start_number', '1', framePattern,
    ], { maxBuffer: MAX_FRAME_BYTES, timeout: 90_000 });

    const frameFiles = (await fs.readdir(tempDir))
      .filter((name) => name.endsWith('.jpg'))
      .sort()
      .map((name) => path.join(tempDir, name));
    const recognized = [];
    for (const frameFile of frameFiles) {
      const image = await fs.readFile(frameFile);
      const { data } = await worker.recognize(image);
      recognized.push(data.text || '');
    }
    return {
      text: recognized.join('\n'),
      framesScanned: recognized.length,
      sampledAtOneSecondOrBetter: sampleInterval <= 1.01,
    };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

process.on('message', async ({ proofFiles, maxFrames }) => {
  let worker;
  try {
    if (!ffmpegPath) throw new Error('FFmpeg tidak tersedia di server');
    worker = await createWorker('eng', 1, {
      langPath: process.cwd(),
      gzip: false,
      logger: () => {},
    });
    await worker.setParameters({
      tessedit_pageseg_mode: '11',
      tessedit_char_whitelist: '0123456789+ -().',
    });
    const durations = await Promise.all(proofFiles.map(getDuration));
    if (durations.some((duration) => !duration)) throw new Error('Durasi salah satu video tidak dapat dibaca');
    const totalDuration = durations.reduce((sum, duration) => sum + duration, 0);
    const frameBudgets = durations.map((duration) => Math.max(1, Math.floor(maxFrames * duration / totalDuration)));
    let remainingFrames = Math.max(0, maxFrames - frameBudgets.reduce((sum, count) => sum + count, 0));
    for (let index = 0; remainingFrames > 0; index = (index + 1) % frameBudgets.length) {
      frameBudgets[index] += 1;
      remainingFrames -= 1;
    }
    const scans = [];
    for (let index = 0; index < proofFiles.length; index += 1) {
      scans.push(await scanVideo(proofFiles[index], frameBudgets[index], worker));
    }
    process.send?.({ type: 'result', scans });
  } catch (error) {
    process.send?.({ type: 'error', error: error?.message || 'Pengecekan OCR gagal' });
  } finally {
    await worker?.terminate().catch(() => {});
    process.disconnect?.();
  }
});
