"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import { CloudUpload, FileText, Upload } from "lucide-react";
import { toast } from "sonner";

import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MoodleCourse } from "@/types/course";
import { registrarEstudiantesCsvAction } from "@/app/dashboard/encuestados/actions";
import type { BatchRegistrationResult } from "@/services/userService";
import type { StudentInput } from "@/lib/validations/user";

type CsvRow = Record<string, unknown>;

const REQUIRED_HINT =
  "Columnas requeridas: username, firstname, lastname, email, password";

function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function toStudentInput(row: CsvRow): StudentInput | null {
  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(row)) {
    normalized[normalizeKey(key)] = String(value ?? "").trim();
  }

  const username = normalized.username ?? normalized.usuario ?? "";
  const firstname = normalized.firstname ?? normalized.nombre ?? "";
  const lastname = normalized.lastname ?? normalized.apellido ?? "";
  const email = normalized.email ?? normalized.correo ?? "";
  const password =
    normalized.password ?? normalized.contrasena ?? normalized.contraseña ?? "";

  if (!username || !firstname || !lastname || !email || !password) {
    return null;
  }

  return {
    username,
    firstname,
    lastname,
    email,
    password,
  };
}

export function CSVUploader({ courses }: { courses: MoodleCourse[] }) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    courses[0]?.id ? String(courses[0].id) : "",
  );
  const [fileName, setFileName] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentInput[]>([]);
  const [processing, setProcessing] = useState(false);
  const [lastBatchResult, setLastBatchResult] = useState<BatchRegistrationResult | null>(null);

  const parseFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Solo se permiten archivos CSV");
      return;
    }

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        const mappedStudents = results.data
          .map(toStudentInput)
          .filter((student): student is StudentInput => Boolean(student));

        if (mappedStudents.length === 0) {
          toast.error(REQUIRED_HINT);
          setStudents([]);
          setFileName(file.name);
          return;
        }

        setFileName(file.name);
        setStudents(mappedStudents);
        setLastBatchResult(null);
        toast.success(
          `Archivo cargado: ${mappedStudents.length} usuarios detectados`,
        );
      },
      error: () => {
        toast.error("No fue posible leer el archivo CSV");
      },
    });
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      parseFile(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);

    const file = event.dataTransfer.files?.[0];
    if (file) {
      parseFile(file);
    }
  };

  const handleProcess = async () => {
    if (!selectedCourseId) {
      toast.error("Selecciona un curso antes de registrar estudiantes");
      return;
    }

    if (students.length === 0) {
      toast.error("Carga un CSV valido antes de continuar");
      return;
    }

    setProcessing(true);

    try {
      const result = await registrarEstudiantesCsvAction(
        Number(selectedCourseId),
        students,
      );

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      const batchResult = result.result!;
      setLastBatchResult(batchResult);

      toast.success(
        `Matriculacion masiva completada: ${batchResult.enrolled} matriculados, ${batchResult.created} creados, ${batchResult.skipped} existentes${batchResult.failed ? `, ${batchResult.failed} con error` : ""}`,
      );

      if (batchResult.errors.length > 0) {
        toast.error(
          `Se omitieron ${batchResult.failed} estudiantes por error en el CSV o Moodle`,
        );
      }

      setStudents([]);
      setFileName(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No fue posible completar el proceso";
      toast.error(message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card className="border-slate-200/80 bg-white/90 shadow-sm">
      <CardHeader className="space-y-3 border-b border-slate-200/70 bg-slate-50/70">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-slate-900 text-white">
            <CloudUpload className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl">
              Matriculación Masiva por CSV
            </CardTitle>
            <CardDescription>
              Arrastra un archivo CSV con estudiantes, selecciona el curso y
              procesa la carga.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-6">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <Label>Curso destino</Label>
            <Select
              value={selectedCourseId}
              onValueChange={setSelectedCourseId}
              disabled={processing || courses.length === 0}
            >
              <SelectTrigger
                className="mt-2 h-11 w-full border-slate-300 bg-white text-sm text-slate-900"
                aria-label="Curso destino"
              >
                <SelectValue placeholder="Selecciona un curso" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Cursos</SelectLabel>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={String(course.id)}>
                      {course.fullname}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Archivo CSV</Label>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleInputChange}
              disabled={processing}
              className="mt-2"
            />
          </div>
        </div>

        <div
          onDragEnter={() => setDragActive(true)}
          onDragLeave={() => setDragActive(false)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
          className={`flex min-h-20 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed p-6 text-center transition ${
            dragActive
              ? "border-slate-900 bg-slate-50"
              : fileName
                ? "border-green-400 bg-green-50/50"
                : "border-slate-300 bg-slate-50/60"
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-8 w-8 text-slate-600" />
          <p className="mt-3 text-sm font-medium text-slate-900">
            Arrastra y suelta tu archivo CSV aquí o haz clic para seleccionarlo
          </p>
          <p className="mt-1 text-xs text-slate-500">{REQUIRED_HINT}</p>
          {fileName ? (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
              <FileText className="h-3.5 w-3.5" />
              {fileName}
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-900">
              {processing
                ? "Procesando estudiantes..."
                : lastBatchResult
                  ? `${lastBatchResult.total} estudiantes procesados`
                  : students.length > 0
                    ? `${students.length} estudiantes listos para procesar`
                    : "Esperando archivo CSV"}
            </span>
            {processing ? (
              <Spinner className="h-4 w-4" />
            ) : lastBatchResult ? (
              <span className="text-slate-500">100%</span>
            ) : null}
          </div>
          {processing ? (
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div className="h-full w-full animate-pulse rounded-full bg-slate-900" />
            </div>
          ) : null}
          {lastBatchResult ? (
            <div className="mt-1 text-sm text-slate-600">
              Procesados: {lastBatchResult.total}. Creados:{" "}
              {lastBatchResult.created}. Matriculados:{" "}
              {lastBatchResult.enrolled}. Fallos: {lastBatchResult.failed}.
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            {students.length > 0
              ? `${students.length} usuarios detectados en el CSV`
              : REQUIRED_HINT}
          </p>
          <Button
            onClick={handleProcess}
            disabled={
              processing || students.length === 0 || courses.length === 0
            }
            size="lg"
          >
            {processing ? (
              <Spinner className="mr-2" />
            ) : null}
            {processing ? "Procesando..." : "Registrar estudiantes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
