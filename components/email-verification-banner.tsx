"use client";

import { useState, useEffect, useRef } from "react";
import { Mail, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

type Step = "idle" | "sending" | "sent" | "verifying" | "verified" | "error";

const COOLDOWN_SECONDS = 60;

interface Props {
  email: string;
}

export function EmailVerificationBanner({ email }: Props) {
  const t = useTranslations("emailVerify");
  const [step, setStep] = useState<Step>("idle");
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const disabled = step === "sending" || step === "verifying" || cooldown > 0;

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  function startCooldown() {
    setCooldown(COOLDOWN_SECONDS);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleSendCode() {
    setStep("sending");
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send" }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.message);
        setStep("error");
        return;
      }
      toast.success(data.message);
      setStep("sent");
      startCooldown();
    } catch {
      toast.error(t("sendError"));
      setStep("error");
    }
  }

  async function handleVerify() {
    if (code.length !== 6) return;
    setStep("verifying");
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", code }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.message);
        setStep("sent");
        return;
      }
      toast.success(t("verifiedSuccess"));
      await new Promise((r) => setTimeout(r, 800));
      setStep("verified");
    } catch {
      toast.error(t("verifyError"));
      setStep("sent");
    }
  }

  if (step === "verified") return null;

  const showOtp = step === "sent" || step === "verifying";

  function sendButtonLabel() {
    if (step === "sending") return t("sending");
    if (cooldown > 0) return t("resendIn", { seconds: cooldown });
    if (showOtp) return t("resendCode");
    return t("sendCode");
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 animate-pulse" style={{ animationIterationCount: 1 }}>
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-200/40">
          {step === "verifying" ? (
            <RefreshCw className="h-5 w-5 text-neutral-700 animate-spin" />
          ) : (
            <Mail className="h-5 w-5 text-neutral-700" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-neutral-800">
            {t("title")}
          </h3>
          <p className="mt-1 text-sm text-neutral-700">
            {t.rich("description", {
              email,
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
            {step === "idle" && t("idleHint")}
          </p>
          {showOtp && (
            <p className="mt-1 text-xs text-gray-600">
              {t("spamHint")}
            </p>
          )}

          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-amber-300 text-slate-700 hover:bg-amber-100"
                onClick={handleSendCode}
                disabled={disabled}
              >
                {step === "sending" ? (
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Mail className="mr-1.5 h-3.5 w-3.5" />
                )}
                {sendButtonLabel()}
              </Button>
            </div>

            {showOtp && (
              <div className="space-y-3">
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={setCode}
                  onComplete={handleVerify}
                >
                  <InputOTPGroup className="bg-white rounded-md">
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleVerify}
                    disabled={code.length !== 6 || disabled}
                  >
                    {step === "verifying" ? (
                      <>
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        {t("validating")}
                      </>
                    ) : (
                      t("verify")
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-2">
            <a
              href="/dashboard/perfil"
              className="text-xs text-slate-500 underline underline-offset-2 hover:text-slate-700"
            >
              {t("wrongEmail")}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
