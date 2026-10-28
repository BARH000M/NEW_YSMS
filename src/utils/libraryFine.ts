import { todayKey } from './date';

/*
  Library fine calculation.
  A loan is late once the due date has passed. Days late are counted from the
  day after the due date up to the moment the book came back — or up to today
  when it is still out. The fine is simply days late × the daily rate.
*/

const DAY_MS = 86_400_000;

/** Default daily rate applied to a late loan. */
export const DEFAULT_FINE_PER_DAY = 5;

const dayNumber = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  return Date.UTC(year, month - 1, day);
};

export interface LoanLike {
  due_on: string | null;
  returned_on?: string | null;
  status?: string;
}

export function loanDaysLate(loan: LoanLike, today: string = todayKey()): number {
  const due = dayNumber(loan.due_on);
  if (due === null) return 0;

  const stillOut = loan.status !== 'returned' || !loan.returned_on;
  const end = dayNumber(loan.returned_on ?? (stillOut ? today : null));
  if (end === null) return 0;

  const late = Math.floor((end - due) / DAY_MS);
  return late > 0 ? late : 0;
}

export function loanFine(days: number, rate: number = DEFAULT_FINE_PER_DAY): number {
  if (days <= 0 || rate <= 0) return 0;
  return Math.round(days * rate * 100) / 100;
}

export function isLoanOverdue(loan: LoanLike, today: string = todayKey()): boolean {
  return loan.status === 'issued' && loanDaysLate(loan, today) > 0;
}