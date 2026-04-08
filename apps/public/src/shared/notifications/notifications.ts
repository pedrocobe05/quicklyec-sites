export type PublicNotificationVariant = 'success' | 'error' | 'info';

export interface PublicNotificationDetail {
  title: string;
  variant: PublicNotificationVariant;
}

export function emitPublicNotification(title: string, variant: PublicNotificationVariant = 'info') {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<PublicNotificationDetail>('qs:public-notify', {
      detail: { title, variant },
    }),
  );
}
