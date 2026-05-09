import { startOfDay, subDays, addWeeks, addMonths, isAfter } from "date-fns";

export interface PayCycleConfig {
  pay_frequency: "weekly" | "fortnightly" | "monthly";
  pay_day_of_week: number;   // 0–6, for weekly/fortnightly
  pay_day_of_month: number;  // 1–31, for monthly
  last_pay_date: string | null;
}

// Returns the start of the current pay cycle (last payday)
export function currentCycleStart(config: PayCycleConfig, now = new Date()): Date {
  const today = startOfDay(now);

  if (config.last_pay_date) {
    let last = startOfDay(new Date(config.last_pay_date));
    // Walk forward until we find the last payday <= today
    while (true) {
      const next = nextPayday(last, config);
      if (isAfter(next, today)) return last;
      last = next;
    }
  }

  // Fallback: 30 days ago
  return subDays(today, 30);
}

// Returns the next payday after a given date
export function nextPayday(from: Date, config: PayCycleConfig): Date {
  if (config.pay_frequency === "monthly") {
    const d = config.pay_day_of_month;
    let candidate = new Date(from.getFullYear(), from.getMonth(), d);
    if (!isAfter(candidate, from)) candidate = addMonths(candidate, 1);
    return candidate;
  }

  const weeks = config.pay_frequency === "weekly" ? 1 : 2;
  return addWeeks(from, weeks);
}

// Days remaining in this pay cycle
export function daysUntilNextPay(config: PayCycleConfig, now = new Date()): number {
  const cycleStart = currentCycleStart(config, now);
  const next = nextPayday(cycleStart, config);
  const ms = next.getTime() - startOfDay(now).getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}
