import type { AttendanceRecord, AttendanceStatus } from '@/api/college';

export const ATTENDANCE_STATUSES: AttendanceStatus[] = ['present', 'absent', 'late', 'excused'];

/** Late still counts as a form of presence when measuring the attendance rate. */
export const isPresentLike = (status: AttendanceStatus): boolean =>
  status === 'present' || status === 'late';

export interface DayTrend {
  date: string;
  total: number;
  present: number;
  rate: number;
}

/** Present-rate per calendar day for the supplied records, oldest first. */
export function buildTrend(records: AttendanceRecord[], days: string[]): DayTrend[] {
  return days.map((date) => {
    const forDay = records.filter((record) => record.attendance_date === date);
    const present = forDay.filter((record) => isPresentLike(record.status)).length;
    const total = forDay.length;
    return {
      date,
      total,
      present,
      rate: total === 0 ? 0 : Math.round((present / total) * 100),
    };
  });
}

export interface StudentAttendanceSummary {
  studentId: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  rate: number;
}

/** Roll up every record into a per-student summary keyed by student id. */
export function summarizeByStudent(records: AttendanceRecord[]): Map<string, StudentAttendanceSummary> {
  const map = new Map<string, StudentAttendanceSummary>();
  records.forEach((record) => {
    const current =
      map.get(record.student_id) ??
      { studentId: record.student_id, total: 0, present: 0, absent: 0, late: 0, excused: 0, rate: 0 };
    current.total += 1;
    if (record.status === 'present') current.present += 1;
    else if (record.status === 'absent') current.absent += 1;
    else if (record.status === 'late') current.late += 1;
    else if (record.status === 'excused') current.excused += 1;
    map.set(record.student_id, current);
  });
  map.forEach((summary) => {
    const presentLike = summary.present + summary.late;
    summary.rate = summary.total === 0 ? 0 : Math.round((presentLike / summary.total) * 100);
  });
  return map;
}

/** The last `count` weekdays (Fri/Sat treated as the weekend) ending today, oldest first. */
export function recentSchoolDays(count: number, ending = new Date()): string[] {
  const out: string[] = [];
  const cursor = new Date(ending);
  while (out.length < count) {
    const dow = cursor.getDay();
    if (dow !== 5 && dow !== 6) {
      out.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return out.reverse();
}

/** Rate across a class/section cohort for a set of records. */
export function cohortRate(records: AttendanceRecord[]): number {
  if (records.length === 0) return 0;
  const present = records.filter((record) => isPresentLike(record.status)).length;
  return Math.round((present / records.length) * 100);
}