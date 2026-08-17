import { randomInt } from 'node:crypto';

const CHARACTERS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const ID_LENGTH = 10;

/**
 * A random resource filename that keeps the original extension —
 * e.g. `aB3xZ9kQ1p.png`. Uses a CSPRNG.
 */
export function generateRandomIdWithExtension(originalFilename: string): string {
  let id = '';
  for (let i = 0; i < ID_LENGTH; i++) {
    id += CHARACTERS[randomInt(CHARACTERS.length)];
  }
  const dot = originalFilename.lastIndexOf('.');
  const extension = dot >= 0 ? originalFilename.slice(dot + 1) : '';
  return extension ? `${id}.${extension}` : id;
}
