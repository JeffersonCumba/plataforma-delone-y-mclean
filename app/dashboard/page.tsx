import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardIndexPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("user_role")?.value;

  if (!role) {
    redirect("/login");
  }

  if (role === "ADMIN") {
    redirect("/dashboard/admin");
  }

  redirect("/dashboard/evaluador");
}
