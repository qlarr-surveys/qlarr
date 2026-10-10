import { BadRequestException } from '@nestjs/common';

/**
 * The folder a survey file lives under, within a survey's storage prefix.
 * `path` is the exact segment used in the storage key, so it MUST keep these
 * values for existing files to resolve:
 *   - resources           → survey resources (images, etc.)
 *   - design              → the design JSON
 *   - responses/{id}      → files attached to one response
 */
export class SurveyFolder {
  private constructor(readonly path: string) {}

  static readonly Resources = new SurveyFolder('resources');
  static readonly Design = new SurveyFolder('design');
  static Responses(responseId: string): SurveyFolder {
    // A responseId must stay a single segment (see LocalFileHelper.filePath).
    if (/[/\\]/.test(responseId)) {
      throw new BadRequestException('Invalid file path');
    }
    return new SurveyFolder(`responses/${responseId}`);
  }

  /** True for a `responses/*` folder — the only one with per-response nesting. */
  get isResponses(): boolean {
    return this.path.startsWith('responses/');
  }

  get isResources(): boolean {
    return this.path === 'resources';
  }
}
