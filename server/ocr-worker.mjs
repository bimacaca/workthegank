import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import ffmpegPath from 'ffmpeg-static';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';

const execFileAsync = promisify(execFile);
const MAX_FRAME_BYTES = 12 * 1024 * 1024;
const FRAMES_PER_SECOND = 4;

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

async function frameFingerprint(file) {
  const { data } = await sharp(file).resize(128, 72, { fit: 'fill' }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const tiles = [];
  for (let tileY = 0; tileY < 9; tileY += 1) {
    for (let tileX = 0; tileX < 16; tileX += 1) {
      let total = 0;
      for (let y = tileY * 8; y < (tileY + 1) * 8; y += 1) {
        for (let x = tileX * 8; x < (tileX + 1) * 8; x += 1) total += data[y * 128 + x];
      }
      tiles.push(total / 64);
    }
  }
  return tiles;
}

function isMeaningfullyDifferent(previous, current) {
  if (!previous) return true;
  return current.some((value, index) => Math.abs(value - previous[index]) >= 4);
}

async function scanVideo(file, worker, onProgress) {
  const duration = await getDuration(file);
  if (!duration) throw new Error(`Durasi video tidak dapat dibaca: ${path.basename(file)}`);
  const frameCount = Math.ceil(duration * FRAMES_PER_SECOND);
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'proof-ocr-'));
  try {
    const framePattern = path.join(tempDir, 'frame-%06d.jpg');
    await execFileAsync(ffmpegPath, [
      '-hide_banner', '-loglevel', 'error', '-i', file,
      '-vf', `fps=${FRAMES_PER_SECOND},scale=min(1440\\,iw):-2`,
      '-frames:v', String(frameCount), '-q:v', '3', '-start_number', '1', framePattern,
    ], { maxBuffer: MAX_FRAME_BYTES, timeout: 10 * 60_000 });

    const frameFiles = (await fs.readdir(tempDir))
      .filter((name) => name.endsWith('.jpg'))
      .sort()
      .map((name) => path.join(tempDir, name));
    const recognized = [];
    let previousFingerprint = null;
    for (let index = 0; index < frameFiles.length; index += 1) {
      const frameFile = frameFiles[index];
      const fingerprint = await frameFingerprint(frameFile);
      if (isMeaningfullyDifferent(previousFingerprint, fingerprint)) {
        const image = await fs.readFile(frameFile);
        const { data } = await worker.recognize(image);
        recognized.push(data.text || '');
        previousFingerprint = fingerprint;
      }
      if ((index + 1) % 40 === 0 || index + 1 === frameFiles.length) {
        onProgress({
          video: path.basename(file),
          framesVisited: index + 1,
          framesTotal: frameFiles.length,
          uniqueFramesOcr: recognized.length,
        });
      }
    }
    return {
      text: recognized.join('\n'),
      framesScanned: frameFiles.length,
      uniqueFramesOcr: recognized.length,
      sampledAtOneSecondOrBetter: true,
    };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

process.on('message', async ({ proofFiles }) => {
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
    const scans = [];
    for (let index = 0; index < proofFiles.length; index += 1) {
      scans.push(await scanVideo(proofFiles[index], worker, (progress) => {
        process.send?.({ type: 'progress', videoIndex: index + 1, videoCount: proofFiles.length, ...progress });
      }));
    }
    process.send?.({ type: 'result', scans });
  } catch (error) {
    process.send?.({ type: 'error', error: error?.message || 'Pengecekan OCR gagal' });
  } finally {
    await worker?.terminate().catch(() => {});
    process.disconnect?.();
  }
});
