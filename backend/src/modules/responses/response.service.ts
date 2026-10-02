import { Inject, Injectable, Logger } from "@nestjs/common";
import { replaceFormatInstructions } from "@qlarr/design-core";
import { PassThrough, Readable } from "node:stream";
import { ZipFile } from "yazl";
import { stripTags } from "../../common/strip-tags";
import { EngineService } from "../../engine/engine.service";
import { ComponentIndex, ResponseField } from "../../engine/engine.types";
import {
  FILE_HELPER,
  FileHelper,
} from "../../integrations/filesystem/file-helper";
import { SurveyFolder } from "../../integrations/filesystem/survey-folder";
import { DesignService } from "../design/design.service";
import { ResponseDetailRow, ResponseRepository } from "./response.repository";
import {
  ResponseDto,
  ResponseEventDto,
  ResponseStatus,
  ResponsesSummaryDto,
  ResponseValue,
} from "./response.dto";
import { exportCsv, exportXlsx, ResponseFormat } from "./response-export";
import {
  ResponseNotFoundException,
  SizeLimitExceededException,
} from "./response.exceptions";

const ADDITIONAL_COL_NAMES = [
  "index",
  "id",
  "start_date",
  "submit_date",
  "Lang",
  "disqualified",
];

const PER_PAGE = 10;
const PAGE = 1;
const MAX_BULK_BYTES = 200 * 1024 * 1024; // 200MB

interface FileToDownload {
  responseId: string;
  index: number;
  questionId: string;
  storedFilename: string;
  originalFilename: string;
  size: number;
}

/**
 * The engine-INDEPENDENT response operations (the parts that don't touch the
 * survey engine): the paginated response list and response deletion. Reading a
 * single response,
 * exports and analytics need the processed design schema and are deferred to
 * the engine phase.
 */
@Injectable()
export class ResponseService {
  private readonly logger = new Logger(ResponseService.name);

  constructor(
    private readonly responses: ResponseRepository,
    @Inject(FILE_HELPER) private readonly files: FileHelper,
    private readonly design: DesignService,
    private readonly engine: EngineService,
  ) {}

  /**
   * Export responses in an index range as CSV/XLSX using the stored (DB) values.
   * Columns are the fixed metadata columns plus the design's response schema.
   * Returns null when the range is empty (→ 204).
   */
  async exportResponses(
    surveyId: string,
    complete: boolean | undefined,
    format: ResponseFormat,
    from: number,
    to: number,
  ): Promise<Buffer | null> {
    const responses = await this.responses.findInIndexRange(
      surveyId,
      complete,
      from,
      to,
    );
    if (!responses.length) return null;

    const processed = await this.design.getProcessedSurvey(surveyId, true);
    const colNames = processed.output.schema.map(
      (f) => `${f.componentCode}.${String(f.columnName).toLowerCase()}`,
    );
    const finalCols = [...ADDITIONAL_COL_NAMES, ...colNames];
    const rows = responses.map((r) => [
      r.index,
      r.id,
      r.startDate,
      r.submitDate,
      r.lang,
      r.values["Survey.disqualified"] ?? false,
      ...colNames.map((c) => r.values[c] ?? null),
    ]);
    return format === "XLSX"
      ? exportXlsx(rows, finalCols)
      : exportCsv(rows, finalCols);
  }

  async exportTextResponses(
    surveyId: string,
    complete: boolean | undefined,
    format: ResponseFormat,
    from: number,
    to: number,
  ): Promise<Buffer | null> {
    const responses = await this.responses.findInIndexRange(
      surveyId,
      complete,
      from,
      to,
    );
    if (!responses.length) return null;

    const processed = await this.design.getProcessedSurvey(surveyId, true);
    const survey = processed.output.survey;
    const lang =
      (survey.defaultLang as { code?: string } | undefined)?.code ?? "en";
    const indexList = buildCodeIndex(processed.output.componentIndexList);
    const labels: Record<string, string> = {};
    for (const [code, value] of Object.entries(
      this.engine.labels(survey, lang),
    )) {
      // non-empty, then strip HTML, then collapse `{{ pipe refs }}` to a literal `{{...}}`
      if (value !== "")
        labels[code] = stripTags(value).replace(/\{\{.*?\}\}/g, "{{...}}");
    }

    // `<component>.value` columns from the design schema (the source of truth),
    // ordered by the component's position in the design's component index. Driving
    // this from the schema rather than the responses in range keeps the column set
    // stable and complete across export chunks.
    const order = processed.output.componentIndexList.map((c) => c.code);
    const valueFields = processed.output.schema.filter(
      (f) => String(f.columnName) === "VALUE",
    );
    const valueNames = valueFields
      .map((f) => `${f.componentCode}.value`)
      .sort(
        (a, b) =>
          order.indexOf(a.split(".")[0]) - order.indexOf(b.split(".")[0]),
      );
    const dataTypeByCode = valueDataTypes(processed.output.schema);

    const colNames = valueNames.map((valueKey) => {
      const componentCode = valueKey.split(".")[0];
      const componentCodes = this.engine
        .splitToComponentCodes(componentCode)
        .map((_, i, arr) => arr.slice(0, i + 1).join(""));
      const componentLabels = componentCodes
        .map((e) => labels[e])
        .filter((e) => e);
      return indexList[componentCodes[0]] + " " + componentLabels.join(" - ");
    });

    const finalCols = [...ADDITIONAL_COL_NAMES, ...colNames];
    const rows = responses.map((r) => {
      return [
        r.index,
        r.id,
        r.startDate,
        r.submitDate,
        r.lang,
        r.values["Survey.disqualified"] ?? false,
        ...valueNames.map((valueKey) => {
          const componentCode = valueKey.split(".")[0];
          const questionCode =
            this.engine.splitToComponentCodes(componentCode)[0];
          return (
            resolveListAndEnumValues(
              r.values[valueKey],
              questionCode,
              dataTypeByCode[componentCode],
              labels,
            ) || ""
          );
        }),
      ];
    });

    return format === "XLSX"
      ? exportXlsx(rows, finalCols)
      : exportCsv(rows, finalCols);
  }

  async getSummary(
    surveyId: string,
    page: number | undefined,
    perPage: number | undefined,
    status: ResponseStatus,
    surveyor: string | undefined,
    confirmFilesExport: boolean,
  ): Promise<ResponsesSummaryDto> {
    const size = perPage ?? PER_PAGE;
    const pageIndex = (page ?? PAGE) - 1;
    const offset = pageIndex * size;

    const totalCount = await this.responses.countForSummary(
      surveyId,
      status,
      surveyor,
    );
    const rows = await this.responses.summaryPage(
      surveyId,
      status,
      surveyor,
      size,
      offset,
    );

    // Only compute this when the caller asks (it costs a design lookup): does
    // the survey have any file-returning question?
    // ReturnType.File serializes to the string "file" in the engine schema.
    let canExportFiles = false;
    if (confirmFilesExport) {
      const processed = await this.design.getProcessedSurvey(surveyId, false);
      canExportFiles = processed.output.schema.some(
        (f) => f.dataType === "file",
      );
    }

    return {
      totalCount,
      totalPages: size > 0 ? Math.ceil(totalCount / size) : 0,
      pageNumber: pageIndex + 1,
      responses: rows.map((r) => ({ ...r, index: Number(r.index) })),
      canExportFiles,
    };
  }

  /**
   * Collect every file attached to responses in the index range [from,to]
   * (optionally filtered by completeness), enforce the 200MB cap, and stream
   * them as a ZIP. Returns null when there's nothing to export (→ 204). Per-file
   * download errors are logged and skipped.
   */
  async bulkDownloadResponses(
    surveyId: string,
    complete: boolean | undefined,
    from: number,
    to: number,
  ): Promise<Readable | null> {
    const rows = await this.responses.findFilesInIndexRange(
      surveyId,
      complete,
      from,
      to,
    );
    if (!rows.length) return null;

    const filesToDownload: FileToDownload[] = [];
    let totalSize = 0;
    for (const row of rows) {
      for (const [questionId, value] of Object.entries(row.values ?? {})) {
        const v = value as Record<string, unknown>;
        if (!v || typeof v !== "object" || !("stored_filename" in v)) continue;
        const storedFilename = v.stored_filename as string | undefined;
        const originalFilename = v.filename as string | undefined;
        const size = typeof v.size === "number" ? v.size : undefined;
        if (storedFilename && originalFilename && size != null) {
          filesToDownload.push({
            responseId: row.id,
            index: Number(row.index),
            questionId,
            storedFilename,
            originalFilename,
            size,
          });
          totalSize += size;
        }
      }
    }
    if (!filesToDownload.length) return null;
    if (totalSize > MAX_BULK_BYTES) throw new SizeLimitExceededException();

    const zip = new ZipFile();
    const output = zip.outputStream as Readable;

    // If the consumer goes away (client disconnect → the controller destroys
    // `output`), stop feeding: tear down the in-flight S3 body and the entry's
    // PassThrough so the loop unwinds instead of leaking the connection or
    // opening more sources. Destroying the body alone would NOT unblock the
    // await — pipe() does not propagate a source destroy to its destination —
    // so we destroy the pass too, which resolves the await via its 'close'.
    let aborted = false;
    let currentBody: Readable | null = null;
    let currentPass: PassThrough | null = null;
    const abort = () => {
      if (aborted) return;
      aborted = true;
      currentBody?.destroy();
      currentPass?.destroy();
    };
    output.once("close", abort);
    output.once("error", abort);

    // yazl re-emits any error from an added read stream as 'error' on the
    // ZipFile; an EventEmitter emitting 'error' with no listener throws and
    // takes the process down. Guard it (the consumer also handles output
    // errors on the returned stream).
    zip.on("error", (err) => {
      this.logger.error("Error while building bulk-download zip", err as Error);
    });
    // Feed entries sequentially; yazl serializes them into the output stream.
    void (async () => {
      for (const file of filesToDownload) {
        if (aborted) break;
        try {
          const dl = await this.files.download(
            surveyId,
            SurveyFolder.Responses(file.responseId),
            file.storedFilename,
          );
          if (aborted) {
            dl.body.destroy();
            break;
          }
          // Pipe the S3 body through a PassThrough so a mid-transfer failure
          // (socket reset, read timeout, truncated transfer) never reaches
          // yazl as a stream 'error'. On such a failure we end the entry
          // cleanly, yielding a truncated entry and letting the remaining
          // files download — via a per-entry try/catch.
          const pass = new PassThrough();
          currentBody = dl.body;
          currentPass = pass;
          zip.addReadStream(
            pass,
            `${file.index}-${file.questionId}-${file.originalFilename}`,
          );
          dl.body.on("error", (err) => {
            this.logger.error(
              `Error streaming ${file.storedFilename} for response ${file.responseId}`,
              err as Error,
            );
            pass.end();
          });
          dl.body.pipe(pass);
          // Wait for this entry to finish before starting the next download,
          // so at most one S3 stream is in flight (bounded memory). 'close'
          // also covers the abort path, where the pass is destroyed.
          await new Promise<void>((resolve) => {
            pass.once("end", resolve);
            pass.once("close", resolve);
          });
        } catch (err) {
          this.logger.error(
            `Error downloading ${file.storedFilename} for response ${file.responseId}`,
            err as Error,
          );
        } finally {
          currentBody = null;
          currentPass = null;
        }
      }
      // Finalize (write the central directory) only if the output still
      // exists; on abort it was already destroyed, so there's nothing to end.
      if (!aborted) zip.end();
    })();
    return output;
  }

  /**
   * Read one response with its answers resolved to human-readable, labelled
   * values. Tenant-scoped from the token — NOT survey-scoped. Values are
   * ordered by the respondent's own child ordering
   * (`sortChildren`), and cover every component that has a stored value or an
   * associated timeline event.
   */
  async getResponse(responseId: string): Promise<ResponseDto> {
    const row = await this.responseWithSurveyorName(responseId);
    const processed = await this.design.getProcessedSurvey(row.surveyId, false);
    const indexList = buildCodeIndex(processed.output.componentIndexList);
    const labels = this.resolveLabels(processed.output.survey);
    const dataTypeByCode = valueDataTypes(processed.output.schema);
    const sorted = this.engine.sortChildren(
      processed.output.componentIndexList,
      row.values,
    );

    const eventCodes = row.events
      .map((e) => eventComponentCode(e))
      .filter((c): c is string => c != null);
    const valueCodes = Object.keys(row.values)
      .filter((k) => k.split(".").pop() === "value")
      .map((k) => k.split(".")[0]);

    const values = sorted
      .map((c) => c.code)
      .filter((code) => valueCodes.includes(code) || eventCodes.includes(code))
      .map((code) =>
        buildResponseValue(
          code,
          row.values,
          indexList,
          labels,
          dataTypeByCode,
          this.engine,
          row.lang,
        ),
      )
      // Drop entries with no answer (empty string, empty array, or null — e.g.
      // event-only codes that carry no `.value`).
      .filter(
        (rv) =>
          rv.value != null &&
          rv.value !== "" &&
          !(Array.isArray(rv.value) && rv.value.length === 0),
      );

    return {
      id: row.id,
      index: row.index,
      startDate: row.startDate,
      submitDate: row.submitDate,
      lang: row.lang,
      preview: row.preview,
      disqualified: (row.values["Survey.disqualified"] as boolean) ?? false,
      values,
      surveyorName: row.surveyor ? `${row.firstName} ${row.lastName}` : null,
      surveyorID: row.surveyor,
      version: row.version,
      // Value-timing + navigation events are internal bookkeeping; the response
      // view keeps only the user-facing ones (voice recordings, locations).
      events: row.events.filter((e) => {
        const name = (e as { name?: string }).name;
        return name !== "ValueTiming" && name !== "Navigation";
      }),
      ipAddress: row.ipAddress,
    };
  }

  /**
   * The full event timeline for a response, each value-timing event carrying its
   * resolved answer value. Tenant-scoped.
   */
  async getResponseWithEvents(responseId: string): Promise<ResponseEventDto[]> {
    const row = await this.responseWithSurveyorName(responseId);
    const processed = await this.design.getProcessedSurvey(row.surveyId, false);
    const indexList = buildCodeIndex(processed.output.componentIndexList);
    const labels = this.resolveLabels(processed.output.survey);
    const dataTypeByCode = valueDataTypes(processed.output.schema);

    return row.events.map((event) => {
      if ((event as { name?: string }).name === "ValueTiming") {
        const code = (event as { code: string }).code;
        return {
          event,
          responseValue: buildResponseValue(
            code,
            row.values,
            indexList,
            labels,
            dataTypeByCode,
            this.engine,
            row.lang,
          ),
        };
      }
      return { event, responseValue: null };
    });
  }

  /** Load a response with its surveyor's name (LEFT JOIN users). Throws if the
   *  response id is unknown in this tenant. */
  private async responseWithSurveyorName(
    responseId: string,
  ): Promise<ResponseDetailRow> {
    const row = await this.responses.findWithSurveyorName(responseId);
    if (!row) throw new ResponseNotFoundException();
    return row;
  }

  /** Component code → plain-text label for the survey's default language. */
  private resolveLabels(
    survey: Record<string, unknown>,
  ): Record<string, string> {
    const lang =
      (survey.defaultLang as { code?: string } | undefined)?.code ?? "en";
    const labels: Record<string, string> = {};
    for (const [code, value] of Object.entries(
      this.engine.labels(survey, lang),
    )) {
      if (value !== "") labels[code] = stripTags(value); // non-empty, then strip HTML
    }
    return labels;
  }

  /** Delete a response and every file attached to it. */
  async deleteResponse(surveyId: string, responseId: string): Promise<void> {
    if (!(await this.responses.exists(responseId))) {
      throw new ResponseNotFoundException();
    }

    const folder = SurveyFolder.Responses(responseId);
    const attached = await this.files.responseFiles(surveyId, responseId);
    for (const file of attached) {
      await this.files.delete(surveyId, folder, file.name);
    }
    await this.responses.deleteById(responseId);
  }
}

/**
 * Component code → display index (≈ KMP `ValidationJsonOutput.buildCodeIndex`):
 * groups number as `P1, P2, …`, questions as `Q1, Q2, …`, and answers inherit
 * their question's index (the leading question code is swapped for its number).
 * The first entry (the Survey root) is skipped.
 */
/**
 * The component a timeline event refers to (≈ `ResponseEvent.componentCode`):
 * value-timing events point at their `code`, navigation events at their `to`
 * target; everything else has none.
 */
function eventComponentCode(event: unknown): string | null {
  if (!event || typeof event !== "object") return null;
  const e = event as { name?: string; code?: string; to?: string };
  if (e.name === "ValueTiming") return e.code ?? null;
  if (e.name === "Navigation") return e.to ?? null;
  return null;
}

/**
 * The per-component slice of the flat response values, with the `<code>.` prefix
 * stripped — the shape `replaceFormatInstructions` expects as its `state` (keys
 * like `format_label_en_1`).
 */
function formatState(
  values: Record<string, unknown>,
  code: string,
): Record<string, unknown> {
  const prefix = `${code}.`;
  const state: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(values)) {
    if (k.startsWith(prefix)) state[k.slice(prefix.length)] = v;
  }
  return state;
}

/**
 * Which language's `format_<name>_<lang>_<n>` results to use. Prefers the
 * response's language, but falls back to whatever language the stored
 * instructions actually carry — the survey's languages may have changed after
 * this response was collected.
 */
function pickFormatLang(
  state: Record<string, unknown>,
  name: string,
  preferred: string,
): string {
  const prefix = `format_${name}_`;
  const langs = new Set<string>();
  for (const k of Object.keys(state)) {
    if (!k.startsWith(prefix)) continue;
    const match = k.slice(prefix.length).match(/^(.+)_\d+$/);
    if (match) langs.add(match[1]);
  }
  return langs.has(preferred)
    ? preferred
    : (langs.values().next().value ?? preferred);
}

function buildResponseValue(
  code: string,
  values: Record<string, unknown>,
  indexList: Record<string, string>,
  labels: Record<string, string>,
  dataTypeByCode: Record<string, unknown>,
  engine: EngineService,
  lang: string,
): ResponseValue {
  const componentCodes = engine.splitToComponentCodes(code);
  const resolveLabel = (c: string, text: string) => {
    const state = formatState(values, c);
    return replaceFormatInstructions(
      text,
      state,
      "label",
      pickFormatLang(state, "label", lang),
    );
  };
  const key =
    componentCodes.length > 1
      ? `(${indexList[componentCodes[0]]}) ${resolveLabel(
          componentCodes[0],
          labels[componentCodes[0]] ?? "",
        )} - ${resolveLabel(code, labels[code] ?? code)}`
      : `(${indexList[code]}) ${resolveLabel(code, labels[code] ?? "")}`;
  let value: unknown = null;
  if (Object.prototype.hasOwnProperty.call(values, `${code}.value`)) {
    value = resolveListAndEnumValues(
      values[`${code}.value`],
      componentCodes[0],
      dataTypeByCode[code],
      labels,
    );
  }
  return { key, code, value };
}


function resolveListAndEnumValues(
  raw: unknown,
  questionCode: string,
  dataType: unknown,
  labels: Record<string, string>,
): unknown {
  const toLabel = (code: unknown) => labels[questionCode + String(code)] ?? code;
  const type = dataTypeName(dataType);
  if (type === "enum" && typeof raw === "string") return toLabel(raw);
  if (type === "list" && Array.isArray(raw)) return raw.map(toLabel).join(", ");
  return raw;
}

/**
 * componentCode → `dataType` for every `VALUE` field in the response schema, so
 * cells/response values can resolve choice answer codes to their labels.
 */
function valueDataTypes(
  schema: ResponseField[],
): Record<string, unknown> {
  const byCode: Record<string, unknown> = {};
  for (const f of schema) {
    if (String(f.columnName) === "VALUE") byCode[f.componentCode] = f.dataType;
  }
  return byCode;
}

function buildCodeIndex(
  componentIndexList: ComponentIndex[],
): Record<string, string> {
  const index: Record<string, string> = {};
  let groupIndex = 0;
  let questionIndex = 0;
  let currentQuestion = "";
  for (const { code } of componentIndexList.slice(1)) {
    if (code.startsWith("G")) {
      groupIndex += 1;
      index[code] = `P${groupIndex}`;
    } else if (code.startsWith("Q") && !code.includes("A")) {
      currentQuestion = code;
      questionIndex += 1;
      index[code] = `Q${questionIndex}`;
    } else {
      index[code] = code.replace(currentQuestion, index[currentQuestion]);
    }
  }
  return index;
}

/**
 * Schema `dataType` is either a bare string (`"string"`, `"double"`, …) or an
 * object with a `type` discriminator (`{type:"enum",…}` / `{type:"list",…}`).
 * Normalize both to the lowercase type name.
 */
function dataTypeName(dataType: unknown): string | undefined {
  if (typeof dataType === "string") return dataType.toLowerCase();
  if (
    dataType &&
    typeof dataType === "object" &&
    typeof (dataType as { type?: unknown }).type === "string"
  ) {
    return (dataType as { type: string }).type.toLowerCase();
  }
  return undefined;
}
