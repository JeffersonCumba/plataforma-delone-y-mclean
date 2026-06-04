"use client";

import { useCallback, useRef, useState } from "react";

import { type AnalyticsData } from "@/types/analytics";

interface InterpretationContext {
  courseId: number;
  courseName: string;
  analytics: AnalyticsData;
}

interface InterpretationState {
  text: string;
  isLoading: boolean;
  error: string | null;
}

interface InterpretationActions {
  interpret: (prompt: string) => Promise<void>;
  reset: () => void;
}

export function useInterpretation(
  ctx: InterpretationContext,
): InterpretationState & InterpretationActions {
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setText("");
    setError(null);
    setIsLoading(false);
  }, []);

  const interpret = useCallback(
    async (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed) {
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setText("");
      setError(null);
      setIsLoading(true);

      try {
        const response = await fetch("/api/interpret", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId: ctx.courseId,
            courseName: ctx.courseName,
            analytics: ctx.analytics,
            prompt: trimmed,
          }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          const payload = await response
            .json()
            .catch(() => ({ message: "Error al interpretar los datos" }));
          throw new Error(payload.message ?? "Error desconocido");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (!value) continue;
          accumulated += decoder.decode(value, { stream: true });
          setText(accumulated);
        }
        accumulated += decoder.decode();
        if (accumulated) setText(accumulated);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        setError(
          err instanceof Error ? err.message : "Error desconocido",
        );
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setIsLoading(false);
        }
      }
    },
    [ctx.analytics, ctx.courseId, ctx.courseName],
  );

  return { text, isLoading, error, interpret, reset };
}
