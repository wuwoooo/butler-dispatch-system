import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AdminShell } from "@/components/layout/AdminShell";

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return <AdminShell currentUser={user}>{children}</AdminShell>;
}
