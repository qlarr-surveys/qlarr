import { LANGUAGE_DEF } from "@qlarr/design-core/constants/language";

/**
 * A language's own name — "العربية", "Deutsch" — is what someone scanning a
 * list of languages recognises, so it stays the label. But it is unreadable to
 * an admin who doesn't read that script, so the same language's name in the
 * interface language follows it as a gloss.
 *
 * Returns null when the gloss would add nothing: when the interface already
 * calls the language what it calls itself, or when the browser has no
 * `Intl.DisplayNames` to ask.
 */
export function languageGloss(code, uiLang) {
  const own = LANGUAGE_DEF[code]?.name;
  let localized;
  try {
    localized = new Intl.DisplayNames([uiLang], { type: "language" }).of(code);
  } catch {
    return null;
  }
  if (!localized || localized === code || localized === own) {
    return null;
  }
  return localized;
}

/** The language as one string, for a `<select>` row and for screen readers. */
export function languageLabel(code, uiLang) {
  const own = LANGUAGE_DEF[code]?.name || code;
  const gloss = languageGloss(code, uiLang);
  return gloss ? `${own} — ${gloss}` : own;
}
