import { nowUtcString } from '../src/common/datetime';
import { NavigationService } from '../src/modules/run/navigation.service';
import {
  JumpNotAllowedException,
  PreviousNotAllowedException,
  ResumeNotAllowedException,
} from '../src/modules/run/run.exceptions';

/**
 * Regression guard for BUGS_FOUND #45: the allowJump / allowPrevious checks
 * compare the uppercased wire direction ('JUMP' / 'PREV') against the engine's
 * serial constants. They previously compared against 'Jump' / 'Previous' and
 * could never fire, silently voiding a survey's navigation constraints.
 *
 * `preview: true` short-circuits the active/resume checks, so navigate() reaches
 * the direction guards before any engine or repository call — the responses/
 * engine deps are never touched on these paths.
 */
describe('navigation direction guards (allowJump / allowPrevious)', () => {
  const completedCount = jest.fn();
  const svc = new NavigationService(
    { completedCount } as any,
    {} as any,
  );

  const navigate = (navData: Record<string, unknown>, name: string) =>
    svc.navigate({
      surveyId: 's',
      response: null,
      processedSurvey: {
        survey: { navigationData: navData, startDate: null, status: 'ACTIVE' },
        version: { valid: true },
        output: {},
      },
      navigationDirection: { name, navigationIndex: {} },
      values: {},
      preview: true,
      surveyMode: 'ONLINE',
    } as any);

  beforeEach(() => jest.clearAllMocks());

  it('rejects JUMP when allowJump is false', async () => {
    await expect(
      navigate({ allowJump: false, allowPrevious: true }, 'JUMP'),
    ).rejects.toBeInstanceOf(JumpNotAllowedException);
    expect(completedCount).not.toHaveBeenCalled();
  });

  it('rejects PREV when allowPrevious is false', async () => {
    await expect(
      navigate({ allowJump: true, allowPrevious: false }, 'PREV'),
    ).rejects.toBeInstanceOf(PreviousNotAllowedException);
    expect(completedCount).not.toHaveBeenCalled();
  });

  it('lets an allowed direction past the guards', async () => {
    // Prove the guard doesn't over-fire: with the flags on, navigate() gets past
    // the direction checks and reaches the first repository call.
    completedCount.mockRejectedValue(new Error('reached-completedCount'));
    await expect(
      navigate({ allowJump: true, allowPrevious: true }, 'JUMP'),
    ).rejects.toThrow('reached-completedCount');
    expect(completedCount).toHaveBeenCalled();
  });
});

/**
 * The resume-expiry guard: when `allowIncomplete` is false, a response may only
 * be resumed within `resumeExpiryMillis` of when THAT response started. This
 * fixes the inherited legacy bug where the check used `survey.startDate − now`
 * (inverted sign + wrong field), which made it dead code — see the DIVERGENCE
 * note on `timeSinceStartMillis`.
 *
 * Run with `preview: false` so the branch is reached. The survey is ACTIVE with
 * an open window, the version is valid, and NEXT is always allowed, so the only
 * guard in play is resume-expiry. `completedCount` (the first repository call,
 * just past the guard block) is stubbed to reject with a sentinel — reaching it
 * proves the guard did NOT throw.
 */
describe('navigation resume-expiry guard (allowIncomplete / resumeExpiryMillis)', () => {
  const REACHED = 'reached-completedCount';
  const completedCount = jest.fn();
  const svc = new NavigationService({ completedCount } as any, {} as any);

  const navigate = (
    navData: Record<string, unknown>,
    response: { startDate: string } | null,
  ) =>
    svc.navigate({
      surveyId: 's',
      response,
      processedSurvey: {
        survey: {
          navigationData: { allowJump: true, allowPrevious: true, ...navData },
          startDate: null,
          endDate: null,
          status: 'ACTIVE',
        },
        version: { valid: true },
        output: {},
      },
      navigationDirection: { name: 'NEXT', navigationIndex: {} },
      values: {},
      preview: false,
      surveyMode: 'ONLINE',
    } as any);

  beforeEach(() => {
    jest.clearAllMocks();
    completedCount.mockRejectedValue(new Error(REACHED));
  });

  it('rejects resuming a response older than resumeExpiryMillis', async () => {
    await expect(
      navigate(
        { allowIncomplete: false, resumeExpiryMillis: 1000 },
        { startDate: '2000-01-01 00:00:00' }, // started ages ago
      ),
    ).rejects.toBeInstanceOf(ResumeNotAllowedException);
    expect(completedCount).not.toHaveBeenCalled();
  });

  it('allows resuming a response within resumeExpiryMillis', async () => {
    await expect(
      navigate(
        { allowIncomplete: false, resumeExpiryMillis: 3_600_000 },
        { startDate: nowUtcString() }, // just started
      ),
    ).rejects.toThrow(REACHED);
    expect(completedCount).toHaveBeenCalled();
  });

  it('does not fire on a fresh start (no response)', async () => {
    // `start()` passes response: null — nothing to resume, so 0 elapsed → allowed.
    await expect(
      navigate({ allowIncomplete: false, resumeExpiryMillis: 1000 }, null),
    ).rejects.toThrow(REACHED);
    expect(completedCount).toHaveBeenCalled();
  });

  it('does not fire when allowIncomplete is true, even for a stale response', async () => {
    await expect(
      navigate(
        { allowIncomplete: true, resumeExpiryMillis: 1000 },
        { startDate: '2000-01-01 00:00:00' },
      ),
    ).rejects.toThrow(REACHED);
    expect(completedCount).toHaveBeenCalled();
  });
});
