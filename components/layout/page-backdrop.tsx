/** Lightweight decorative backdrop for inner pages (no WebGL). */
export function PageBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 bg-void-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_-5%,rgb(155_107_255/0.22),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_35%_at_90%_80%,rgb(45_226_245/0.08),transparent_70%)]" />
      <div className="pixel-grid-bg absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_75%)] opacity-50" />
    </div>
  );
}
