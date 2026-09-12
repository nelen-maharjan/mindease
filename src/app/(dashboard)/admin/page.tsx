import { getAdminUser } from "@/lib/admin";
import { redirect } from "next/navigation";
import { AdminDashboardClient } from "./admin-client";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/dashboard");

  return (
    <AdminDashboardClient
      adminName={admin.user.name || admin.user.email}
      adminId={admin.user.id}
    />
  );
}
