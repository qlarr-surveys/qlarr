/**
 * Saved crosstab "tab plans" live in the user session (localStorage), keyed by
 * survey — never the database. Degrades to a no-op / empty list if localStorage
 * is unavailable (private mode, quota, etc.).
 */

const keyFor = (surveyId) => `qlarr.crosstabs.${surveyId}`;

export function loadPlans(surveyId) {
  try {
    const raw = window.localStorage.getItem(keyFor(surveyId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePlans(surveyId, plans) {
  try {
    window.localStorage.setItem(keyFor(surveyId), JSON.stringify(plans));
    return true;
  } catch {
    return false;
  }
}

/** A stable-ish id without pulling in a uuid dep. */
export function newPlanId() {
  return `plan_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}
