import { registerAs } from '@nestjs/config';

export interface StorageConfig {
  /**
   * Root directory for survey files on local disk. Files are stored under
   * `{rootFolder}/{surveyId}/{folder}/{filename}` (matches the Kotlin OSS
   * FileSystemHelper layout, so an existing data directory is reused as-is).
   */
  rootFolder: string;
}

export default registerAs(
  'storage',
  (): StorageConfig => ({
    rootFolder: process.env.FILE_SYSTEM_ROOT_FOLDER || 'local-data',
  }),
);
