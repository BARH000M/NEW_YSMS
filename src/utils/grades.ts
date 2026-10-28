export const PASS_PERCENTAGE = 50;

/** Every letter grade, best to worst — used by the distribution chart. */
export const GRADE_BANDS = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F'] as const;

/** Percentage rounded to one decimal, safe against a zero maximum. */
export function percentageOf(obtained: number, max: number): number {
  if (!max || max <= 0) return 0;
  const raw = (obtained / max) * 100;
  return Math.round(raw * 10) / 10;
}

/** Single letter grade used everywhere: marks entry, report cards, exports. */
export function gradeFor(percentage: number): string {
  if (percentage >= 90) return 'A+';
  if (percentage >= 85) return 'A';
  if (percentage >= 80) return 'B+';
  if (percentage >= 75) return 'B';
  if (percentage >= 70) return 'C+';
  if (percentage >= 65) return 'C';
  if (percentage >= 60) return 'D+';
  if (percentage >= 50) return 'D';
  return 'F';
}

export function isPassing(percentage: number): boolean {
  return percentage >= PASS_PERCENTAGE;
}