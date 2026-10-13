"use client";

/** Last-resort boundary (replaces the root layout), so it must render its own <html>. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#04030b", color: "#f4f6ff", fontFamily: "system-ui, sans-serif" }}>
        <div role="alert" style={{ textAlign: "center", padding: 24 }}>
          <p style={{ letterSpacing: "0.3em", fontSize: 12, color: "#ff5c7a" }}>SYSTEM FAILURE</p>
          <h1 style={{ fontSize: 36, margin: "12px 0" }}>PIXEL QUEST could not load</h1>
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: 16, padding: "12px 20px", background: "#6a3cf0", color: "#fff", border: 0, cursor: "pointer", letterSpacing: "0.15em" }}
          >
            TRY AGAIN
          </button>
        </div>
      </body>
    </html>
  );
}
