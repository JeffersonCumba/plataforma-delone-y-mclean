"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { addSupportMessageAction } from "@/app/dashboard/ayuda/actions";
import { Button } from "@/components/ui/button";

export function SupportMessageForm({ ticketId }: { ticketId: number }) {
  const t = useTranslations("support");
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const result = await addSupportMessageAction({ ticketId, message });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setMessage("");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder={t("replyPlaceholder")}
        maxLength={3000}
        rows={4}
        disabled={isSubmitting}
        required
        className="flex w-full resize-y rounded-md border border-input bg-white px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-slate-400">{message.length}/3000</span>
        <Button type="submit" size="sm" disabled={isSubmitting} className="gap-2">
          <Send className="h-4 w-4" />
          {isSubmitting ? t("sending") : t("sendReply")}
        </Button>
      </div>
    </form>
  );
}
