export interface TrialInfo {
  user_id: number;
  trial_start_date: Date;
  trial_ends_at: Date;
  warning_sent: boolean;
  deleted_at: Date | null;
}

export interface TeacherInfo {
  user_id: number;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
}
