import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { AnimatedHeading } from "@/components/animated-heading";
import { LanguageSwitcher } from "@/components/language-switcher";

export default async function Home() {
  const t = await getTranslations("landing");

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(2,6,23,0.08),transparent_34%),radial-gradient(circle_at_80%_10%,rgba(15,23,42,0.08),transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] text-slate-950">
      <div className="pointer-events-none absolute inset-0 opacity-40 bg-[linear-gradient(rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.06)_1px,transparent_1px)] bg-size-[72px_72px]" />
      <section className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center px-6 py-10 lg:px-8">
        <div className="max-w-3xl">
          <div className="mb-8">
            <LanguageSwitcher hideLabel />
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-slate-900" />
            {t("badge")}
          </div>

          <AnimatedHeading className="mt-6 text-balance text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-[55px]">
            {t("heading")}
          </AnimatedHeading>

          <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-slate-600 sm:text-xl">
            {t("description")}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="px-5" size="lg">
              <Link href="/login">
                {t("login")}
                <ChevronRight className="ml-1 h-4 w-4 transition-transform duration-300 group-hover/button:translate-x-1" />
              </Link>
            </Button>
            <Button asChild className="px-5" variant="outline" size="lg">
              <Link href="/register">{t("register")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
