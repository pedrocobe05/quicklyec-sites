import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { PageErrorState } from '../components/PageErrorState';
import { PageLoadingShell } from '../components/PageLoadingShell';
import { useSiteConfig } from '../lib/useSiteConfig';
import { getLocalizedPath, usePublicCopy, usePublicLanguage } from '../lib/public-language';

function getMethodLabel(method: string | null, language: 'es' | 'en') {
  const labels: Record<string, Record<'es' | 'en', string>> = {
    cash: { es: 'efectivo', en: 'cash' },
    transfer: { es: 'transferencia', en: 'bank transfer' },
  };

  return labels[method ?? '']?.[language] ?? null;
}

export function BookingPaymentPendingPage() {
  const { data, loading, error } = useSiteConfig('/');
  const copy = usePublicCopy();
  const { language } = usePublicLanguage();
  const [searchParams] = useSearchParams();

  const method = searchParams.get('method');
  const appointmentId = searchParams.get('appointmentId');
  const methodLabel = useMemo(() => getMethodLabel(method, language), [language, method]);
  const hint =
    method === 'cash'
      ? copy.bookingPending.cashHint
      : method === 'transfer'
        ? copy.bookingPending.transferHint
        : null;

  if (loading) {
    return (
      <PageLoadingShell
        eyebrow={copy.shell.loading.eyebrow}
        title={copy.shell.loading.title}
        description={copy.shell.loading.description}
      />
    );
  }

  if (!data || error) {
    return <PageErrorState />;
  }

  return (
    <Layout site={data}>
      <main className="mx-auto flex max-w-3xl items-center justify-center px-6 py-16">
        <section className="w-full rounded-[2rem] bg-white p-8 text-center shadow-sm">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--accent)]">{copy.bookingPending.eyebrow}</p>
          <h1 className="mt-3 font-serif text-4xl text-slate-900">{copy.bookingPending.title}</h1>
          <p className="mt-4 text-slate-600">{copy.bookingPending.description}</p>
          {methodLabel ? (
            <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {language === 'en' ? 'Payment method' : 'Método de pago'}: <span className="font-semibold">{methodLabel}</span>
            </p>
          ) : null}
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-relaxed text-amber-900">
            {copy.bookingPending.pendingLabel}
            {hint ? ` ${hint}` : ''}
          </p>
          {appointmentId ? (
            <p className="mt-3 text-sm text-slate-500">
              {copy.bookingPending.bookingReferenceLabel}: <span className="font-mono text-slate-700">{appointmentId}</span>
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/" className="rounded-full bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white">
              {copy.bookingPending.goHome}
            </Link>
            <Link
              to={getLocalizedPath('booking', language)}
              className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700"
            >
              {copy.bookingPending.backToBooking}
            </Link>
          </div>
        </section>
      </main>
    </Layout>
  );
}
