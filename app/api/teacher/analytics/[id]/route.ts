/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { fetchMoodle } from "@/lib/moodle";
import { pool } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

interface TeacherCourseRow extends RowDataPacket {
  courseid: number;
}

async function getTeacherCourses(teacherId: number): Promise<number[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT DISTINCT ctx.instanceid AS courseid
       FROM mdl_role_assignments ra
       JOIN mdl_context ctx ON ctx.id = ra.contextid AND ctx.contextlevel = 50
      WHERE ra.roleid = ?
        AND ra.userid = ?`,
    [Number(process.env.MOODLE_TEACHER_ROLE_ID ?? 4), teacherId],
  );

  return (rows as any[]).map((r) => r.courseid);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    if (session instanceof Response) return session;

    const { id } = await params;
    const targetTeacherId = Number(id);

    if (!Number.isInteger(targetTeacherId) || targetTeacherId <= 0) {
      return NextResponse.json({ error: "ID de profesor inválido" }, { status: 400 });
    }

    if (session.role !== "ADMIN" && session.userId !== targetTeacherId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const courseIds = await getTeacherCourses(targetTeacherId);

    let analytics: any[] = [];
    if (courseIds.length > 0) {
      const params: Record<string, string> = {};
      courseIds.forEach((courseId, index) => {
        params[`options[ids][${index}]`] = String(courseId);
      });

      const courses = await fetchMoodle<Array<{ id: number; fullname: string; shortname: string }>>(
        "core_course_get_courses",
        params,
      );
      analytics = courses || [];
    }

    return NextResponse.json({
      teacherId: targetTeacherId,
      analytics,
      totalCourses: courseIds.length,
    });
  } catch (error) {
    console.error("Error fetching teacher analytics:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}