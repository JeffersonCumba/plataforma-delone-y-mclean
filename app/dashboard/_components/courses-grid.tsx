import { Card, CardContent } from "@/components/ui/card";
import type { MoodleCourse } from "@/types/course";
import { CourseCard } from "@/app/dashboard/_components/course-card";
import { getTranslations } from "next-intl/server";

export async function CoursesGrid({
  courses,
  limit,
}: {
  courses: MoodleCourse[];
  limit?: number;
}) {
  const t = await getTranslations("courses");
  const visibleCourses =
    typeof limit === "number" ? courses.slice(0, limit) : courses;

  if (visibleCourses.length === 0) {
    return (
      <Card className="border-dashed border-slate-300 bg-white/80">
        <CardContent className="py-10 text-center text-slate-600">
          {t("noCourses")}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 animate-fade-up-stagger">
      {visibleCourses.map((curso) => (
        <CourseCard key={curso.id} course={curso} />
      ))}
    </div>
  );
}
