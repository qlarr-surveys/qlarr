import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import sharp from 'sharp';
import { MediaOptimizer } from '../src/integrations/filesystem/media-optimizer';

/**
 * Exercises the real image (sharp) and video (ffmpeg) optimization paths — the
 * bundled `ffmpeg-static` binary means no system ffmpeg is required.
 */
describe('MediaOptimizer', () => {
  const optimizer = new MediaOptimizer();

  const solid = (w: number, h: number) =>
    sharp({
      create: { width: w, height: h, channels: 4, background: { r: 200, g: 30, b: 30, alpha: 1 } },
    });

  it('classifies content types', () => {
    expect(optimizer.isSupportedImage('image/png')).toBe(true);
    expect(optimizer.isSupportedImage('image/jpeg')).toBe(true);
    expect(optimizer.isSupportedImage('image/gif')).toBe(false);
    expect(optimizer.isVideo('video/mp4')).toBe(true);
    expect(optimizer.isVideo('image/png')).toBe(false);
    expect(optimizer.isVideo(undefined)).toBe(false);
  });

  it('resizes an oversized PNG within 1920 and keeps PNG format', async () => {
    const input = await solid(4000, 3000).png().toBuffer();
    const out = await optimizer.optimizeImage(input, 'image/png');
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe('png');
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(1920);
    // 4000x3000 → longest side capped to 1920.
    expect(meta.width).toBe(1920);
    expect(meta.height).toBe(1440);
  });

  it('re-encodes an oversized JPEG within 1920 and keeps JPEG format', async () => {
    const input = await solid(3000, 1000).jpeg().toBuffer();
    const out = await optimizer.optimizeImage(input, 'image/jpeg');
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe('jpeg');
    expect(meta.width).toBe(1920);
  });

  it('does not upscale a small image', async () => {
    const input = await solid(200, 100).png().toBuffer();
    const out = await optimizer.optimizeImage(input, 'image/png');
    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(200);
    expect(meta.height).toBe(100);
  });

  it('re-encodes video to a valid MP4', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'qlarr-media-test-'));
    try {
      const inPath = join(dir, 'in.mp4');
      // Generate a 1s test clip with the bundled ffmpeg.
      execFileSync(ffmpegPath as string, [
        '-y',
        '-f',
        'lavfi',
        '-i',
        'testsrc=duration=1:size=640x480:rate=10',
        '-pix_fmt',
        'yuv420p',
        inPath,
      ]);
      const out = await optimizer.optimizeVideo(readFileSync(inPath), 'clip.mp4');
      expect(out.length).toBeGreaterThan(0);
      // MP4 files carry an 'ftyp' box near the start.
      expect(out.subarray(4, 8).toString('ascii')).toBe('ftyp');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);
});
