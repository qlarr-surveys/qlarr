import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Rate-limits by *who* the request is about, not by client IP — the app sits
 * behind a load balancer with no `trust proxy`, so every caller would otherwise
 * share the proxy's IP and throttle globally. Keying on the identity also caps
 * guesses against a specific account/PIN regardless of how many IPs an attacker
 * rotates through.
 *
 * Priority: the login/forgot email (public routes) → the authenticated user id
 * (the email-change PIN route) → the raw IP as a last resort. Applied only to
 * the sensitive auth routes via `@UseGuards`, never globally, so respondent
 * survey traffic is untouched.
 */
@Injectable()
export class IdentityThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const email = req.body?.email;
    if (typeof email === 'string' && email.trim()) {
      return `email:${email.trim().toLowerCase()}`;
    }
    const userId = req.user?.userId;
    if (userId) {
      return `user:${userId}`;
    }
    return `ip:${req.ip}`;
  }
}
