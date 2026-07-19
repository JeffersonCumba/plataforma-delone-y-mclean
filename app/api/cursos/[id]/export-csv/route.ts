import { type RowDataPacket } from "mysql2";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { pool } from "@/lib/db";
import { obtenerCursosProfesor } from "@/services/courseService";

interface ExportRow extends RowDataPacket {
  completedId: number;
  dimension: string;
  pregunta: string;
  valor: string;
}

function cleanNumericValue(rawValue: string): string {
  const parsed = Number.parseFloat(
    (rawValue ?? "").split(">>")[0]?.trim() ?? "",
  );
  return Number.isFinite(parsed) ? String(parsed) : "";
}

function escapeCsvCell(value: string | number): string {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/\"/g, '""')}"`;
  }
  return text;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get("user_id")?.value);

  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ message: "No autenticado" }, { status: 401 });
  }

  const { id } = await context.params;
  const courseId = Number(id);

  if (!Number.isInteger(courseId) || courseId <= 0) {
    return NextResponse.json({ message: "Curso invalido" }, { status: 400 });
  }

  const courses = await obtenerCursosProfesor(userId);
  const allowed = courses.some((course) => course.id === courseId);

  if (!allowed) {
    return NextResponse.json(
      { message: "Curso no permitido" },
      { status: 403 },
    );
  }

  const [rows] = await pool.execute<ExportRow[]>(
    `SELECT
        fc.id AS completedId,
        fi.label AS dimension,
        fi.name AS pregunta,
        fv.value AS valor
      FROM mdl_feedback_value fv
      INNER JOIN mdl_feedback_completed fc ON fc.id = fv.completed
      INNER JOIN mdl_feedback f ON f.id = fc.feedback
      INNER JOIN mdl_feedback_item fi ON fi.id = fv.item
      WHERE f.course = ?
        AND fv.value IS NOT NULL
        AND fv.value <> ''
      ORDER BY fc.id ASC, fi.position ASC`,
    [courseId],
  );

  const header = "completedId,dimension,pregunta,valor";
  const csvRows = rows.map((row) =>
    [
      escapeCsvCell(row.completedId),
      escapeCsvCell(row.dimension ?? ""),
      escapeCsvCell(row.pregunta ?? ""),
      escapeCsvCell(cleanNumericValue(row.valor ?? "")),
    ].join(","),
  );

  const csv = `\uFEFF${[header, ...csvRows].join("\n")}`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="curso-${courseId}-respuestas.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
