// #4471 split by what each report shows, counted the way the desk counts (CauseTable): every report by
// its cause in causes.ts. Reports the desk read as a one-day move (desk-notes.json) are not a day/month
// swap, so they get their own row too; they stay counted where causes.ts files them.
import { causeOf, uniqueById, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = 'parser' | 'hint' | 'one-day' | 'unplaced';
export const PROBLEMS: readonly Problem[] = ['parser', 'hint', 'one-day', 'unplaced'];

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  // For one-day: the cause these reports are counted under.
  filedUnder: string[];
  tenants: number;
  channels: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
};

export function splitTicket(
  all: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): { rows: number; merged: Report[]; groups: ProblemGroup[] } {
  const merged = uniqueById(all).filter((r) => r.mergedInto === ticket);
  const cause = (r: Report): Problem => causeOf(r, tenantOf(r)) ?? 'unplaced';
  const groups = PROBLEMS.map((problem) => {
    const rs = problem === 'one-day' ? merged.filter((r) => oneDayMove.includes(r.id)) : merged.filter((r) => cause(r) === problem);
    const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
    return {
      problem,
      reports: rs,
      filedUnder: problem === 'one-day' ? [...new Set(rs.map(cause))] : [],
      tenants: new Set(rs.map((r) => r.tenant)).size,
      channels: rs.reduce<Record<string, number>>((n, r) => ({ ...n, [r.channel]: (n[r.channel] ?? 0) + 1 }), {}),
      firstSeen: days[0],
      lastSeen: days[days.length - 1],
    };
  }).filter((g) => g.reports.length > 0);
  return { rows: all.filter((r) => r.mergedInto === ticket).length, merged, groups };
}
