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
