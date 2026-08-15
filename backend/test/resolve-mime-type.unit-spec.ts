import { resolveMimeType } from '../src/modules/responses/response-ops.service';

describe('resolveMimeType', () => {
  it('probes the filename when the content type is absent', () => {
    expect(resolveMimeType({ originalname: 'interview.mp4' })).toBe('video/mp4');
  });

  it('probes the filename when the content type is generic octet-stream', () => {
    // Multer defaults a headerless file part to octet-stream — the Android
    // offline case. It must still resolve to video/mp4 (→ 30MB limit).
    expect(
      resolveMimeType({
        originalname: 'interview.mp4',
        mimetype: 'application/octet-stream',
      }),
    ).toBe('video/mp4');
  });

  it('trusts a meaningful client content type without probing', () => {
    expect(
      resolveMimeType({ originalname: 'photo.png', mimetype: 'image/png' }),
    ).toBe('image/png');
    // Even when it disagrees with the extension.
    expect(
      resolveMimeType({ originalname: 'photo.png', mimetype: 'image/jpeg' }),
    ).toBe('image/jpeg');
  });

  it('falls back to octet-stream when nothing resolves', () => {
    expect(
      resolveMimeType({
        originalname: 'recording',
        mimetype: 'application/octet-stream',
      }),
    ).toBe('application/octet-stream');
    expect(resolveMimeType({ originalname: 'recording' })).toBe(
      'application/octet-stream',
    );
  });
});
