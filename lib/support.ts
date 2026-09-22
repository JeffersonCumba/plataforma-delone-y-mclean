export function formatSupportCode(id: number): string {
  return `SUP-${String(id).padStart(6, "0")}`;
}
