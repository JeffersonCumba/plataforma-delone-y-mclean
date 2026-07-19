import { z } from "zod";

const MOODLE_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const moodlePasswordSchema = z
  .string()
  .regex(
    MOODLE_PASSWORD_REGEX,
    "La contraseña debe tener al menos 8 caracteres, mayúscula, minúscula, número y carácter especial",
  );

const MOODLE_USERNAME_REGEX = /^[a-z0-9\-_.@]+$/;

const usernameField = z
  .string()
  .trim()
  .min(1, "El usuario es obligatorio")
  .regex(
    MOODLE_USERNAME_REGEX,
    "El usuario solo puede contener minúsculas, números y los caracteres - _ . @",
  );

export const registerUserSchema = z.object({
  username: usernameField,
  firstname: z.string().trim().min(1, "El nombre es obligatorio"),
  lastname: z.string().trim().min(1, "El apellido es obligatorio"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Ingresa un correo electrónico válido"),
  password: moodlePasswordSchema,
});

export type RegisterUserInput = z.infer<typeof registerUserSchema>;

export const studentInputSchema = z.object({
  username: usernameField,
  firstname: z.string().trim().min(1, "El nombre es obligatorio"),
  lastname: z.string().trim().min(1, "El apellido es obligatorio"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Ingresa un correo electrónico válido"),
  password: moodlePasswordSchema,
});

export type StudentInput = z.infer<typeof studentInputSchema>;
