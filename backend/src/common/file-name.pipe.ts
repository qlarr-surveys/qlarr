import { Injectable, PipeTransform } from '@nestjs/common';
import { assertSafePathSegment } from '../integrations/filesystem/path-segment';

/**
 * `@Param('fileName', FileNamePipe)` — rejects a route param that is not a
 * plain basename with a 400 `InvalidFilePathException` before it reaches
 * storage. Express URL-decodes params, so an encoded `..%2F..%2Fother%2Fdesign`
 * arrives as a real traversal. This is the edge half of the guard; the storage
 * helper repeats the same check for names that come from data, not the URL.
 */
@Injectable()
export class FileNamePipe implements PipeTransform<string, string> {
  transform(value: string): string {
    assertSafePathSegment(value);
    return value;
  }
}
