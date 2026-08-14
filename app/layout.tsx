import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TranslationNavigationGuard } from "@/components/translation-navigation-guard";
import { TranslationSpinnerGuard } from "@/components/translation-spinner-guard";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Evaluacion DeLone y McLean",
  description: "Plataforma de evaluacion de software integrada con Moodle",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geistSans.className} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <TranslationNavigationGuard />
        <TranslationSpinnerGuard />
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
