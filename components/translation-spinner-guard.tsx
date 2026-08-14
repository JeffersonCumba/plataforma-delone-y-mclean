"use client";

import { useEffect } from "react";

import { isTranslationActive } from "@/components/google-translate-widget";

function hideInjectedNodes(root: ParentNode): void {
  const selectors = [
    "body > .skiptranslate",
    ".goog-te-spinner-pos",
    ".goog-te-spinner",
    ".goog-te-spinner-animation",
    ".goog-te-spinner-path",
    ".goog-te-banner-frame",
    "iframe.goog-te-banner-frame",
  ];

  for (const selector of selectors) {
    for (const node of Array.from(root.querySelectorAll(selector))) {
      const element = node as HTMLElement;
      element.style.setProperty("display", "none", "important");
    }
  }
}

export function TranslationSpinnerGuard() {
  useEffect(() => {
    if (!isTranslationActive()) return;

    hideInjectedNodes(document);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node instanceof HTMLElement) {
            if (
              node.matches(
                ".goog-te-spinner-pos, .goog-te-spinner, .skiptranslate",
              ) ||
              node.matches(".goog-te-banner-frame")
            ) {
              node.style.setProperty("display", "none", "important");
            }
            hideInjectedNodes(node);
          }
        }
      }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}