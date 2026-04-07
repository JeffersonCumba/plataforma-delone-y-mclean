import { z } from "zod";

const MOODLE_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const moodlePasswordSchema = z
  .string()
  .regex(
    MOODLE_PASSWORD_REGEX,
    "La contrasena debe tener al menos 8 caracteres, mayuscula, minuscula, numero y caracter especial",
  );

export const registerUserSchema = z.object({
  username: z.string().trim().min(1, "El usuario es obligatorio"),
  firstname: z.string().trim().min(1, "El nombre es obligatorio"),
  lastname: z.string().trim().min(1, "El apellido es obligatorio"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Ingresa un correo electronico valido"),
  password: moodlePasswordSchema,
});

export type RegisterUserInput = z.infer<typeof registerUserSchema>;

export const studentInputSchema = z.object({
  username: z.string().trim().min(1, "El usuario es obligatorio"),
  firstname: z.string().trim().min(1, "El nombre es obligatorio"),
  lastname: z.string().trim().min(1, "El apellido es obligatorio"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Ingresa un correo electronico valido"),
  password: moodlePasswordSchema,
});

export type StudentInput = z.infer<typeof studentInputSchema>;
