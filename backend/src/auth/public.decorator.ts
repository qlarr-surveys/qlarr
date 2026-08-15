import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Opt an endpoint out of the global JwtAuthGuard (public survey/run/auth routes). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
