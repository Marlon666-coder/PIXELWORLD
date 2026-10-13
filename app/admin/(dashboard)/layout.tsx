import { AdminHeader } from "@/components/admin/admin-header";
import { SetupNotice } from "@/components/competitions/gallery-states";
import { requireAdminPage } from "@/lib/auth/admin";
import { readPublicEnv } from "@/lib/env";

export default async function AdminDashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const env = readPublicEnv();
  if (!env.ok) {
    return (
      <main id="main" className="mx-auto max-w-3xl px-4 py-16">
        <SetupNotice problems={env.problems} />
      </main>
    );
  }

  // Server-side guard. Pages and Server Actions re-check too, and RLS enforces it in the database.
  const admin = await requireAdminPage("/admin");

  return (
    <>
      <AdminHeader email={admin.user.email} />
      <main id="main" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
    </>
  );
}
