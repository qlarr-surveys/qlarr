import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import { LocalFileHelper } from '../src/integrations/filesystem/local-file-helper';
import { MediaOptimizer } from '../src/integrations/filesystem/media-optimizer';
import { SurveyFolder } from '../src/integrations/filesystem/survey-folder';

/**
 * Resource videos are stored as uploaded right away and re-encoded in the
 * background (an inline re-encode left large uploads hanging for minutes).
 * Drives the real helper + bundled ffmpeg against a temp storage root.
 */
describe('Resource video background optimization', () => {
  const SURVEY = '10000000-0000-0000-0000-000000000001';
  let root: string;
  let helper: LocalFileHelper;
  let clip: Buffer;

  beforeAll(() => {
    const dir = mkdtempSync(join(tmpdir(), 'qlarr-clip-'));
    try {
      // A 1s MPEG-4 Part 2 clip in an AVI container — clearly not the
      // H.264 MP4 the optimizer produces.
      const inPath = join(dir, 'in.avi');
      execFileSync(ffmpegPath as string, [
        '-y',
        '-f',
        'lavfi',
        '-i',
        'testsrc=duration=1:size=320x240:rate=10',
        '-c:v',
        'mpeg4',
        inPath,
      ]);
      clip = readFileSync(inPath);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  beforeEach(async () => {
    root = mkdtempSync(join(tmpdir(), 'qlarr-storage-'));
    helper = new LocalFileHelper(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { getOrThrow: () => ({ rootFolder: root }) } as any,
      new MediaOptimizer(),
    );
    await helper.onModuleInit();
  });

  afterEach(async () => {
    await helper.whenVideoOptimizationsSettled();
    rmSync(root, { recursive: true, force: true });
  });

  const stored = (name: string) => join(root, SURVEY, 'resources', name);

  /** Download headers only — the lazily-opened body stream is discarded. */
  const headers = async (name: string) => {
    const dl = await helper.download(SURVEY, SurveyFolder.Resources, name);
    dl.body.on('error', () => {}).destroy();
    return dl;
  };

  it('stores the original immediately, then swaps in an MP4', async () => {
    await helper.upload(SURVEY, SurveyFolder.Resources, clip, 'video/x-msvideo', 'v.avi');
    expect(readFileSync(stored('v.avi')).equals(clip)).toBe(true);

    await helper.whenVideoOptimizationsSettled();

    const out = readFileSync(stored('v.avi'));
    expect(out.subarray(4, 8).toString('ascii')).toBe('ftyp');
    const dl = await headers('v.avi');
    expect(dl.contentType).toBe('video/mp4');
    expect(dl.contentLength).toBe(out.length);
    // No scratch file shows up as a resource.
    const names = (await helper.listSurveyResources(SURVEY)).map((f) => f.name);
    expect(names).toEqual(['v.avi']);
  }, 60_000);

  it('does not resurrect a video deleted while it was being optimized', async () => {
    await helper.upload(SURVEY, SurveyFolder.Resources, clip, 'video/x-msvideo', 'gone.avi');
    await helper.delete(SURVEY, SurveyFolder.Resources, 'gone.avi');

    await helper.whenVideoOptimizationsSettled();

    expect(existsSync(stored('gone.avi'))).toBe(false);
    expect(existsSync(`${stored('gone.avi')}.metadata`)).toBe(false);
  }, 60_000);

  it('keeps the original when ffmpeg cannot decode it', async () => {
    const junk = Buffer.from('definitely not a video');
    await helper.upload(SURVEY, SurveyFolder.Resources, junk, 'video/mp4', 'bad.mp4');

    await helper.whenVideoOptimizationsSettled();

    expect(readFileSync(stored('bad.mp4')).equals(junk)).toBe(true);
    const dl = await headers('bad.mp4');
    expect(dl.contentType).toBe('video/mp4');
  }, 60_000);
});
