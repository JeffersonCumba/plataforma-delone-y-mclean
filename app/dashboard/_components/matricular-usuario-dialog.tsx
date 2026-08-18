/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { Search, UserPlus, UserRound } from "lucide-react";
import { toast } from "sonner";

import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MoodleCourse } from "@/types/course";
import {
  buscarUsuariosAction,
  matricularUsuarioAction,
} from "@/app/dashboard/encuestados/actions";
import type { MoodleUserSummary } from "@/types/encuestado";
import { useTranslations } from "next-intl";

interface MatricularUsuarioDialogProps {
  courses: MoodleCourse[];
  defaultCourseId?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
}

type Mode = "existing" | "new";

interface NewUserForm {
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  password: string;
}

const EMPTY_NEW_USER: NewUserForm = {
  username: "",
  firstname: "",
  lastname: "",
  email: "",
  password: "",
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function MatricularUsuarioDialog({
  courses,
  defaultCourseId,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
}: MatricularUsuarioDialogProps) {
  const t = useTranslations("matricular");
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (next: boolean) => {
    if (!isControlled) {
      setInternalOpen(next);
    }
    controlledOnOpenChange?.(next);
  };

  const [courseId, setCourseId] = useState<string>(
    defaultCourseId ? String(defaultCourseId) : "",
  );
  const [mode, setMode] = useState<Mode>("existing");

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<MoodleUserSummary[]>([]);
  const [selectedUser, setSelectedUser] = useState<MoodleUserSummary | null>(
    null,
  );

  const [newUser, setNewUser] = useState<NewUserForm>(EMPTY_NEW_USER);
  const [fieldErrors, setFieldErrors] = useState<Partial<NewUserForm>>({});

  const [submitting, startSubmit] = useTransition();
  const searchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) {
      setCourseId(defaultCourseId ? String(defaultCourseId) : "");
      setMode("existing");
      setQuery("");
      setResults([]);
      setHasSearched(false);
      setSelectedUser(null);
      setNewUser(EMPTY_NEW_USER);
      setFieldErrors({});
    }
  }, [open, defaultCourseId]);

  async function handleSearch() {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      toast.error(t("searchMinChars"));
      return;
    }

    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    setSearching(true);
    setHasSearched(true);
    setSelectedUser(null);
    try {
      const response = await buscarUsuariosAction(trimmed);
      if (!controller.signal.aborted) {
        if (response.ok) {
          setResults(response.users);
        } else {
          setResults([]);
          toast.error(response.message);
        }
      }
    } catch {
      if (!controller.signal.aborted) {
        setResults([]);
        toast.error(t("unexpectedSearchError"));
      }
    } finally {
      if (!controller.signal.aborted) {
        setSearching(false);
      }
    }
  }

  function validateNewUser(): boolean {
    const errors: Partial<NewUserForm> = {};
    if (!newUser.username.trim()) errors.username = t("required");
    if (!newUser.firstname.trim()) errors.firstname = t("required");
    if (!newUser.lastname.trim()) errors.lastname = t("required");
    if (!newUser.email.trim()) {
      errors.email = t("required");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser.email.trim())) {
      errors.email = t("invalidEmail");
    }
    if (!newUser.password) {
      errors.password = t("required");
    } else {
      const pwd = newUser.password;
      const ok =
        pwd.length >= 8 &&
        /[a-z]/.test(pwd) &&
        /[A-Z]/.test(pwd) &&
        /\d/.test(pwd) &&
        /[^A-Za-z0-9]/.test(pwd);
      if (!ok) {
        errors.password = t("passwordRequirements");
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit() {
    if (!courseId) {
      toast.error(t("selectCourseError"));
      return;
    }

    if (mode === "existing" && !selectedUser) {
      toast.error(t("selectUserError"));
      return;
    }

    if (mode === "new" && !validateNewUser()) {
      toast.error(t("checkFormError"));
      return;
    }

    startSubmit(async () => {
      const payload =
        mode === "existing"
          ? {
              courseId: Number(courseId),
              mode: "existing" as const,
              existingUserId: selectedUser!.id,
            }
          : {
              courseId: Number(courseId),
              mode: "new" as const,
              newUser: {
                username: newUser.username.trim(),
                firstname: newUser.firstname.trim(),
                lastname: newUser.lastname.trim(),
                email: newUser.email.trim().toLowerCase(),
                password: newUser.password,
              },
            };

      const result = await matricularUsuarioAction(payload);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      if (result.status === "already_enrolled") {
        toast.warning(result.message);
        return;
      }

      toast.success(result.message);
      setOpen(false);
    });
  }

  const canSubmit =
    !!courseId && !submitting && (mode === "existing" ? !!selectedUser : true);

  const showCourseSelect = !defaultCourseId;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-cyan-700" />
            {t("dialogTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("dialogDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          {showCourseSelect ? (
            <div className="space-y-2">
              <Label htmlFor="enroll-course">{t("courseDestination")}</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger
                  id="enroll-course"
                  className="h-11 w-full border-slate-300 bg-white text-sm"
                >
                  <SelectValue placeholder={t("selectCourse")} />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={String(course.id)}>
                      {course.fullname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="inline-flex w-full rounded-lg border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setMode("existing")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 hover:cursor-pointer py-2 text-sm font-medium transition-colors ${
                mode === "existing"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Search className="h-4 w-4" />
              {t("searchExisting")}
            </button>
            <button
              type="button"
              onClick={() => setMode("new")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 hover:cursor-pointer py-2 text-sm font-medium transition-colors ${
                mode === "new"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <UserPlus className="h-4 w-4" />
              {t("createNew")}
            </button>
          </div>

          {mode === "existing" ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="user-search">{t("searchUserLabel")}</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="user-search"
                      value={query}
                      onChange={(event) => {
                        setQuery(event.target.value);
                        setSelectedUser(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void handleSearch();
                        }
                      }}
                      placeholder={t("searchUserPlaceholder")}
                      className="h-11 pl-9 pr-9"
                      disabled={searching || submitting}
                    />
                    {searching ? (
                      <Spinner className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    onClick={handleSearch}
                    disabled={
                      searching || submitting || query.trim().length < 2
                    }
                    className="h-11"
                  >
                    {searching ? (
                      <Spinner className="mr-2" />
                    ) : (
                      <Search className="mr-2 h-4 w-4" />
                    )}
                    {t("search")}
                  </Button>
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                {!hasSearched ? (
                  <div className="px-4 py-6 text-center text-sm text-slate-500">
                    {t("searchHint")}
                  </div>
                ) : results.length === 0 && !searching ? (
                  <div className="px-4 py-6 text-center text-sm text-slate-500">
                    {t("noResults")}
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {results.map((user) => {
                      const isSelected = selectedUser?.id === user.id;
                      return (
                        <li key={user.id}>
                          <label
                            className={`flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors ${
                              isSelected ? "bg-green-50" : "hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={submitting}
                              onChange={() =>
                                setSelectedUser(isSelected ? null : user)
                              }
                              className="h-4 w-4 shrink-0 cursor-pointer rounded-sm border-slate-300 text-cyan-600 accent-cyan-600 focus:ring-cyan-500 disabled:cursor-not-allowed"
                              aria-label={t("selectUserAria", { name: user.fullname || user.username })}
                            />
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                                isSelected
                                  ? "bg-cyan-600 text-white"
                                  : "bg-slate-200 text-slate-700"
                              }`}
                            >
                              {getInitials(user.fullname || user.username)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-slate-900">
                                {user.fullname || user.username}
                              </span>
                              <span className="block truncate text-xs text-slate-500">
                                {user.email || t("noEmail")}
                              </span>
                            </span>
                            <span className="shrink-0 text-xs text-slate-500">
                              @{user.username}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="nu-username">{t("usernameLabel")}</Label>
                <Input
                  id="nu-username"
                  value={newUser.username}
                  onChange={(event) =>
                    setNewUser((current) => ({
                      ...current,
                      username: event.target.value,
                    }))
                  }
                  placeholder={t("usernamePlaceholder")}
                  disabled={submitting}
                />
                {fieldErrors.username ? (
                  <p className="text-xs text-rose-600">
                    {fieldErrors.username}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nu-firstname">{t("firstNameLabel")}</Label>
                <Input
                  id="nu-firstname"
                  value={newUser.firstname}
                  onChange={(event) =>
                    setNewUser((current) => ({
                      ...current,
                      firstname: event.target.value,
                    }))
                  }
                  placeholder={t("firstNamePlaceholder")}
                  disabled={submitting}
                />
                {fieldErrors.firstname ? (
                  <p className="text-xs text-rose-600">
                    {fieldErrors.firstname}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nu-lastname">{t("lastNameLabel")}</Label>
                <Input
                  id="nu-lastname"
                  value={newUser.lastname}
                  onChange={(event) =>
                    setNewUser((current) => ({
                      ...current,
                      lastname: event.target.value,
                    }))
                  }
                  placeholder={t("lastNamePlaceholder")}
                  disabled={submitting}
                />
                {fieldErrors.lastname ? (
                  <p className="text-xs text-rose-600">
                    {fieldErrors.lastname}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="nu-email">{t("emailLabel")}</Label>
                <Input
                  id="nu-email"
                  type="email"
                  value={newUser.email}
                  onChange={(event) =>
                    setNewUser((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder={t("emailPlaceholder")}
                  disabled={submitting}
                />
                {fieldErrors.email ? (
                  <p className="text-xs text-rose-600">{fieldErrors.email}</p>
                ) : null}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="nu-password">{t("passwordLabel")}</Label>
                <Input
                  id="nu-password"
                  type="password"
                  value={newUser.password}
                  onChange={(event) =>
                    setNewUser((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  placeholder={t("passwordPlaceholder")}
                  disabled={submitting}
                />
                {fieldErrors.password ? (
                  <p className="text-xs text-rose-600">
                    {fieldErrors.password}
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {submitting ? (
              <Spinner className="mr-2" />
            ) : (
              <UserRound className="mr-2 h-4 w-4" />
            )}
            {submitting ? t("enrolling") : t("matricular")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
