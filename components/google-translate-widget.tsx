"use client";

import { useEffect, useState } from "react";
import { parseCookies, setCookie } from "nookies";

const COOKIE_NAME = "googtrans";

interface LanguageDescriptor {
  name: string;
  title: string;
}

declare global {
  interface GlobalThis {
    __GOOGLE_TRANSLATION_CONFIG__: {
      languages: LanguageDescriptor[];
      defaultLanguage: string;
    };
  }
}

function GoogleTranslateWidget() {
  const [currentLanguage, setCurrentLanguage] = useState<string | undefined>(
    undefined,
  );

  const [languageConfig, setLanguageConfig] = useState<
    { languages: LanguageDescriptor[]; defaultLanguage: string } | undefined
  >(undefined);

  useEffect(() => {
    const cookies = parseCookies();
    const existingLanguageCookieValue = cookies[COOKIE_NAME];

    let languageValue: string | undefined;
    if (existingLanguageCookieValue) {
      const sp = existingLanguageCookieValue.split("/");
      if (sp.length > 2) {
        languageValue = sp[2];
      }
    }
    const gw = globalThis as unknown as {
      __GOOGLE_TRANSLATION_CONFIG__?: {
        languages: LanguageDescriptor[];
        defaultLanguage: string;
      };
    };
    const cfg:
      | { languages: LanguageDescriptor[]; defaultLanguage: string }
      | undefined = gw.__GOOGLE_TRANSLATION_CONFIG__;

    const applyCfg = (
      c:
        | { languages: LanguageDescriptor[]; defaultLanguage: string }
        | undefined,
    ) => {
      if (c && !languageValue) {
        languageValue = c.defaultLanguage;
      }
      if (languageValue) setCurrentLanguage(languageValue);
      setLanguageConfig(c);
    };

    const injectScript = (id: string, src: string) =>
      new Promise<void>((resolve, reject) => {
        const existing = document.getElementById(id) as HTMLScriptElement | null;

        if (existing) {
          if (existing.dataset.loaded === "true") {
            resolve();
            return;
          }

          existing.addEventListener("load", () => resolve(), { once: true });
          existing.addEventListener("error", () => reject(), { once: true });
          return;
        }

        const script = document.createElement("script");
        script.id = id;
        script.src = src;
        script.async = true;
        script.onload = () => {
          script.dataset.loaded = "true";
          resolve();
        };
        script.onerror = () => reject();
        document.body.appendChild(script);
      });

    const ensureGoogleTranslateScripts = async () => {
      try {
        if (!gw.__GOOGLE_TRANSLATION_CONFIG__) {
          await injectScript("gt-lang-config-script", "/assets/lang-config.js");
        }

        const nextCfg = gw.__GOOGLE_TRANSLATION_CONFIG__;
        if (nextCfg) {
          applyCfg(nextCfg);
        }

        await injectScript("gt-translation-script", "/assets/translation.js");
        await injectScript(
          "gt-google-translate-script",
          "https://translate.google.com/translate_a/element.js?cb=TranslateInit",
        );
      } catch {
        console.warn("GoogleTranslateWidget: failed to initialize translate scripts");
      }
    };

    if (cfg) {
      applyCfg(cfg);
    }

    void ensureGoogleTranslateScripts();
  }, []);

  if (!currentLanguage || !languageConfig) {
    return null;
  }

  const switchLanguage = (lang: string) => () => {
    setCookie(null, COOKIE_NAME, "/auto/" + lang);
    if (typeof window !== "undefined") window.location.reload();
  };

  const handleLanguageChange = (lang: string) => {
    switchLanguage(lang)();
  };

  return (
    <div className="notranslate flex items-center gap-3">
      <span className="hidden text-xs font-medium uppercase tracking-[0.18em] text-slate-500 sm:inline">
        Idioma
      </span>

      <div className="relative">
        <select
          aria-label="Seleccionar idioma"
          className="h-9 w-[175px] appearance-none rounded-md border border-slate-200 bg-white px-3 pr-9 text-sm text-slate-700 shadow-sm outline-none transition-colors focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
          value={currentLanguage}
          onChange={(event) => handleLanguageChange(event.target.value)}
        >
          {languageConfig.languages.map((ld: LanguageDescriptor) => (
            <option key={ld.name} value={ld.name}>
              {ld.title}
            </option>
          ))}
        </select>

        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
        >
          <path
            d="M5.5 7.5L10 12l4.5-4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

export { GoogleTranslateWidget, COOKIE_NAME };
