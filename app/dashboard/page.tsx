import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CoursesGrid } from "@/app/dashboard/_components/courses-grid";
import { obtenerCursosProfesor } from "@/services/courseService";

export default async function DashboardIndexPage() {
  const cookieStore = await cookies();
  const userIdCookie = cookieStore.get("user_id")?.value;
  const userId = Number(userIdCookie);

  if (!Number.isInteger(userId) || userId <= 0) {
    return redirect("/login");
  }
 
  return redirect("/dashboard/cursos"); 
}
