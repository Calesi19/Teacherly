import type { Locale } from "@teacherly/core";

/** Mirrors the server's `TeacherResponse`. Never carries a hash or a token. */
export interface TeacherDto {
  id: string;
  email: string;
  displayName: string;
  locale: Locale;
}

export interface ApiIssue {
  field: string;
  code: string;
}

/**
 * A failed API call, carrying the server's machine-readable code rather than a
 * message. The client picks the wording from `@teacherly/i18n`, so error text
 * is translated like everything else.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly issues: readonly ApiIssue[];

  constructor(status: number, code: string, issues: readonly ApiIssue[] = []) {
    super(`API ${status}: ${code}`);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.issues = issues;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    // The session cookie is httpOnly, so the browser has to attach it for us.
    // `same-origin` suffices because the Vite dev server proxies /api, so the
    // browser never makes a cross-origin API call in either environment.
    credentials: "same-origin",
    headers: init?.body === undefined ? {} : { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new ApiError(response.status, ...(await readErrorBody(response)));
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

async function readErrorBody(response: Response): Promise<[string, readonly ApiIssue[]]> {
  try {
    const body = (await response.json()) as { error?: { code?: string; issues?: ApiIssue[] } };
    return [body.error?.code ?? "unexpected", body.error?.issues ?? []];
  } catch {
    return ["unexpected", []];
  }
}

export interface SignupRequest {
  email: string;
  password: string;
  displayName: string;
  locale: Locale;
  /** Sign-up is invite-only; the server answers uniformly if this is wrong. */
  inviteCode: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Signup's response carries no teacher and sets no cookie, on purpose. The
 * server answers `201 {"ok":true}` whether the address was free, already
 * registered, or the invite code was wrong — identical status, body and
 * headers — so none of it is an account-existence oracle.
 *
 * Which means a `201` here does not mean "you are signed up", and the client
 * must not treat it as one. `useSignup` finds out by logging in.
 */
export interface SignupResponse {
  ok: true;
}

export const api = {
  signup(input: SignupRequest): Promise<SignupResponse> {
    return request("/api/auth/signup", { method: "POST", body: JSON.stringify(input) });
  },

  login(input: LoginRequest): Promise<{ teacher: TeacherDto }> {
    return request("/api/auth/login", { method: "POST", body: JSON.stringify(input) });
  },

  logout(): Promise<void> {
    return request("/api/auth/logout", { method: "POST" });
  },

  /** `null` rather than a throw for the ordinary "not signed in" case. */
  async me(): Promise<{ teacher: TeacherDto } | null> {
    try {
      return await request<{ teacher: TeacherDto }>("/api/me");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null;
      throw error;
    }
  },
};
