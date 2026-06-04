"use client";

import { Loader2, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface InterpretationPanelProps {
  text: string;
  isLoading: boolean;
  error: string | null;
  onClose?: () => void;
  className?: string;
}

function renderInlineMarkdown(input: string): React.ReactNode[] {
  const lines = input.split("\n");
  return lines.map((line, lineIndex) => {
    const trimmed = line.trimStart();
    const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("* ");
    const content = isBullet ? trimmed.slice(2) : trimmed;
    const parts: React.ReactNode[] = [];
    const regex = /\*\*(.+?)\*\*/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let keyIndex = 0;
    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }
      parts.push(
        <strong
          key={`b-${lineIndex}-${keyIndex}`}
          className="font-semibold text-slate-900"
        >
          {match[1]}
        </strong>,
      );
      lastIndex = regex.lastIndex;
      keyIndex += 1;
    }
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }
    if (parts.length === 0) {
      parts.push("\u00A0");
    }
    return (
      <span
        key={`line-${lineIndex}`}
        className={cn(
          "block",
          isBullet && "pl-3 relative before:absolute before:left-0 before:text-cyan-500 before:content-['•']",
        )}
      >
        {parts}
      </span>
    );
  });
}

export function InterpretationPanel({
  text,
  isLoading,
  error,
  onClose,
  className,
}: InterpretationPanelProps) {
  const hasContent = Boolean(text) || isLoading || Boolean(error);
  if (!hasContent) {
    return null;
  }

  return (
    <div
      className={cn(
        "mt-4 rounded-2xl border border-cyan-200/80 bg-linear-to-br from-white via-cyan-50/30 to-white p-4 shadow-sm",
        className,
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-cyan-700">
          <Sparkles className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">
            Interpretacion IA
          </span>
        </div>
        {onClose ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Cerrar interpretacion"
            title="Cerrar interpretacion"
            disabled={isLoading}
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {!error && isLoading && !text ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-cyan-600" />
          <span>Analizando los datos del curso...</span>
        </div>
      ) : null}

      {!error && text ? (
        <div className="space-y-1 text-sm leading-6 text-slate-700">
          {renderInlineMarkdown(text)}
          {isLoading ? (
            <span className="ml-0.5 inline-block h-3 w-1 translate-y-0.5 animate-pulse rounded-sm bg-cyan-500" />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
