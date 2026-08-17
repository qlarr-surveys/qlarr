import { Module } from '@nestjs/common';
import { FILE_HELPER } from './file-helper';
import { LocalFileHelper } from './local-file-helper';
import { MediaOptimizer } from './media-optimizer';

/**
 * Wires the storage layer. `FILE_HELPER` is the public token every service
 * depends on; the open-source core binds it to the local-disk `LocalFileHelper`.
 * Downstream builds swap this one provider for a different implementation (e.g.
 * S3) — no consumer changes.
 */
@Module({
  providers: [
    MediaOptimizer,
    { provide: FILE_HELPER, useClass: LocalFileHelper },
  ],
  exports: [FILE_HELPER],
})
export class FilesystemModule {}
