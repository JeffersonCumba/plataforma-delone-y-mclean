"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { type AnalyticsData } from "@/types/analytics";

interface InterpretationContext {
  courseId: number;
  courseName: string;
  analytics: AnalyticsData;
  slot: string;
}

export interface InterpretationHandle {
  text: string;
  isLoading: boolean;
  error: string | null;
  interpret: (prompt: string) => Promise<string>;
  reset: () => void;
}

const STORAGE_PREFIX = "dm-interpretation:";

function buildStorageKey(courseId: number, slot: string): string {
  return `${STORAGE_PREFIX}${courseId}:${slot}`;
}

function readPersistedText(courseId: number, slot: string): string {
  if (typeof window === "undefined") return "";
  try {
    return window.sessionStorage.getItem(buildStorageKey(courseId, slot)) ?? "";
  } catch {
    return "";
  }
}

function writePersistedText(
  courseId: number,
  slot: string,
  text: string,
): void {
  if (typeof window === "undefined") return;
  try {
    const key = buildStorageKey(courseId, slot);
    if (text) {
      window.sessionStorage.setItem(key, text);
    } else {
      window.sessionStorage.removeItem(key);
    }
  } catch {
    // ignore quota or disabled storage
  }
}

export function useInterpretation(
  ctx: InterpretationContext,
): InterpretationHandle {
  const { courseId, slot } = ctx;
  const [text, setText] = useState(() => readPersistedText(courseId, slot));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    writePersistedText(courseId, slot, text);
  }, [text, courseId, slot]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setText("");
    setError(null);
    setIsLoading(false);
  }, []);

  const interpret = useCallback(
    async (prompt: string): Promise<string> => {
      const trimmed = prompt.trim();
      if (!trimmed) {
        return "";
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
        return accumulated;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return "";
        }
        setError(err instanceof Error ? err.message : "Error desconocido");
        throw err;
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
