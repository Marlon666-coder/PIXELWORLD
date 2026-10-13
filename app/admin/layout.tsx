import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · PIXEL QUEST Admin" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="relative min-h-svh bg-void-950">
      <div aria-hidden="true" className="pixel-grid-bg pointer-events-none fixed inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_60%)] opacity-35" />
      <div className="relative">{children}</div>
    </div>
  );
}
