import { z } from "zod";

export const createCourseSchema = z.object({
  fullname: z.string().trim().min(5, "El nombre del curso es obligatorio"),
  shortname: z
    .string()
    .trim()
    .min(3, "El codigo corto es obligatorio")
    .max(100, "El codigo corto es demasiado largo"),
  summary: z
    .string()
    .trim()
    .max(2000, "La descripcion es demasiado larga")
    .optional()
    .default(""),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
