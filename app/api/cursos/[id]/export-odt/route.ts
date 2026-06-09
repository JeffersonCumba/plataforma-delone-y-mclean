import { NextResponse } from "next/server";
import JSZip from "jszip";
import { cookies } from "next/headers";

import { getCourseAnalyticsData } from "@/services/courseAnalyticsService";
import { obtenerCursosProfesor } from "@/services/courseService";
import {
  buildContentXml,
  buildManifestXml,
  buildMetaXml,
  buildStylesXml,
  ODT_MIMETYPE,
  type AiConclusions,
} from "@/lib/odt-report";

function unauthorized(message: string): NextResponse {
  return NextResponse.json({ message }, { status: 401 });
}

function badRequest(message: string): NextResponse {
  return NextResponse.json({ message }, { status: 400 });
}

function forbidden(message: string): NextResponse {
  return NextResponse.json({ message }, { status: 403 });
}

function readConclusions(request: Request): AiConclusions {
  const url = new URL(request.url);
  return {
    satisfaction: url.searchParams.get("satisfaction") ?? "",
    descriptive: url.searchParams.get("descriptive") ?? "",
    betas: url.searchParams.get("betas") ?? "",
    frequencies: url.searchParams.get("frequencies") ?? "",
    critical: url.searchParams.get("critical") ?? "",
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get("user_id")?.value);

  if (!Number.isInteger(userId) || userId <= 0) {
    return unauthorized("Sesion invalida");
  }

  const { id } = await context.params;
  const courseId = Number(id);

  if (!Number.isInteger(courseId) || courseId <= 0) {
    return badRequest("ID de curso invalido");
  }

  const courses = await obtenerCursosProfesor(userId);
  const allowed = courses.some((course) => course.id === courseId);

  if (!allowed) {
    return forbidden("No tienes acceso a este curso");
  }

  const analytics = await getCourseAnalyticsData(courseId);

  if (analytics.totalSurveys === 0) {
    return badRequest("Este curso aun no tiene encuestas respondidas");
  }

  const generatedAt = new Date().toISOString();
  const currentCourse = courses.find((course) => course.id === courseId);
  const courseName = currentCourse?.fullname ?? "Curso";

  const aiConclusions = readConclusions(request);

  const contentXml = buildContentXml({
    courseName,
    generatedAt,
    analytics,
    aiConclusions,
  });
  const stylesXml = buildStylesXml();
  const metaXml = buildMetaXml({ courseName, generatedAt });
  const manifestXml = buildManifestXml();

  const zip = new JSZip();
  zip.file("mimetype", ODT_MIMETYPE, { compression: "STORE" });
  zip.file("content.xml", contentXml);
  zip.file("styles.xml", stylesXml);
  zip.file("meta.xml", metaXml);
  zip.folder("META-INF")?.file("manifest.xml", manifestXml);

  const buffer = await zip.generateAsync({
    type: "nodebuffer",
    mimeType: ODT_MIMETYPE,
  });

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": ODT_MIMETYPE,
      "Content-Disposition": `attachment; filename="Auditoria_Curso_${courseId}.odt"`,
      "Cache-Control": "no-store",
    },
  });
}
