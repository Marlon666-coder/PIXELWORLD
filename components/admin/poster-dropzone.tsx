"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import { CloudUpload, FileImage, X } from "lucide-react";
import type { ImageInfo } from "@/lib/images/image-inspection";
import { cn, formatBytes } from "@/lib/utils";

export interface SelectedPoster {
  file: File;
  previewUrl: string;
  info: ImageInfo;
}

interface PosterDropzoneProps {
  selected: SelectedPoster | null;
  existingUrl: string | null;
  error: string | null;
  disabled: boolean;
  maxBytes: number;
  checking: boolean;
  onFile: (file: File) => void;
  onClear: () => void;
}

export function PosterDropzone({ selected, existingUrl, error, disabled, maxBytes, checking, onFile, onClear }: PosterDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const hintId = useId();
  const errorId = useId();

  const pick = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFile(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (!disabled) pick(event.dataTransfer.files);
  };

  const previewSrc = selected?.previewUrl ?? existingUrl;

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        data-dragging={dragging ? "true" : undefined}
        className={cn(
          "panel relative grid gap-5 p-4 transition-colors sm:grid-cols-[11rem_1fr] sm:p-5",
          dragging && "bg-void-700/80 [--pixel-border:var(--color-neon-cyan)]",
          error && "[--pixel-border:var(--color-danger)]",
        )}
      >
        <div className="relative mx-auto flex aspect-[3/4] w-full max-w-44 items-center justify-center overflow-hidden bg-void-950 pixel-grid-bg">
          {previewSrc ? (
            // Local blob: previews and the current poster thumbnail; not worth optimizing.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewSrc} alt={selected ? "Preview of the selected poster" : "Current poster"} className="size-full object-contain" />
          ) : (
            <FileImage className="size-10 text-mist-dim" aria-hidden="true" />
          )}
        </div>

        <div className="flex flex-col justify-center gap-3">
          <div>
            <p className="font-semibold text-ink">
              {selected ? "New poster selected" : existingUrl ? "Current poster" : "Upload the competition poster"}
            </p>
            <p id={hintId} className="mt-1 text-sm text-mist">
              Drag &amp; drop or choose a file. JPEG, PNG or WebP · up to {formatBytes(maxBytes)}. The original aspect ratio is preserved.
            </p>
          </div>

          {selected && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-xs text-mist">
              <dt className="text-mist-dim">File</dt>
              <dd className="truncate">{selected.file.name}</dd>
              <dt className="text-mist-dim">Type</dt>
              <dd>{selected.info.mimeType}</dd>
              <dt className="text-mist-dim">Size</dt>
              <dd>
                {formatBytes(selected.file.size)} · {selected.info.width}×{selected.info.height}px
              </dd>
            </dl>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-secondary btn-sm" disabled={disabled || checking} onClick={() => inputRef.current?.click()}>
              <CloudUpload className="size-4" aria-hidden="true" />
              {checking ? "Checking…" : selected || existingUrl ? "Replace poster" : "Choose poster"}
            </button>
            {selected && (
              <button type="button" className="btn btn-ghost btn-sm" disabled={disabled} onClick={onClear}>
                <X className="size-4" aria-hidden="true" />
                {existingUrl ? "Keep current poster" : "Remove"}
              </button>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            name="poster"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            tabIndex={-1}
            aria-label="Poster image file"
            aria-describedby={error ? `${hintId} ${errorId}` : hintId}
            aria-invalid={error ? true : undefined}
            disabled={disabled}
            onChange={(event) => pick(event.target.files)}
            data-testid="poster-input"
          />
        </div>
      </div>
      {error && (
        <p id={errorId} role="alert" className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
