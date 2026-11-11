/** Replace a component code in a text. Whole codes only: renaming Q1 must not touch Q10 or Q1_x. */
export function replaceCode(text: string, from: string, to: string): string {
  const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`${escaped}(?![a-z0-9_])`, 'g'), () => to);
}
