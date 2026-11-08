import { Injectable } from '@nestjs/common';
import { JobHandler } from './job-handler';

/**
 * The registered job kinds. Feature modules register their handlers in
 * `onModuleInit`, so the jobs module imports no feature module.
 */
@Injectable()
export class JobRegistry {
  private readonly handlers = new Map<string, JobHandler>();

  register(handler: JobHandler): void {
    if (this.handlers.has(handler.kind)) {
      throw new Error(`Job kind '${handler.kind}' is already registered`);
    }
    this.handlers.set(handler.kind, handler);
  }

  get(kind: string): JobHandler | undefined {
    return this.handlers.get(kind);
  }

  all(): JobHandler[] {
    return [...this.handlers.values()];
  }
}
