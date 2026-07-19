export interface MoodleUserSummary {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  fullname: string;
  email: string;
}

export interface MatricularUsuarioActionResult {
  ok: boolean;
  message: string;
  status?: "created_and_enrolled" | "enrolled" | "already_enrolled" | "error";
  user?: MoodleUserSummary;
}

export interface BuscarUsuariosActionResult {
  ok: boolean;
  message: string;
  users: MoodleUserSummary[];
}

export interface EncuestadoRow {
  id: number;
  username: string;
  fullname: string;
  email: string;
  courseId: number;
  courseName: string;
}

export interface UnenrollTarget {
  userId: number;
  courseId: number;
  fullname: string;
  courseName: string;
}
