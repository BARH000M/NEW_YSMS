import type { EnrollmentRow } from '@/api/college';
import type { Exam, ExamResult, Subject, Term } from '@/api/types';

export interface TranscriptPaper {
  examName: string;
  subjectName: string;
  obtained: number;
  maxMarks: number;
  percent: number | null;
}

export interface TranscriptYear {
  enrollment: EnrollmentRow;
  papers: TranscriptPaper[];
  obtained: number;
  maxMarks: number;
  average: number | null;
}

interface ClassSubjectLite {
  id: string;
  subject_id: string;
  max_marks: number;
  subjects: Pick<Subject, 'id' | 'name' | 'name_ar' | 'code'> | null;
}

const pct = (obtained: number, max: number): number | null =>
  max > 0 ? Math.round((obtained / max) * 1000) / 10 : null;

/**
 * Rebuilds a year-by-year transcript by joining results → paper → exam → term → academic year.
 * All inputs are already-cached lists so this never triggers an extra round trip.
 */
export function buildTranscript({
  enrollments,
  results,
  exams,
  terms,
  examSubjects,
  studentId,
}: {
  enrollments: EnrollmentRow[];
  results: ExamResult[];
  exams: Exam[];
  terms: Term[];
  examSubjects: ClassSubjectLite[];
  studentId: string;
}): TranscriptYear[] {
  const examById = new Map(exams.map((exam) => [exam.id, exam]));
  const termById = new Map(terms.map((term) => [term.id, term]));
  const paperById = new Map(examSubjects.map((paper) => [paper.id, paper]));

  const papersByYear = new Map<string, TranscriptPaper[]>();

  results
    .filter((row) => row.student_id === studentId)
    .forEach((row) => {
      const paper = paperById.get(row.exam_subject_id);
      const exam = examById.get(row.exam_id);
      if (!paper || !exam) return;
      const term = exam.term_id ? termById.get(exam.term_id) : null;
      const yearId = term?.academic_year_id;
      if (!yearId) return;

      const maxMarks = Number(paper.max_marks) > 0 ? Number(paper.max_marks) : 100;
      const bucket = papersByYear.get(yearId) ?? [];
      bucket.push({
        examName: exam.name,
        subjectName: paper.subjects?.name ?? paper.subjects?.name_ar ?? paper.subjects?.code ?? '—',
        obtained: Number(row.marks_obtained ?? 0),
        maxMarks,
        percent: pct(Number(row.marks_obtained ?? 0), maxMarks),
      });
      papersByYear.set(yearId, bucket);
    });

  return enrollments.map((enrollment) => {
    const papers = (papersByYear.get(enrollment.academic_year_id) ?? []).sort((a, b) =>
      a.subjectName.localeCompare(b.subjectName),
    );
    const obtained = papers.reduce((sum, paper) => sum + paper.obtained, 0);
    const maxMarks = papers.reduce((sum, paper) => sum + paper.maxMarks, 0);
    const stored = enrollment.final_average === null ? null : Number(enrollment.final_average);
    return {
      enrollment,
      papers,
      obtained,
      maxMarks,
      average: pct(obtained, maxMarks) ?? (Number.isFinite(stored as number) ? stored : null),
    };
  });
}