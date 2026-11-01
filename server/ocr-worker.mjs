import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
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

async function extractFrame(file, seconds) {
  const { stdout } = await execFileAsync(ffmpegPath, [
    '-hide_banner', '-loglevel', 'error', '-ss', seconds.toFixed(2), '-i', file,
    '-frames:v', '1', '-vf', 'scale=min(1440\\,iw):-2', '-q:v', '2', '-f', 'image2pipe', '-vcodec', 'mjpeg', 'pipe:1',
  ], { encoding: 'buffer', maxBuffer: MAX_FRAME_BYTES, timeout: 15_000 });
  return stdout;
}

async function scanVideo(file, maxFrames, worker) {
  const duration = await getDuration(file);
  if (!duration) throw new Error(`Durasi video tidak dapat dibaca: ${path.basename(file)}`);
  const frameCount = Math.max(1, Math.min(maxFrames, Math.ceil(duration / 3)));
  const scans = [];
  for (let index = 0; index < frameCount; index += 1) {
    // Spread samples across the full recording, avoiding the often-obscured first/last frame.
    const seconds = duration * (index + 1) / (frameCount + 1);
    const image = await extractFrame(file, seconds);
    if (!image?.length) continue;
    const { data } = await worker.recognize(image);
    scans.push(data.text || '');
  }
  return { text: scans.join('\n'), framesScanned: scans.length };
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
    const scans = [];
    for (const file of proofFiles) {
      scans.push(await scanVideo(file, maxFrames, worker));
    }
    process.send?.({ type: 'result', scans });
  } catch (error) {
    process.send?.({ type: 'error', error: error?.message || 'Pengecekan OCR gagal' });
  } finally {
    await worker?.terminate().catch(() => {});
    process.disconnect?.();
  }
});
