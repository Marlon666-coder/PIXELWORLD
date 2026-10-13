import { PageBackdrop } from "@/components/layout/page-backdrop";

export default function CompetitionLoading() {
  return (
    <main id="main" className="relative pt-28 pb-24 sm:pt-32" aria-busy="true">
      <PageBackdrop />
      <div className="mx-auto max-w-7xl px-5 sm:px-8" role="status" aria-label="Loading quest">
        <div className="skeleton h-9 w-44" />
        <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-14">
          <div className="skeleton aspect-[3/4] w-full" />
          <div className="space-y-5">
            <div className="skeleton h-6 w-56" />
            <div className="skeleton h-14 w-full" />
            <div className="skeleton h-14 w-3/4" />
            <div className="skeleton h-6 w-1/2" />
            <div className="skeleton mt-8 h-40 w-full" />
            <div className="skeleton h-14 w-full" />
          </div>
        </div>
        <span className="sr-only">Loading quest…</span>
      </div>
    </main>
  );
}
