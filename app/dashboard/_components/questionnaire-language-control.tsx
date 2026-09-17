"use client";

import { useState, useTransition } from "react";
import { Languages } from "lucide-react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";

import { updateCourseSurveyLanguageAction } from "@/app/dashboard/cursos/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

type SurveyLanguage = "es" | "en" | "pt";

function isSurveyLanguage(value: string): value is SurveyLanguage {
  return value === "es" || value === "en" || value === "pt";
}

export function QuestionnaireLanguageControl({ courseId }: { courseId: number }) {
  const t = useTranslations("courses");
  const locale = useLocale();
  const [language, setLanguage] = useState<SurveyLanguage>(
    isSurveyLanguage(locale) ? locale : "es",
  );
  const [isPending, startTransition] = useTransition();

  const updateLanguage = () => {
    startTransition(async () => {
      const result = await updateCourseSurveyLanguageAction(courseId, language);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
    });
  };

  return (
    <Card className="border-slate-200/80 bg-white/95 shadow-sm">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <Languages className="size-5" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">{t("questionnaireLanguageTitle")}</p>
            <p className="mt-1 text-sm text-slate-600">{t("questionnaireLanguageDescription")}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={language} onValueChange={(value) => setLanguage(value as SurveyLanguage)} disabled={isPending}>
            <SelectTrigger aria-label={t("surveyLanguageLabel")} className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="es">{t("surveyLanguages.es")}</SelectItem>
              <SelectItem value="en">{t("surveyLanguages.en")}</SelectItem>
              <SelectItem value="pt">{t("surveyLanguages.pt")}</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" onClick={updateLanguage} disabled={isPending}>
            {isPending ? <Spinner className="mr-2" /> : null}
            {t("updateQuestionnaireLanguage")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
