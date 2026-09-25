// Runs the designer's real Redux slice (frontend/src/state/design/designState.js)
// through frontend-src/loader.mjs. Jest can't load it (no module hooks in its
// VM), so this is a node:test against the compiled backend:
// `npm run build && npm run test:slice`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyDesignActions } from '../dist/modules/design/design-slice.js';
import { EngineService } from '../dist/engine/engine.service.js';

const engine = new EngineService();

async function newDesign() {
  const output = await engine.validate(engine.newSurvey('Feedback'));
  return {
    designerInput: engine.toDesignerInput(output),
    versionDto: { surveyId: 'survey-1', version: 1, subVersion: 1, valid: true, published: false },
  };
}

const firstGroup = (design) => design.designerInput.state.Survey.children[0].code;

const writeTexts = (design, changes) =>
  applyDesignActions(design, ({ changeContent }) => changes.map((change) => changeContent(change)));

test('writes a text the way the designer does', async () => {
  const design = await newDesign();
  const code = firstGroup(design);
  const value = '<p>مرحبا {{Q1.value}}</p><img data-resource-name="logo.png">';

  const diff = await writeTexts(design, [{ code, lang: 'ar', key: 'label', value }]);

  assert.deepEqual(Object.keys(diff), [code]);
  assert.equal(diff[code].content.ar.label, value);
  assert.deepEqual(
    diff[code].instructionList.find((i) => i.code === 'format_label_ar_1'),
    { code: 'format_label_ar_1', contentPath: ['content', 'ar', 'label'], text: 'Q1.value', lang: 'ar' },
  );
  assert.equal(diff[code].resources.content_ar_label_1, 'logo.png');
  assert.equal(design.designerInput.state[code].content?.ar, undefined, 'input design is left untouched');
});

test('returns no components when nothing changes', async () => {
  assert.deepEqual(await applyDesignActions(await newDesign(), () => []), {});
});

test('loads a survey that has no defaultLang', async () => {
  const design = await newDesign();
  delete design.designerInput.state.Survey.defaultLang;
  const code = firstGroup(design);

  const diff = await writeTexts(design, [{ code, lang: 'en', key: 'label', value: '<p>Hi</p>' }]);

  assert.equal(diff[code].content.en.label, '<p>Hi</p>');
});

test('runs any designer action, in order', async () => {
  const design = await newDesign();
  const code = firstGroup(design);

  const diff = await applyDesignActions(design, ({ changeContent, changeAttribute }) => [
    changeContent({ code, lang: 'en', key: 'label', value: '<p>First</p>' }),
    changeAttribute({ code, key: 'hidden', value: true }),
    changeContent({ code, lang: 'en', key: 'label', value: '<p>Second</p>' }),
  ]);

  assert.deepEqual(Object.keys(diff), [code]);
  assert.equal(diff[code].hidden, true);
  assert.equal(diff[code].content.en.label, '<p>Second</p>');
});
