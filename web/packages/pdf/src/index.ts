import type { Locale, TeacherId } from "@teacherly/core";

/**
 * Stub. The report chunk replaces the body of `renderReport` with a
 * `@react-pdf/renderer` document; this file exists now so that the package is
 * real, typed and wired into the workspace before anything depends on it.
 */

/** Everything a report needs that is not yet modelled. Grows in the report chunk. */
export interface ReportRequest {
  /**
   * Branded, so the report chunk cannot be handed an id that came from a
   * request parameter rather than from the caller's resolved session.
   */
  teacherId: TeacherId;
  locale: Locale;
  /** Human-readable title for the generated document. */
  title: string;
}

export interface RenderedReport {
  filename: string;
  contentType: "application/pdf";
  body: Uint8Array;
}

export class ReportNotImplementedError extends Error {
  readonly code = "report_not_implemented" as const;

  constructor() {
    super("PDF report rendering arrives in a later chunk.");
    this.name = "ReportNotImplementedError";
  }
}

/**
 * The signature the server will call. Throws for now rather than returning an
 * empty PDF, so an accidental early caller fails loudly instead of shipping a
 * blank document to a teacher.
 */
export function renderReport(_request: ReportRequest): Promise<RenderedReport> {
  return Promise.reject(new ReportNotImplementedError());
}
