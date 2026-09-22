"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Link2, MoreVertical, Pencil, Trash2, UserPlus } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

import { copyMoodleLoginLink } from "@/lib/survey-link";
import {
  deleteCourseAction,
  updateCourseNameAction,
} from "@/app/dashboard/cursos/actions";
import { MatricularUsuarioDialog } from "@/app/dashboard/_components/matricular-usuario-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderClosed } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MoodleCourse } from "@/types/course";

function cleanSummary(summary: string | undefined, noDescription: string): string {
  if (!summary) {
    return noDescription;
  }

  return summary.replace(/<[^>]*>/g, "").trim() || noDescription;
}

export function CourseCard({ course }: { course: MoodleCourse }) {
  const router = useRouter();
  const t = useTranslations("courseCard");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [renamedCourse, setRenamedCourse] = useState<{
    originalName: string;
    updatedName: string;
  } | null>(null);
  const [newCourseName, setNewCourseName] = useState(course.fullname);
  const [isDeleting, startDeletingTransition] = useTransition();
  const [isRenaming, startRenamingTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const courseName =
    renamedCourse?.originalName === course.fullname
      ? renamedCourse.updatedName
      : course.fullname;

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const handleRenameCourse = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    startRenamingTransition(async () => {
      const result = await updateCourseNameAction(course.id, {
        fullname: newCourseName,
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      const updatedName = result.fullname ?? newCourseName.trim();
      setRenamedCourse({
        originalName: course.fullname,
        updatedName,
      });
      setNewCourseName(updatedName);
      toast.success(result.message);
      setIsRenameDialogOpen(false);
      router.refresh();
    });
  };

  const handleDeleteCourse = () => {
    startDeletingTransition(async () => {
      const result = await deleteCourseAction(course.id);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setIsDeleteDialogOpen(false);
      setIsMenuOpen(false);
      router.refresh();
    });
  };

  return (
    <div ref={menuRef} className="relative group">
      <button
        type="button"
        className="absolute right-3 top-3 z-20 p-2 rounded-md text-slate-600 hover:shadow-sm hover:cursor-pointer hover:text-slate-950"
        aria-label={t("optionsFor", { name: courseName })}
        onClick={() => setIsMenuOpen((current) => !current)}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isMenuOpen ? (
        <div className="absolute right-3 top-12 z-30 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
          <Link
            href={`/dashboard/cursos/${course.id}`}
            onClick={() => setIsMenuOpen(false)}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950"
          >
            <ExternalLink className="h-4 w-4" />
            {t("viewCourse")}
          </Link>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:cursor-pointer"
            onClick={() => {
              setIsMenuOpen(false);
              setNewCourseName(courseName);
              setIsRenameDialogOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
            {t("renameCourse")}
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:cursor-pointer"
            onClick={() => {
              setIsMenuOpen(false);
              setIsEnrollDialogOpen(true);
            }}
          >
            <UserPlus className="h-4 w-4" />
            {t("matricularUser")}
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:cursor-pointer"
            onClick={async () => {
              setIsMenuOpen(false);
              await copyMoodleLoginLink();
            }}
          >
            <Link2 className="h-4 w-4" />
            {t("copyLink")}
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-50 hover:cursor-pointer"
            onClick={() => {
              setIsMenuOpen(false);
              setIsDeleteDialogOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4" />
            {t("deleteCourse")}
          </button>
        </div>
      ) : null}

      <Link
        href={`/dashboard/cursos/${course.id}`}
        className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/70"
      >
        <Card className="h-full border-slate-200/80 bg-white/90 transition-colors group-hover:border-slate-300">
          <CardHeader className="space-y-3 pr-14">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-900">
              <FolderClosed className="h-5 w-5" />
            </div>
            <CardTitle className="line-clamp-2 text-lg leading-6">
              {courseName}
            </CardTitle>
            <p className="text-xs text-slate-500">{course.shortname}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="line-clamp-3 text-sm text-slate-600">
              {cleanSummary(course.summary, t("noDescription"))}
            </p>
            <p className="text-sm font-medium text-slate-700 hover:underline hover:text-cyan-700">{t("viewSummary")}</p>
          </CardContent>
        </Card>
      </Link>

      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("renameDialogTitle")}</DialogTitle>
            <DialogDescription>{t("renameDialogDescription")}</DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={handleRenameCourse}>
            <div className="space-y-2">
              <Label htmlFor={`course-name-${course.id}`}>
                {t("courseNameLabel")}
              </Label>
              <Input
                id={`course-name-${course.id}`}
                value={newCourseName}
                onChange={(event) => setNewCourseName(event.target.value)}
                minLength={5}
                maxLength={100}
                disabled={isRenaming}
                autoFocus
                required
              />
              <p className="text-xs text-slate-500">
                {t("shortNameUnchanged", { shortname: course.shortname })}
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRenameDialogOpen(false)}
                disabled={isRenaming}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isRenaming}>
                {isRenaming ? (
                  <>
                    <Spinner className="mr-2" />
                    {t("renaming")}
                  </>
                ) : (
                  t("saveName")
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("deleteDialogDescription", { name: courseName })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteCourse}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Spinner className="mr-2" />
                  {t("deleting")}
                </>
              ) : (
                t("deleteDialogTitle")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MatricularUsuarioDialog
        courses={[course]}
        defaultCourseId={course.id}
        open={isEnrollDialogOpen}
        onOpenChange={setIsEnrollDialogOpen}
      />
    </div>
  );
}
