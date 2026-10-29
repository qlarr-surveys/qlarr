# Refresh Token Rotation and Table Cleanup

## Problem

1. **No rotation.** `AccessService.refresh` reuses the same refresh token for its whole 30-day life. If someone steals it, they can use it for up to 30 days and nothing notices.
2. **`refresh_tokens` grows forever.** Every login inserts a row. Rows are only deleted on logout or a password/email change. Expired rows are never deleted.

## Scope

In:
- Rotate the refresh token on every refresh.
- A short grace window so tabs refreshing at the same moment don't log the user out.
- Session lifetime: a 90-day idle timeout and a 1-year hard cap.
- Delete expired and idle rows.

Out:
- httpOnly cookies. Tokens stay in the JS-readable `user` cookie.
- Shorter access tokens, token hashing, reset-token changes.
- Backward compatibility. Existing refresh rows are wiped, and every user logs in once.

## Session lifetime

| Limit | Value | Enforced by |
|---|---|---|
| Idle timeout | 90 days since the last refresh | Server (`last_used_at`) and browser (cookie expiry) |
| Hard cap | 1 year since login | Server (`expiration`) |

Anyone who opens the app within 90 days stays logged in, because each refresh restarts the 90 days on both the server and the cookie. Everyone logs in again at least once a year.

The server enforces the idle timeout itself, not just the cookie. A token copied out of the cookie therefore stops working after 90 days of non-use, instead of working until the 1-year cap.

## Design

### Schema

Add two columns to `refresh_tokens`, in a new migration that also empties the table:

| Column | Type | Meaning |
|---|---|---|
| `previous_id` | `uuid`, nullable | The token this row had before the last rotation |
| `last_used_at` | `timestamp`, not null | Set when the row is created and on every rotation (UTC wall clock) |

`expiration` stays, but it's now set to login + 1 year.

There is still one row per session. A rotation updates the row in place instead of inserting one, so rotation never grows the table.

### Config

- `JWT_REFRESH_EXPIRATION_MS`: the default changes from 30 days to 1 year (the hard cap).
- `JWT_REFRESH_IDLE_MS` (new): default 90 days (the idle timeout).

### Refresh flow

The request stays the same: `{ accessToken, refreshToken }`. The access token's signature is checked and its expiry ignored, as today.

A row is **live** when `expiration > now` and `last_used_at > now − 90d`.

1. **The token matches a row's `id` (current token).**
   - Check that the row is live and belongs to the access token's user.
   - Generate a new UUID and update the row: `id` = new, `previous_id` = old, `last_used_at` = now.
   - Return a new access token plus the new refresh token.
   - `expiration` doesn't change.
2. **The token matches a row's `previous_id`, and `last_used_at` was less than 30s ago.**
   - This is the race case: two tabs refreshed at once with the same token from the shared cookie.
   - Return a new access token and **no refresh token**. Don't rotate again, and don't touch `last_used_at`.
   - Returning a refresh token here would be unsafe: a late grace response could arrive after another tab rotated again, and write the older token back over the newer one.
   - The frontend keeps the refresh token already in the cookie when a response has none.
   - A refresh response lost on the network is not covered: the client keeps the old token and is logged out at its next refresh. The frontend already logs out when a refresh request fails, so this changes nothing in practice.
3. **The token matches a row's `previous_id`, and the grace window has passed.**
   - Treat this as reuse of a stolen token. Delete the row, which ends that session, and return 401.
4. **The token matches nothing, or the row isn't live.** Return 401.

### Table cleanup

- On every login and every refresh, delete that user's rows that aren't live (`user_id = :id AND (expiration < now OR last_used_at < now − 90d)`). It's cheap and needs no scheduler. It also avoids a cron job that would have to loop over tenant schemas.
- When a user is deleted (`UsersService.delete`), delete their rows.

Result: live rows are capped at one per session used within the last 90 days. Dead rows linger only for users who never log in again, and only until their next login.

## Frontend

- **Cookie expiry:** `CookiesService` already sets 90 days, and `setSession` rewrites the cookie on every login and refresh. The browser side of the idle timeout therefore needs no change; just make sure the value stays at 90 days.
- **`authenticatedApi.js`:** allow only one refresh at a time per tab. Today, several requests that fail with 401 together each fire their own refresh. After this change they wait for a single shared refresh promise and then retry.
- **`authenticatedApi.js`:** when a refresh response has no `refreshToken` (a grace response), keep the one currently in the cookie.

## Files touched

- `backend/src/database/migrations/3-RefreshRotation.ts` (new) and `migrations/index.ts`
- `backend/src/modules/users/refresh-token.entity.ts`: the two new columns
- `backend/src/modules/users/refresh-token.repository.ts`: find by previous id, rotate, delete dead rows by user
- `backend/src/modules/users/access.service.ts`: refresh flow above, cleanup on login
- `backend/src/auth/login-issuer.ts`: set `last_used_at` on insert; remove the "reuse existing refresh id" path
- `backend/src/auth/token.service.ts`: the 1-year expiry
- `backend/src/config/jwt.config.ts` and `backend/src/config/env.validation.ts`: the new idle setting and the new default
- `backend/src/modules/users/users.service.ts`: delete rows on user delete
- `frontend/src/services/authenticatedApi.js`: single-flight refresh
- Tests: `backend/test/access.int-spec.ts` (rotation, grace, reuse, idle timeout, cleanup)

## Decisions

1. **Reuse after the grace window:** the session row is deleted, so both the old and the current refresh token stop working. Access tokens already issued from it keep working until they expire (up to 1 hour). The user's other sessions are untouched.
2. **Grace window length:** 30s.
3. **Grace response:** an access token only, no refresh token.
4. **Cleanup reach:** per-user, on every login and refresh. No global sweep.
5. **Sessions per user:** no cap.
6. **Logout:** unchanged, still ends all of the user's sessions.
7. **User deletion:** deletes the user's session rows.

## Known limit

Only the most recent old token is remembered (`previous_id`). A token two or more rotations old gets a 401 without deleting the session.
