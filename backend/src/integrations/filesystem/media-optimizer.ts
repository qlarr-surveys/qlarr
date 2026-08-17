import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Injectable } from '@nestjs/common';
import ffmpegPath from 'ffmpeg-static';
import ffmpeg from 'fluent-ffmpeg';
import sharp from 'sharp';

const MAX_DIMENSION = 1920; // images: longest side
const JPEG_QUALITY = 80;
const VIDEO_MAX_W = 1920;
const VIDEO_MAX_H = 1080;

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

/**
 * Shrinks survey resource media before storage.
 * Images are resized/re-encoded with `sharp`; video is re-encoded to H.264/AAC
 * MP4 with `fluent-ffmpeg` (using the bundled `ffmpeg-static` binary, so no
 * system ffmpeg is required). Both kept — the video path is used in prod (§7).
 *
 * Unlike the storage backend this is NOT a swap seam: core and cloud optimize
 * media the same way, so it's a concrete collaborator of the file helper.
 */
@Injectable()
export class MediaOptimizer {
  isSupportedImage(contentType: string): boolean {
    switch (contentType.toLowerCase()) {
      case 'image/jpeg':
      case 'image/jpg':
      case 'image/png':
        return true;
      default:
        return false;
    }
  }

  isVideo(contentType: string | undefined): boolean {
    return contentType?.toLowerCase().startsWith('video/') === true;
  }

  /**
   * Resize (longest side ≤ 1920, aspect preserved, never upscale) and re-encode.
   * JPEG at quality 80, PNG otherwise.
   */
  async optimizeImage(input: Buffer, contentType: string): Promise<Buffer> {
    const ct = contentType.toLowerCase();
    const pipeline = sharp(input).resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    });
    if (ct === 'image/png') {
      return pipeline.png().toBuffer();
    }
    return pipeline.jpeg({ quality: JPEG_QUALITY }).toBuffer();
  }

  /**
   * Re-encode video to a web-friendly MP4 (H.264 crf 22 + faststart, AAC 128k),
   * scaled to fit 1920×1080 with even dimensions. Buffers through temp files
   * because ffmpeg needs real paths.
   */
  async optimizeVideo(input: Buffer, filename: string): Promise<Buffer> {
    const dir = await mkdtemp(join(tmpdir(), 'qlarr-media-'));
    const inPath = join(dir, `in-${randomUUID()}`);
    const outPath = join(dir, `out-${randomUUID()}.mp4`);
    try {
      await writeFile(inPath, input);
      await this.runFfmpeg(inPath, outPath);
      return await readFile(outPath);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  private runFfmpeg(inPath: string, outPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .audioBitrate('128k')
        .outputOptions([
          '-crf 22',
          '-preset medium',
          '-pix_fmt yuv420p',
          '-movflags +faststart',
          // Fit within 1920x1080, keep aspect ratio, force even dimensions.
          `-vf scale='min(${VIDEO_MAX_W},iw)':'min(${VIDEO_MAX_H},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2`,
          '-r 30',
        ])
        .format('mp4')
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .save(outPath);
    });
  }
}
