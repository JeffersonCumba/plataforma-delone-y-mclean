import { z } from "zod";

import { type Locale } from "@/i18n/locales";
import { translateError } from "@/lib/errors";

const MOODLE_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const MOODLE_USERNAME_REGEX = /^[a-z0-9\-_.@]+$/;

export function moodlePasswordSchema(locale: Locale) {
  return z
    .string()
    .regex(
      MOODLE_PASSWORD_REGEX,
      translateError(locale, "validation.passwordRequirements"),
    );
}

export function registerUserSchema(locale: Locale) {
  return z.object({
    username: usernameField(locale),
    firstname: z.string().trim().min(1, translateError(locale, "validation.firstnameRequired")),
    lastname: z.string().trim().min(1, translateError(locale, "validation.lastnameRequired")),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email(translateError(locale, "validation.emailInvalid")),
    password: moodlePasswordSchema(locale),
  });
}

export type RegisterUserInput = z.infer<ReturnType<typeof registerUserSchema>>;

export function studentInputSchema(locale: Locale) {
  return z.object({
    username: usernameField(locale),
    firstname: z.string().trim().min(1, translateError(locale, "validation.firstnameRequired")),
    lastname: z.string().trim().min(1, translateError(locale, "validation.lastnameRequired")),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email(translateError(locale, "validation.emailInvalid")),
    password: moodlePasswordSchema(locale),
  });
}

export type StudentInput = z.infer<ReturnType<typeof studentInputSchema>>;

function usernameField(locale: Locale) {
  return z
    .string()
    .trim()
    .min(1, translateError(locale, "validation.usernameRequired"))
    .regex(
      MOODLE_USERNAME_REGEX,
      translateError(locale, "validation.usernameInvalidChars"),
    );
}