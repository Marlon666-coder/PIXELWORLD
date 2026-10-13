export type ActionFieldErrors = Record<string, string[] | undefined>;

export type ActionResult<T> =
  | { ok: true; data: T; warning?: string }
  | { ok: false; error: string; fieldErrors?: ActionFieldErrors };

export interface PosterUploadTicket {
  path: string;
  signedUrl: string;
  token: string;
}

export interface SavedCompetition {
  id: string;
  /** A previous poster that could not be removed after a successful replacement. */
  orphanedPosterPath: string | null;
}

export interface DeletedCompetition {
  id: string;
  title: string;
  /** Poster object that could not be removed after the record was deleted. */
  orphanedPosterPath: string | null;
}

export interface CleanupSummary {
  removed: string[];
  skipped: { path: string; reason: string }[];
  failed: { path: string; reason: string }[];
}

export interface LoginState {
  error: string | null;
  fieldErrors?: { email?: string[]; password?: string[] };
  email?: string;
}
