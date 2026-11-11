import { com } from '@qlarr/survey-engine';
import { withSandbox } from '../src/engine/script-sandbox';

const engineScript = com.qlarr.surveyengine.scriptengine.getEngineScript();

/** Run `text` as one active instruction and return what it evaluated to. */
async function evaluate(text: string, returnType = 'any'): Promise<unknown> {
  const script = JSON.stringify({
    values: {},
    sequence: [
      {
        componentCode: 'Q1',
        instruction: { code: 'probe', text, returnType, isActive: true },
      },
    ],
    formatInstructions: [],
    codes: ['Q1'],
  });
  return JSON.parse(
    await withSandbox(engineScript, (run) => run('navigate', script)),
  ).Q1.probe;
}

describe('withSandbox', () => {
  it('evaluates author expressions', async () => {
    await expect(evaluate('1 + 1')).resolves.toBe(2);
  });

  it('exposes no host globals', async () => {
    for (const name of ['process', 'require', 'fetch', 'globalThis.process']) {
      await expect(evaluate(`typeof ${name}`)).resolves.toBe('undefined');
    }
  });

  it('keeps host globals out of reach through the Function constructor', async () => {
    await expect(
      evaluate('[].constructor.constructor("return typeof process")()'),
    ).resolves.toBe('undefined');
  });

  it('contains unbounded recursion inside the guest', async () => {
    await expect(evaluate('(function f() { return f(); })()', 'int')).resolves.toBe(0);
  });

  it('contains a heap bomb inside the guest', async () => {
    await expect(
      evaluate(
        '(function () { var a = []; for (;;) a.push(new Array(1e6).fill(1)); })()',
        'int',
      ),
    ).resolves.toBe(0);
  });

  it('leaves nothing behind between sandboxes', async () => {
    await evaluate('(leaked = 1)');
    await expect(evaluate('typeof leaked')).resolves.toBe('undefined');
  });
});
