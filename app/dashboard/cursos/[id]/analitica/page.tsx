import { redirect } from "next/navigation";

export default async function CourseAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dashboard/cursos/${id}`);
}
