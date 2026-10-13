import Link from "next/link";
import { PageBackdrop } from "./page-backdrop";

export function LostLevel({ title, message }: { title: string; message: string }) {
  return (
    <main id="main" className="relative flex min-h-[80vh] items-center justify-center px-5 pt-28 pb-20">
      <PageBackdrop />
      <div className="panel scanlines w-full max-w-xl px-6 py-14 text-center sm:px-12">
        <p className="hud-label text-neon-magenta">Error 404</p>
        <h1 className="mt-4 font-display text-4xl font-bold sm:text-5xl">{title}</h1>
        <p className="mt-4 text-mist">{message}</p>
        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/#explore" className="btn btn-primary">
            Explore competitions
          </Link>
          <Link href="/" className="btn btn-secondary">
            Back to base
          </Link>
        </div>
      </div>
    </main>
  );
}
