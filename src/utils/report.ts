import type { ExamResult } from '@/api/types';
import type { ExamSubjectRow } from '@/api/college';
import { gradeFor, isPassing, percentageOf } from './grades';

export interface ReportSubjectRow {
  subjectId: string;
  name: string;
  nameAr: string | null;
  obtained: number;
  max: number;
  percentage: number;
  grade: string;
  papers: number;
}

export interface ReportSummary {
  rows: ReportSubjectRow[];
  obtained: number;
  max: number;
  percentage: number;
  grade: string;
  passed: boolean;
  papers: number;
}

/**
 * Combines every paper in a term for one student, grouping by subject so a
 * midterm and a final for the same subject show as one line.
 */
export function buildReport(
  studentId: string,
  papers: ExamSubjectRow[],
  results: ExamResult[],
): ReportSummary {
  const resultByPaper = new Map<string, ExamResult>();
  results.forEach((result) => {
    if (result.student_id === studentId) resultByPaper.set(result.exam_subject_id, result);
  });

  const bySubject = new Map<string, ReportSubjectRow>();

  papers.forEach((paper) => {
    const result = resultByPaper.get(paper.id);
    if (!result) return;

    const existing = bySubject.get(paper.subject_id) ?? {
      subjectId: paper.subject_id,
      name: paper.subjects?.name ?? '—',
      nameAr: paper.subjects?.name_ar ?? null,
      obtained: 0,
      max: 0,
      percentage: 0,
      grade: '—',
      papers: 0,
    };

    existing.obtained += Number(result.marks_obtained) || 0;
    existing.max += Number(paper.max_marks) || 0;
    existing.papers += 1;
    bySubject.set(paper.subject_id, existing);
  });

  const rows = Array.from(bySubject.values())
    .map((row) => {
      const percentage = percentageOf(row.obtained, row.max);
      return { ...row, percentage, grade: gradeFor(percentage) };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const obtained = rows.reduce((sum, row) => sum + row.obtained, 0);
  const max = rows.reduce((sum, row) => sum + row.max, 0);
  const percentage = percentageOf(obtained, max);
  const paperCount = rows.reduce((sum, row) => sum + row.papers, 0);

  return {
    rows,
    obtained,
    max,
    percentage,
    grade: rows.length > 0 ? gradeFor(percentage) : '—',
    passed: rows.length > 0 && isPassing(percentage),
    papers: paperCount,
  };
}