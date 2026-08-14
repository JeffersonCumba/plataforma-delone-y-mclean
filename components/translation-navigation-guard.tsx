"use client";

import { useEffect } from "react";

import { isTranslationActive } from "@/components/google-translate-widget";

function isInternalLink(href: string): boolean {
  if (!href || href.startsWith("#")) return false;
  if (href.startsWith("mailto:") || href.startsWith("tel:")) return false;
  if (href.startsWith("http://") || href.startsWith("https://")) {
    try {
      const url = new URL(href);
      return url.origin === window.location.origin;
    } catch {
      return false;
    }
  }
  return true;
}

function handleClick(event: MouseEvent): void {
  if (!isTranslationActive()) return;

  const target = event.target as Element | null;
  const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
  if (!anchor) return;
  if (anchor.target === "_blank") return;
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }

  const href = anchor.getAttribute("href") ?? "";
  if (!isInternalLink(href)) return;

  event.preventDefault();
  event.stopPropagation();
  window.location.href = anchor.href;
}

export function TranslationNavigationGuard() {
  useEffect(() => {
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return null;
}