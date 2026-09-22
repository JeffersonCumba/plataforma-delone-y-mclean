"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LifeBuoy, Send } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { createSupportTicketAction } from "@/app/dashboard/ayuda/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SupportPriority, SupportType } from "@/types/support";

export function SupportTicketForm({ contextUrl }: { contextUrl?: string }) {
  const t = useTranslations("support");
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [type, setType] = useState<SupportType>("QUESTION");
  const [priority, setPriority] = useState<SupportPriority>("MEDIUM");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const result = await createSupportTicketAction({
        type,
        priority,
        subject,
        description,
        contextUrl: contextUrl || null,
      });
      if (!result.ok || !result.ticketId) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.push(`/dashboard/ayuda/${result.ticketId}`);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="support-type">{t("typeLabel")}</Label>
          <Select value={type} onValueChange={(value) => setType(value as SupportType)}>
            <SelectTrigger id="support-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BUG">{t("types.BUG")}</SelectItem>
              <SelectItem value="ERROR">{t("types.ERROR")}</SelectItem>
              <SelectItem value="QUESTION">{t("types.QUESTION")}</SelectItem>
              <SelectItem value="SUGGESTION">{t("types.SUGGESTION")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="support-priority">{t("priorityLabel")}</Label>
          <Select
            value={priority}
            onValueChange={(value) => setPriority(value as SupportPriority)}
          >
            <SelectTrigger id="support-priority" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LOW">{t("priorities.LOW")}</SelectItem>
              <SelectItem value="MEDIUM">{t("priorities.MEDIUM")}</SelectItem>
              <SelectItem value="HIGH">{t("priorities.HIGH")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="support-subject">{t("subjectLabel")}</Label>
        <Input
          id="support-subject"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder={t("subjectPlaceholder")}
          maxLength={160}
          disabled={isSubmitting}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="support-description">{t("descriptionLabel")}</Label>
        <textarea
          id="support-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t("descriptionPlaceholder")}
          maxLength={5000}
          rows={7}
          disabled={isSubmitting}
          required
          className="flex w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <p className="text-right text-xs text-slate-400">{description.length}/5000</p>
      </div>

      {contextUrl && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {t("originPage")}: <span className="font-medium">{contextUrl}</span>
        </div>
      )}

      <Button type="submit" disabled={isSubmitting} className="gap-2">
        {isSubmitting ? <LifeBuoy className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {isSubmitting ? t("sending") : t("sendRequest")}
      </Button>
    </form>
  );
}
