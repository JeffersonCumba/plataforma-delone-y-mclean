"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";

import { updateCourseSurveyLanguageAction } from "@/app/dashboard/cursos/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface QuestionnaireLanguageDialogProps {
  courseId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuestionnaireLanguageDialog({
  courseId,
  open,
  onOpenChange,
}: QuestionnaireLanguageDialogProps) {
  const t = useTranslations("courses");
  const common = useTranslations("common");
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
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("questionnaireLanguageTitle")}</DialogTitle>
          <DialogDescription>
            {t("questionnaireLanguageDescription")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Select
            value={language}
            onValueChange={(value) => setLanguage(value as SurveyLanguage)}
            disabled={isPending}
          >
            <SelectTrigger
              aria-label={t("surveyLanguageLabel")}
              className="w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="es">{t("surveyLanguages.es")}</SelectItem>
              <SelectItem value="en">{t("surveyLanguages.en")}</SelectItem>
              <SelectItem value="pt">{t("surveyLanguages.pt")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {common("cancel")}
          </Button>
          <Button type="button" onClick={updateLanguage} disabled={isPending}>
            {isPending ? <Spinner className="mr-2" /> : null}
            {t("updateQuestionnaireLanguage")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
