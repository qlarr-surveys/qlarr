import { Readable } from 'node:stream';
import { ZipFile } from 'yazl';
import { MaliciousArchiveException } from '../src/integrations/filesystem/filesystem.exceptions';
import { LocalFileHelper } from '../src/integrations/filesystem/local-file-helper';

/**
 * Zip-bomb defense for survey import. `extractImportZip` decompresses an uploaded
 * ZIP into heap; the multipart layer only caps the *compressed* size (100MB), so
 * a small archive can still inflate to gigabytes. `readZipEntries` bounds the
 * entry count, the per-entry uncompressed size, and the total across the archive.
 *
 * Decompression touches none of the S3/tenant/config collaborators, so we drive
 * the real helper directly with archives built by yazl — the genuine
 * yazl→yauzl round trip, no mocks of the code under test. These archives are
 * tiny compressed (all zeros) yet huge uncompressed: exactly the bomb the
 * compressed-only cap misses.
 */
const MB = 1024 * 1024;
const MAX_ENTRY_UNCOMPRESSED = 100 * MB;
const MAX_TOTAL_UNCOMPRESSED = 500 * MB;
const MAX_ZIP_ENTRIES = 500;

/** Build a ZIP buffer from in-memory entries (reuses buffers, so highly
 * compressible zero payloads stay cheap to construct). */
function buildZip(files: Array<{ name: string; body: Buffer }>): Promise<Buffer> {
  const zip = new ZipFile();
  for (const f of files) {
    // A trailing '/' means a directory entry (yazl rejects it via addBuffer).
    if (f.name.endsWith('/')) zip.addEmptyDirectory(f.name);
    else zip.addBuffer(f.body, f.name);
  }
  zip.end();
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    (zip.outputStream as Readable)
      .on('data', (c: Buffer) => chunks.push(c))
      .on('end', () => resolve(Buffer.concat(chunks)))
      .on('error', reject);
  });
}

describe('Survey import — zip-bomb / unbounded-decompression guard', () => {
  // extractImportZip uses none of the constructor deps.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // extractImportZip uses neither the storage root nor the optimizer.
  const helper = new LocalFileHelper(
    { getOrThrow: () => ({ rootFolder: '/tmp' }) } as any,
    null as any,
  );

  const expectRejected = async (zip: Buffer, reasonMatch: RegExp) => {
    let thrown: unknown;
    try {
      await helper.extractImportZip(zip);
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(MaliciousArchiveException);
    const ex = thrown as MaliciousArchiveException;
    expect(ex.getStatus()).toBe(413); // PAYLOAD_TOO_LARGE
    expect((ex.getResponse() as { message: string }).message).toMatch(reasonMatch);
  };

  it('extracts a normal survey archive (guard does not break legitimate imports)', async () => {
    const zip = await buildZip([
      { name: 'survey.json', body: Buffer.from('{"survey":{}}') },
      { name: 'design.json', body: Buffer.from('{}') },
      { name: 'resources/logo.png', body: Buffer.from('pixels') },
      { name: 'resources/', body: Buffer.alloc(0) }, // directory entry — skipped
    ]);

    const result = await helper.extractImportZip(zip);

    expect(result.surveyJson).toBe('{"survey":{}}');
    expect(result.designFile?.toString()).toBe('{}');
    expect(result.resources).toEqual([{ name: 'logo.png', body: Buffer.from('pixels') }]);
  });

  it('rejects a single entry whose uncompressed size exceeds the per-file cap', async () => {
    // ~100MB of zeros → a few KB compressed, but declared 100MB+1 uncompressed.
    const bomb = await buildZip([
      { name: 'resources/bomb.bin', body: Buffer.alloc(MAX_ENTRY_UNCOMPRESSED + 1) },
    ]);
    // The compressed archive sails past the 100MB multipart cap...
    expect(bomb.length).toBeLessThan(MAX_ENTRY_UNCOMPRESSED);
    // ...but the uncompressed guard stops it.
    await expectRejected(bomb, /per-file size limit/);
  });

  it('rejects when the total uncompressed size crosses the archive budget', async () => {
    // Six 90MB entries: each is under the per-file cap, so the declared-size
    // early-out never fires — the running total is enforced against the *actual*
    // decompressed bytes while streaming (the 6th entry trips it).
    const chunk = Buffer.alloc(90 * MB);
    const entries = Array.from({ length: 6 }, (_, i) => ({
      name: `resources/part-${i}.bin`,
      body: chunk, // reused reference; keeps construction cheap
    }));
    const bomb = await buildZip(entries);
    expect(90 * MB * 6).toBeGreaterThan(MAX_TOTAL_UNCOMPRESSED);

    await expectRejected(bomb, /decompresses beyond the allowed size/);
  });

  it('rejects an archive with too many entries', async () => {
    const entries = Array.from({ length: MAX_ZIP_ENTRIES + 1 }, (_, i) => ({
      name: `resources/f-${i}.txt`,
      body: Buffer.from('x'),
    }));
    const bomb = await buildZip(entries);

    await expectRejected(bomb, /too many entries/);
  });
});
