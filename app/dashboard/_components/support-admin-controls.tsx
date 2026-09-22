"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { updateSupportTicketAction } from "@/app/dashboard/ayuda/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SupportPriority, SupportStatus } from "@/types/support";

export function SupportAdminControls({
  ticketId,
  initialStatus,
  initialPriority,
}: {
  ticketId: number;
  initialStatus: SupportStatus;
  initialPriority: SupportPriority;
}) {
  const t = useTranslations("support");
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [priority, setPriority] = useState(initialPriority);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    try {
      const result = await updateSupportTicketAction({ ticketId, status, priority });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t("statusLabel")}</Label>
        <Select value={status} onValueChange={(value) => setStatus(value as SupportStatus)}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="OPEN">{t("statuses.OPEN")}</SelectItem>
            <SelectItem value="IN_PROGRESS">{t("statuses.IN_PROGRESS")}</SelectItem>
            <SelectItem value="RESOLVED">{t("statuses.RESOLVED")}</SelectItem>
            <SelectItem value="CLOSED">{t("statuses.CLOSED")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>{t("priorityLabel")}</Label>
        <Select value={priority} onValueChange={(value) => setPriority(value as SupportPriority)}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="LOW">{t("priorities.LOW")}</SelectItem>
            <SelectItem value="MEDIUM">{t("priorities.MEDIUM")}</SelectItem>
            <SelectItem value="HIGH">{t("priorities.HIGH")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={handleSave} disabled={isSaving} className="w-full gap-2">
        <Save className="h-4 w-4" />
        {isSaving ? t("saving") : t("saveChanges")}
      </Button>
    </div>
  );
}
