import { supabase } from './supabaseClient';
import { fetchInstitution } from './college';
import type { EnrollmentStatus } from './types';

export interface PromotionCandidate {
  id: string;
  studentNo: string | null;
  name: string;
  average: number | null;
  papers: number;
  passing: boolean;
}

/**
 * Builds the promotion sheet for one section: every student with their
 * average across all recorded marks, so pass/fail is measured — not guessed.
 */
export function buildCandidates(
  students: { id: string; student_no: string | null; first_name: string; last_name: string | null }[],
  results: { student_id: string; marks_obtained: number | string; exam_subject_id: string }[],
  papers: { id: string; max_marks: number | string; pass_marks: number | string }[],
): PromotionCandidate[] {
  const paperMap = new Map(papers.map((paper) => [paper.id, paper]));

  return students.map((student) => {
    const own = results.filter((result) => result.student_id === student.id);
    let obtained = 0;
    let possible = 0;
    let passingPapers = 0;
    own.forEach((result) => {
      const paper = paperMap.get(result.exam_subject_id);
      const max = Number(paper?.max_marks ?? 100) || 100;
      const passMarks = Number(paper?.pass_marks ?? max * 0.5);
      const marks = Number(result.marks_obtained ?? 0);
      obtained += marks;
      possible += max;
      if (marks >= passMarks) passingPapers += 1;
    });
    const average = possible > 0 ? Math.round((obtained / possible) * 1000) / 10 : null;
    return {
      id: student.id,
      studentNo: student.student_no,
      name: `${student.first_name} ${student.last_name ?? ''}`.trim(),
      average,
      papers: own.length,
      // No marks recorded yet: keep the student eligible rather than auto-failing them.
      passing: own.length === 0 ? true : passingPapers >= Math.ceil(own.length / 2),
    };
  });
}

export interface PromotionDecision {
  studentId: string;
  /** continue = move up, repeat = stay in the same class, leave = withdrawn */
  action: 'continue' | 'repeat' | 'leave';
}

export interface PromoteInput {
  decisions: PromotionDecision[];
  sourceYearId: string | null;
  targetYearId: string;
  targetClassId: string;
  targetSectionId: string;
  clearExisting?: boolean;
}

export interface PromoteResult {
  promoted: number;
  repeated: number;
  withdrawn: number;
  failures: string[];
}

/**
 * Writes one enrollment row per student for the target year (unique on
 * student + year, so running this twice can never duplicate a placement),
 * closes the source year, and moves the student's current section.
 */
export async function promoteStudents(input: PromoteInput): Promise<PromoteResult> {
  const institution = await fetchInstitution();
  if (!institution) throw new Error('Institution is not configured');

  const result: PromoteResult = { promoted: 0, repeated: 0, withdrawn: 0, failures: [] };
  const today = new Date().toISOString().slice(0, 10);

  for (const decision of input.decisions) {
    const status: EnrollmentStatus =
      decision.action === 'leave' ? 'withdrawn' : 'promoted';

    try {
      if (decision.action === 'leave') {
        if (input.sourceYearId) {
          await supabase
            .from('enrollments')
            .update({ status: 'withdrawn', ended_on: today, updated_at: new Date().toISOString() })
            .eq('student_id', decision.studentId)
            .eq('academic_year_id', input.sourceYearId);
        }
        await supabase.from('students').update({ status: 'withdrawn' }).eq('id', decision.studentId);
        result.withdrawn += 1;
        continue;
      }

      const repeating = decision.action === 'repeat';
      const { error } = await supabase.from('enrollments').upsert(
        {
          institution_id: institution.id,
          student_id: decision.studentId,
          academic_year_id: input.targetYearId,
          class_id: input.targetClassId,
          section_id: input.targetSectionId,
          status: repeating ? 'repeated' : status,
          started_on: today,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'student_id,academic_year_id' },
      );
      if (error) throw new Error(error.message);

      if (input.sourceYearId) {
        await supabase
          .from('enrollments')
          .update({ status: 'promoted', ended_on: today, updated_at: new Date().toISOString() })
          .eq('student_id', decision.studentId)
          .eq('academic_year_id', input.sourceYearId);
      }

      const { error: studentError } = await supabase
        .from('students')
        .update({ section_id: input.targetSectionId, status: 'active', enrolled_at: today })
        .eq('id', decision.studentId);
      if (studentError) throw new Error(studentError.message);

      if (repeating) result.repeated += 1;
      else result.promoted += 1;
    } catch (error) {
      result.failures.push(`${decision.studentId}: ${error instanceof Error ? error.message : 'failed'}`);
    }
  }

  return result;
}