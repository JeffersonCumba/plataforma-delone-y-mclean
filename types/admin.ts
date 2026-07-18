export interface ProfesorRow {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  fullname: string;
  email: string;
  courseCount: number;
  trialStartDate: Date | null;
  trialEndsAt: Date | null;
  trialDaysRemaining: number;
  trialTotalDays: number;
  trialIsExpired: boolean;
  trialIsWarningPeriod: boolean;
  trialWarningSent: boolean;
}

export interface AdminStats {
  totalProfesores: number;
  totalCursos: number;
  totalEstudiantes: number;
  totalEncuestas: number;
}

export interface AdminCursoRow {
  id: number;
  fullname: string;
  shortname: string;
  teacherName: string;
  studentCount: number;
  surveyCount: number;
  timecreated: number;
}
