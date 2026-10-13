import { validatePosterBytes, type ImageInfo } from "@/lib/images/image-inspection";
import { formatBytes } from "@/lib/utils";

export type PosterFileCheck = { ok: true; info: ImageInfo } | { ok: false; reason: string };

/** Validates a selected file in the browser by reading its actual bytes (never just the extension). */
export async function inspectPosterFile(file: File, maxBytes: number): Promise<PosterFileCheck> {
  if (file.size === 0) return { ok: false, reason: "That file is empty." };
  if (file.size > maxBytes) {
    return { ok: false, reason: `That file is ${formatBytes(file.size)}. Posters must be ${formatBytes(maxBytes)} or smaller.` };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const result = validatePosterBytes(bytes, maxBytes);
  return result.ok ? result : { ok: false, reason: `${result.reason} Supported formats: JPEG, PNG, WebP.` };
}

export class PosterUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PosterUploadError";
  }
}

function describeStorageFailure(status: number, body: string): string {
  let message = "";
  try {
    const parsed = JSON.parse(body) as { message?: string; error?: string };
    message = parsed.message ?? parsed.error ?? "";
  } catch {
    // non-JSON body
  }
  if (status === 413) return "Storage rejected the poster because it is too large.";
  if (status === 415 || /mime/i.test(message)) return "Storage rejected the poster's file type.";
  if (status === 409) return "A file already exists at that location. Please try again.";
  if (status === 400 && /signature|token|expired/i.test(message)) return "The upload link expired. Please submit again.";
  if (status === 401 || status === 403) return "Storage refused the upload. Please sign in again.";
  return `The poster upload failed (${status}${message ? `: ${message}` : ""}).`;
}

/**
 * Uploads directly from the browser to a one-time signed Storage URL, reporting
 * real upload progress. The body mirrors supabase-js `uploadToSignedUrl`.
 * The content type comes from the detected file signature, not the file name.
 */
export function uploadPosterToSignedUrl(options: {
  signedUrl: string;
  file: File;
  contentType: string;
  apiKey: string;
  onProgress: (fraction: number) => void;
}): Promise<void> {
  const { signedUrl, file, contentType, apiKey, onProgress } = options;

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", signedUrl);
    request.setRequestHeader("x-upsert", "false");
    if (apiKey) request.setRequestHeader("apikey", apiKey);

    request.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress(Math.min(0.99, event.loaded / event.total));
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(1);
        resolve();
      } else {
        reject(new PosterUploadError(describeStorageFailure(request.status, request.responseText)));
      }
    };
    request.onerror = () => reject(new PosterUploadError("Network error while uploading the poster. Check your connection and retry."));
    request.onabort = () => reject(new PosterUploadError("The upload was cancelled."));

    const body = new FormData();
    // Paths are never reused, so posters can be cached for a year.
    body.append("cacheControl", "31536000");
    body.append("", file.slice(0, file.size, contentType));
    request.send(body);
  });
}
