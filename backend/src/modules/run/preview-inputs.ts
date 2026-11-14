import { ValidationJsonOutput } from '../../engine/engine.types';

/** An earlier answer that changes how the previewed question looks. */
export interface PreviewInput {
  /** The answering component: a question, or e.g. one row of an array. */
  code: string;
  kind: 'single' | 'multi' | 'text' | 'number';
  label: string;
  /** Choices for `single` / `multi`. */
  options?: { code: string; label: string }[];
}

interface DesignComponent {
  code: string;
  qualifiedCode?: string;
  content?: Record<string, { label?: string }>;
  answers?: DesignComponent[];
}

type DataType = string | { type: string; values?: string[] };

const KIND_BY_TYPE: Record<string, PreviewInput['kind']> = {
  enum: 'single',
  list: 'multi',
  string: 'text',
  int: 'number',
  double: 'number',
};

// Relevance is forced on in a single-question preview, so answers that only
// decide whether the question shows aren't worth asking for.
const IGNORED_TARGETS = new Set([
  'relevance',
  'conditional_relevance',
  'in_current_navigation',
]);

/**
 * The answers a single-question preview needs to look right: walk the impact
 * map backwards from everything the target question (and its answers)
 * computes, through intermediate values, down to values respondents enter.
 * What can be entered, and as what, comes from the response schema, so any
 * question type works — including a single row of an array.
 */
export function previewInputs(
  output: ValidationJsonOutput,
  questionId: string,
  lang: string,
): PreviewInput[] {
  const survey = output.survey as {
    defaultLang?: { code?: string };
    groups?: { questions?: DesignComponent[] }[];
  };
  const defaultLang = survey.defaultLang?.code;
  const questions = (survey.groups ?? []).flatMap((g) => g.questions ?? []);

  // Every qualified code → its component, and the question it belongs to.
  const components = new Map<string, DesignComponent>();
  const owner = new Map<string, DesignComponent>();
  const index = (question: DesignComponent, node: DesignComponent) => {
    const code = node.qualifiedCode ?? node.code;
    components.set(code, node);
    owner.set(code, question);
    (node.answers ?? []).forEach((a) => index(question, a));
  };
  questions.forEach((q) => index(q, q));

  const valueTypes = new Map<string, DataType>(
    output.schema
      .filter((f) => String(f.columnName) === 'VALUE')
      .map((f) => [f.componentCode, f.dataType as DataType]),
  );
  const kindOf = (code: string) => {
    const type = valueTypes.get(code);
    return type === undefined ? undefined : KIND_BY_TYPE[typeof type === 'string' ? type : type.type];
  };

  const sources = new Map<string, string[]>();
  for (const [source, targets] of Object.entries(output.impactMap)) {
    for (const target of targets as string[]) {
      sources.set(target, [...(sources.get(target) ?? []), source]);
    }
  }

  const split = (key: string) => {
    const dot = key.lastIndexOf('.');
    return [key.slice(0, dot), key.slice(dot + 1)];
  };
  const isTarget = (key: string) => owner.get(split(key)[0])?.code === questionId;

  const queue = [...sources.keys()].filter(
    (key) => isTarget(key) && !IGNORED_TARGETS.has(split(key)[1]),
  );
  const seen = new Set(queue);
  const inputs = new Set<string>();
  while (queue.length) {
    for (const source of sources.get(queue.shift()!) ?? []) {
      if (seen.has(source) || isTarget(source)) continue;
      seen.add(source);
      const [code, name] = split(source);
      if (name === 'value' && kindOf(code)) {
        inputs.add(code);
      } else {
        queue.push(source);
      }
    }
  }

  const text = (c: DesignComponent | undefined) =>
    plainText(
      c?.content?.[lang]?.label ?? (defaultLang ? c?.content?.[defaultLang]?.label : '') ?? '',
    );
  const labelOf = (code: string) => {
    const component = components.get(code);
    const question = owner.get(code)!;
    const own = text(component) || component?.code || code;
    // A row (or other part) of a question: name the question too.
    return component === question ? own : `${text(question) || question.code} · ${own}`;
  };
  // A choice's code is local: an answer of this component (scq), or a sibling
  // under the same question (an array row's columns).
  const optionLabel = (code: string, value: string) =>
    text(components.get(code + value)) ||
    text(components.get((owner.get(code)!.qualifiedCode ?? owner.get(code)!.code) + value)) ||
    value;

  // Schema order is survey order.
  return [...valueTypes.keys()]
    .filter((code) => inputs.has(code))
    .map((code) => {
      const type = valueTypes.get(code)!;
      const values = typeof type === 'string' ? undefined : type.values;
      return {
        code,
        kind: kindOf(code)!,
        label: labelOf(code),
        ...(values ? { options: values.map((v) => ({ code: v, label: optionLabel(code, v) })) } : {}),
      };
    });
}

function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
