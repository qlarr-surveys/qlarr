import { wallClockToInstant } from '../../common/datetime';
import { NavigationIndexJson, ResponseField } from '../../engine/engine.types';
import { WrongValueTypeException } from '../responses/response.exceptions';
import { ClientTimeSkewException } from './run.exceptions';
import { SurveyLang } from './run.dto';

const EN: SurveyLang = { code: 'en', name: 'English' };

/** The survey's default language (≈ `defaultSurveyLang`). Falls back to English. */
export function defaultSurveyLang(survey: Record<string, unknown>): SurveyLang {
  const lang = survey.defaultLang as SurveyLang | undefined;
  return lang?.code ? lang : EN;
}

/** The survey's non-default languages (≈ `additionalLang`). */
export function additionalLang(survey: Record<string, unknown>): SurveyLang[] {
  const langs = survey.additionalLang;
  return Array.isArray(langs) ? (langs as SurveyLang[]) : [];
}

/** Resolve a language code to a SurveyLang (≈ `availableLangByCode`). */
export function availableLangByCode(
  survey: Record<string, unknown>,
  code: string | null | undefined,
): SurveyLang {
  const def = defaultSurveyLang(survey);
  if (!code || code === def.code) return def;
  return additionalLang(survey).find((l) => l.code === code) ?? def;
}

/** The compact string form of a navigation index (≈ engine `stringIndex`). */
export function stringIndex(index: NavigationIndexJson): string {
  switch (index.name) {
    case 'end':
      return 'End';
    case 'group':
      return index.groupId ?? '';
    case 'groups':
      return `[${(index.groupIds ?? []).join(', ')}]`;
    case 'question':
      return index.questionId ?? '';
    default:
      return '';
  }
}

/**
 * Reject respondent-submitted values whose runtime type doesn't match the
 * design schema. Only keys that map
 * to a schema field (`"$componentCode.${columnName.lowercase()}"`) are checked;
 * a null value is skipped. A mismatch throws `WrongValueTypeException` (400) —
 * without this, mistyped values are stringified into the engine and persisted,
 * corrupting exports and analytics that assume the schema types.
 */
export function validateSchema(
  values: Record<string, unknown>,
  schema: ResponseField[],
): void {
  for (const field of schema) {
    const key = `${field.componentCode}.${String(field.columnName).toLowerCase()}`;
    if (!(key in values)) continue;
    const value = values[key];
    if (value === null || value === undefined) continue;
    if (!matchesDataType(value, field.dataType)) {
      throw new WrongValueTypeException(key, expectedType(field.dataType), typeName(value));
    }
  }
}

/** Is `value`'s runtime type valid for `dataType`? */
function matchesDataType(value: unknown, dataType: unknown): boolean {
  switch (dataTypeName(dataType)) {
    case 'boolean':
      return typeof value === 'boolean';
    // Date is serialized/stored as a string; enum resolves to one of its codes.
    case 'date':
    case 'enum':
    case 'string':
      return typeof value === 'string';
    case 'double':
      return typeof value === 'number';
    case 'int':
      return typeof value === 'number' && Number.isInteger(value);
    case 'list':
      return Array.isArray(value);
    case 'file':
    case 'map':
      return isPlainObject(value);
    default:
      return false;
  }
}

/** A human-readable name for the schema's expected type. */
function expectedType(dataType: unknown): string {
  switch (dataTypeName(dataType)) {
    case 'boolean':
      return 'boolean';
    case 'date':
    case 'enum':
    case 'string':
      return 'string';
    case 'double':
      return 'number';
    case 'int':
      return 'integer';
    case 'list':
      return 'array';
    case 'file':
    case 'map':
      return 'object';
    default:
      return dataTypeName(dataType) ?? 'unknown';
  }
}

/**
 * The engine serializes `dataType` as either a bare string (`"string"`,
 * `"double"`, …) or an object with a `type` discriminator (`{type:"enum",…}` /
 * `{type:"list",…}`). Normalize both to the lowercase type name.
 */
function dataTypeName(dataType: unknown): string | undefined {
  if (typeof dataType === 'string') return dataType.toLowerCase();
  if (isPlainObject(dataType) && typeof dataType.type === 'string') {
    return dataType.type.toLowerCase();
  }
  return undefined;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The JS runtime type name for the error message. */
function typeName(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
  return typeof value;
}

/**
 * Reject a client clock more than 60s off the server (≈ `validateClientTimeSkew`).
 * A missing client time is fine.
 */
export function validateClientTimeSkew(clientUTCTime: string | undefined): void {
  if (!clientUTCTime) return;
  const diffSeconds = Math.abs(wallClockToInstant(clientUTCTime) - Date.now()) / 1000;
  if (!Number.isFinite(diffSeconds) || diffSeconds > 60) {
    throw new ClientTimeSkewException();
  }
}
