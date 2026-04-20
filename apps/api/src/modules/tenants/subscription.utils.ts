const DEFAULT_SUBSCRIPTION_TIMEZONE = 'America/Guayaquil';
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const SUBSCRIPTION_ALERT_THRESHOLDS = [30, 7, 1] as const;

export type TenantSubscriptionState = {
  today: string;
  isPending: boolean;
  isExpired: boolean;
  isActive: boolean;
  daysUntilExpiry: number | null;
};

export function normalizeDateOnly(value?: string | null) {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    return null;
  }

  if (!DATE_ONLY_PATTERN.test(normalized)) {
    throw new Error('Invalid date-only value');
  }

  return normalized;
}

export function parseDateOnly(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function getCurrentDateInTimeZone(now = new Date(), timeZone?: string | null) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone?.trim() || DEFAULT_SUBSCRIPTION_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(now);
  const year = parts.find((part) => part.type === 'year')?.value ?? '0000';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';

  return `${year}-${month}-${day}`;
}

export function getTenantSubscriptionState(input: {
  subscriptionStartsAt?: string | null;
  subscriptionEndsAt?: string | null;
  timeZone?: string | null;
  now?: Date;
}): TenantSubscriptionState {
  const today = getCurrentDateInTimeZone(input.now, input.timeZone);
  const startsAt = input.subscriptionStartsAt ? normalizeDateOnly(input.subscriptionStartsAt) : null;
  const endsAt = input.subscriptionEndsAt ? normalizeDateOnly(input.subscriptionEndsAt) : null;
  const isPending = Boolean(startsAt && today < startsAt);
  const isExpired = Boolean(endsAt && today > endsAt);
  const isActive = !isPending && !isExpired;
  const daysUntilExpiry = endsAt
    ? Math.round((parseDateOnly(endsAt).getTime() - parseDateOnly(today).getTime()) / 86_400_000)
    : null;

  return {
    today,
    isPending,
    isExpired,
    isActive,
    daysUntilExpiry,
  };
}
