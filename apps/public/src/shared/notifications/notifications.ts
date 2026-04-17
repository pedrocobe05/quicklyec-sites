import { getPublicCopy, resolvePreferredPublicLanguage } from '../../lib/public-language';

export type PublicNotificationVariant = 'success' | 'error' | 'info';

export interface PublicNotificationDetail {
  title: string;
  variant: PublicNotificationVariant;
}

function normalizeNotificationTitle(title: string) {
  const normalized = title.trim();
  if (!normalized || normalized.toLowerCase() === 'null' || normalized.toLowerCase() === 'undefined') {
    return getPublicCopy(resolvePreferredPublicLanguage()).api.notificationFallback;
  }

  return normalized;
}

export function emitPublicNotification(title: string, variant: PublicNotificationVariant = 'info') {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<PublicNotificationDetail>('qs:public-notify', {
      detail: { title: normalizeNotificationTitle(title), variant },
    }),
  );
}
