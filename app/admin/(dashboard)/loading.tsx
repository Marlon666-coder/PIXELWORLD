export default function AdminLoading() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading">
      <div className="skeleton h-12 w-64" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="skeleton h-32" />
        ))}
      </div>
      <div className="skeleton h-72" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
