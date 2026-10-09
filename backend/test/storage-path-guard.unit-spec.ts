import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileNamePipe } from '../src/common/file-name.pipe';
import { InvalidFilePathException } from '../src/integrations/filesystem/filesystem.exceptions';
import { LocalFileHelper } from '../src/integrations/filesystem/local-file-helper';
import { isSafePathSegment } from '../src/integrations/filesystem/path-segment';
import { SurveyFolder } from '../src/integrations/filesystem/survey-folder';

/**
 * The storage path guard. Express URL-decodes route params, so an encoded
 * `..%2F..%2Fother%2Fdesign%2F1` reaches the storage helper as a real `../`.
 * LocalFileHelper must keep every file inside its own `{surveyId}/{folder}/`
 * directory — not merely under the storage root, which every survey shares.
 */
describe('isSafePathSegment', () => {
  it.each([
    'myfile.jpg',
    '20000000-0000-0000-0000-000000000001',
    '1',
    'aB3xZ9kQ1p.png',
    'file..name.png',
    '...',
    'with space.pdf',
  ])('accepts the plain name %p', (name) => {
    expect(isSafePathSegment(name)).toBe(true);
  });

  it.each([
    '',
    '.',
    '..',
    '../x',
    'a/b',
    '/etc/passwd',
    '..\\..\\x',
    'a\\b',
    'a\0b',
  ])('rejects %p', (name) => {
    expect(isSafePathSegment(name)).toBe(false);
  });

  it('rejects a non-string', () => {
    expect(isSafePathSegment(undefined)).toBe(false);
    expect(isSafePathSegment(null)).toBe(false);
    expect(isSafePathSegment(1)).toBe(false);
  });
});

describe('FileNamePipe', () => {
  const pipe = new FileNamePipe();

  it('passes a plain basename through unchanged', () => {
    expect(pipe.transform('myfile.jpg')).toBe('myfile.jpg');
  });

  it('rejects a decoded traversal with InvalidFilePathException', () => {
    expect(() => pipe.transform('../../../other/design/1')).toThrow(
      InvalidFilePathException,
    );
    expect(() => pipe.transform('..')).toThrow(InvalidFilePathException);
  });

  it('renders InvalidFilePathException as a 400 { message, error } body', () => {
    const err = new InvalidFilePathException();
    expect(err.getStatus()).toBe(400);
    expect(err.getResponse()).toEqual({
      message: 'Invalid file path',
      error: 'InvalidFilePathException',
    });
  });
});

describe('LocalFileHelper path guard', () => {
  const SURVEY = '10000000-0000-0000-0000-000000000001';
  const OTHER = '10000000-0000-0000-0000-000000000002';
  const RESPONSE = '20000000-0000-0000-0000-000000000001';
  const SECRET = 'OTHER-SURVEY-DESIGN';

  let root: string;
  let helper: LocalFileHelper;
  let victim: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'qlarr-path-guard-'));
    // Resources are never images/videos here, so the optimizer is never used.
    const media = { isSupportedImage: () => false, isVideo: () => false };
    helper = new LocalFileHelper(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { getOrThrow: () => ({ rootFolder: root }) } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      media as any,
    );
    // Another survey's design file — the target of every traversal below.
    mkdirSync(join(root, OTHER, 'design'), { recursive: true });
    victim = join(root, OTHER, 'design', '1');
    writeFileSync(victim, SECRET);
  });

  afterEach(() => rmSync(root, { recursive: true, force: true }));

  const body = Buffer.from('ATTACKER');
  const responses = SurveyFolder.Responses(RESPONSE);

  it('round-trips a legit response file under responses/{id}/', async () => {
    await helper.upload(SURVEY, responses, body, 'image/jpeg', 'myfile.jpg');
    expect(readFileSync(join(root, SURVEY, 'responses', RESPONSE, 'myfile.jpg'))).toEqual(body);
    expect(await helper.doesFileExist(SURVEY, responses, 'myfile.jpg')).toBe(true);
    expect(await helper.doesFileExist(SURVEY, responses, 'absent.jpg')).toBe(false);
    const dl = await helper.download(SURVEY, responses, 'myfile.jpg');
    expect(dl.contentType).toBe('image/jpeg');
    const chunks: Buffer[] = [];
    for await (const chunk of dl.body) chunks.push(Buffer.from(chunk));
    expect(Buffer.concat(chunks)).toEqual(body);
  });

  describe('write', () => {
    it('rejects a traversal in the filename and leaves the other survey untouched', async () => {
      await expect(
        helper.upload(SURVEY, responses, body, 'image/jpeg', `../../../${OTHER}/design/1`),
      ).rejects.toBeInstanceOf(InvalidFilePathException);
      expect(readFileSync(victim, 'utf-8')).toBe(SECRET);
    });

    it('rejects a traversal in the responseId and leaves the other survey untouched', async () => {
      await expect(
        helper.upload(
          SURVEY,
          SurveyFolder.Responses(`../../${OTHER}/design`),
          body,
          'image/jpeg',
          '1',
        ),
      ).rejects.toBeInstanceOf(InvalidFilePathException);
      // `..` alone as the responseId would collapse responses/.. → the survey dir.
      await expect(
        helper.upload(SURVEY, SurveyFolder.Responses('..'), body, 'image/jpeg', 'x'),
      ).rejects.toBeInstanceOf(InvalidFilePathException);
      expect(readFileSync(victim, 'utf-8')).toBe(SECRET);
      expect(existsSync(join(root, SURVEY, 'x'))).toBe(false);
    });

    it('rejects a traversal in the surveyId', async () => {
      await expect(
        helper.uploadText(`../${OTHER}`, SurveyFolder.Design, 'x', '1'),
      ).rejects.toBeInstanceOf(InvalidFilePathException);
      await expect(
        helper.uploadText(`${SURVEY}/../${OTHER}`, SurveyFolder.Design, 'x', '1'),
      ).rejects.toBeInstanceOf(InvalidFilePathException);
      expect(readFileSync(victim, 'utf-8')).toBe(SECRET);
    });

    it('rejects a cross-folder write within the same survey (resources → design)', async () => {
      mkdirSync(join(root, SURVEY, 'design'), { recursive: true });
      writeFileSync(join(root, SURVEY, 'design', '1'), 'OWN-DESIGN');
      await expect(
        helper.upload(SURVEY, SurveyFolder.Resources, body, 'text/plain', '../design/1'),
      ).rejects.toBeInstanceOf(InvalidFilePathException);
      expect(readFileSync(join(root, SURVEY, 'design', '1'), 'utf-8')).toBe('OWN-DESIGN');
    });

    it('rejects a backslash or NUL in the filename', async () => {
      await expect(
        helper.upload(SURVEY, responses, body, 'image/jpeg', '..\\..\\x'),
      ).rejects.toBeInstanceOf(InvalidFilePathException);
      await expect(
        helper.upload(SURVEY, responses, body, 'image/jpeg', 'a\0b'),
      ).rejects.toBeInstanceOf(InvalidFilePathException);
    });

    it('rejects deleting across surveys', async () => {
      await expect(
        helper.delete(SURVEY, SurveyFolder.Resources, `../../${OTHER}/design/1`),
      ).rejects.toBeInstanceOf(InvalidFilePathException);
      expect(existsSync(victim)).toBe(true);
    });

    it('refuses a recursive survey delete for an empty or traversing id', async () => {
      for (const id of ['', '.', '..', `x/../${OTHER}`]) {
        await expect(helper.deleteSurveyFiles(id)).rejects.toBeInstanceOf(
          InvalidFilePathException,
        );
      }
      expect(existsSync(victim)).toBe(true);
    });
  });

  describe('read', () => {
    it('rejects a traversal in the filename instead of reading the other survey', async () => {
      await expect(
        helper.download(SURVEY, responses, `../../../${OTHER}/design/1`),
      ).rejects.toBeInstanceOf(InvalidFilePathException);
      await expect(
        helper.getText(SURVEY, SurveyFolder.Resources, `../../${OTHER}/design/1`),
      ).rejects.toBeInstanceOf(InvalidFilePathException);
    });

    it('rejects a traversal in the responseId', async () => {
      await expect(
        helper.download(SURVEY, SurveyFolder.Responses(`../../${OTHER}/design`), '1'),
      ).rejects.toBeInstanceOf(InvalidFilePathException);
    });

    it('reports an unsafe existence probe as invalid, not as "absent"', async () => {
      await expect(
        helper.doesFileExist(SURVEY, responses, `../../../${OTHER}/design/1`),
      ).rejects.toBeInstanceOf(InvalidFilePathException);
    });

    it('rejects listing another folder through the responseId', async () => {
      await expect(
        helper.responseFiles(SURVEY, `../../${OTHER}/design`),
      ).rejects.toBeInstanceOf(InvalidFilePathException);
    });
  });
});
