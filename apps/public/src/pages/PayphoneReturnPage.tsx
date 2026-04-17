import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { PageErrorState } from '../components/PageErrorState';
import { PageLoadingShell } from '../components/PageLoadingShell';
import { applyPayphoneClientConfirm } from '../lib/api';
import { readPayphoneReturnQuery } from '../lib/payphone-return-params';
import { useSiteConfig } from '../lib/useSiteConfig';
import { usePublicCopy } from '../lib/public-language';

const PAYPHONE_CONFIRM_URL = 'https://pay.payphonetodoesposible.com/api/button/V2/Confirm';

async function confirmPayphoneInBrowser(params: { id: number; clientTxId: string; token: string }) {
  const res = await fetch(PAYPHONE_CONFIRM_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.token}`,
      ...(typeof document !== 'undefined' && document.referrer ? { Referer: document.referrer } : {}),
    },
    body: JSON.stringify({ id: params.id, clientTxId: params.clientTxId }),
  });
  const raw = await res.text();
  let json: Record<string, unknown> | null = null;
  try {
    if (raw.trim().startsWith('{')) {
      json = JSON.parse(raw) as Record<string, unknown>;
    }
  } catch {
    /* empty */
  }
  return { ok: res.ok, status: res.status, json, raw };
}

export function PayphoneReturnPage() {
  const { data, loading, error } = useSiteConfig('/');
  const copy = usePublicCopy();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'approved' | 'cancelled' | 'failed'>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);

  const queryKey = searchParams.toString();
  const { id, clientTransactionId: clientTxId } = useMemo(() => readPayphoneReturnQuery(searchParams), [queryKey]);

  const showVerifyingOverlay = Boolean(data && !error && status === 'loading');

  useEffect(() => {
    if (!showVerifyingOverlay) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showVerifyingOverlay]);

  useEffect(() => {
    if (!id || !clientTxId) {
      setStatus('failed');
      setMessage(copy.payphoneReturn.parametersMissing);
      return;
    }

    if (loading || !data) {
      return;
    }

    const creds = data.tenant.paymentMethods.payphonePublicApi;
    if (!creds?.token?.trim()) {
      setStatus('failed');
      setMessage(copy.payphoneReturn.payphoneNotConfigured);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const browser = await confirmPayphoneInBrowser({
          id,
          clientTxId,
          token: creds.token.trim(),
        });
        if (cancelled) {
          return;
        }

        if (!browser.ok || !browser.json) {
          const fromPayphone =
            browser.json && typeof browser.json.message === 'string' ? String(browser.json.message) : null;
          setStatus('failed');
          setMessage(fromPayphone ?? copy.payphoneReturn.payphoneDirectFailed);
          return;
        }

        const result = await applyPayphoneClientConfirm({
          id,
          clientTxId,
          confirmPayload: browser.json,
        });
        if (cancelled) {
          return;
        }

        setStatus(result.status === 'approved' ? 'approved' : result.status === 'cancelled' ? 'cancelled' : 'failed');
        setAppointmentId(result.appointmentId ?? null);
        setMessage(
          result.status === 'approved'
            ? copy.payphoneReturn.descriptionApproved
            : result.status === 'cancelled'
              ? copy.payphoneReturn.descriptionCancelled
              : copy.payphoneReturn.descriptionFailed,
        );
      } catch (err) {
        if (cancelled) {
          return;
        }
        setStatus('failed');
        setAppointmentId(null);
        setMessage(err instanceof Error ? err.message : copy.api.requestFailed);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    loading,
    data,
    id,
    clientTxId,
    copy.payphoneReturn.parametersMissing,
    copy.payphoneReturn.descriptionApproved,
    copy.payphoneReturn.descriptionCancelled,
    copy.payphoneReturn.descriptionFailed,
    copy.payphoneReturn.payphoneNotConfigured,
    copy.payphoneReturn.payphoneDirectFailed,
    copy.api.requestFailed,
  ]);

  const pageTitle =
    status === 'approved'
      ? copy.payphoneReturn.titleApproved
      : status === 'cancelled'
        ? copy.payphoneReturn.titleCancelled
        : status === 'failed'
          ? copy.payphoneReturn.titleFailed
          : copy.payphoneReturn.titleLoading;

  if (loading) {
    return <PageLoadingShell eyebrow={copy.shell.loading.eyebrow} title={copy.shell.loading.title} description={copy.shell.loading.description} />;
  }

  if (!data || error) {
    return <PageErrorState />;
  }

  return (
    <Layout site={data}>
      {showVerifyingOverlay ? (
        <div
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-4 bg-white/70 px-6 backdrop-blur-md"
          role="alertdialog"
          aria-busy="true"
          aria-live="polite"
          aria-label={copy.payphoneReturn.verifyingPayment}
        >
          <div
            className="h-12 w-12 animate-spin rounded-full border-[3px] border-slate-200 border-t-[var(--primary)]"
            aria-hidden
          />
          <p className="max-w-sm text-center text-lg font-semibold text-slate-900">{copy.payphoneReturn.verifyingPayment}</p>
          <p className="max-w-sm text-center text-sm leading-relaxed text-slate-600">{copy.payphoneReturn.verifyingPaymentHint}</p>
        </div>
      ) : null}
      <main
        className={`relative mx-auto flex max-w-3xl items-center justify-center px-6 py-16 ${showVerifyingOverlay ? 'pointer-events-none select-none' : ''}`}
        aria-hidden={showVerifyingOverlay ? true : undefined}
      >
        <section className="w-full rounded-[2rem] bg-white p-8 text-center shadow-sm">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--accent)]">{copy.payphoneReturn.eyebrow}</p>
          <h1 className="mt-3 font-serif text-4xl text-slate-900">{pageTitle}</h1>
          <p className="mt-4 text-slate-600">{message ?? copy.payphoneReturn.descriptionLoading}</p>
          {status === 'approved' && appointmentId ? (
            <p className="mt-2 text-sm text-slate-500">
              {copy.payphoneReturn.bookingReferenceLabel}: <span className="font-mono text-slate-700">{appointmentId}</span>
            </p>
          ) : null}
          {status === 'failed' ? (
            <p className="mt-4 text-left text-xs leading-relaxed text-slate-500">{copy.payphoneReturn.parametersMissingHint}</p>
          ) : null}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {status === 'approved' ? (
              <>
                <Link to="/" className="rounded-full bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white">
                  {copy.payphoneReturn.goHome}
                </Link>
                <Link to="/book" className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700">
                  {copy.payphoneReturn.backToBooking}
                </Link>
              </>
            ) : (
              <>
                <Link to="/book" className="rounded-full bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white">
                  {copy.payphoneReturn.backToBooking}
                </Link>
                <Link to="/" className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700">
                  {copy.payphoneReturn.goHome}
                </Link>
              </>
            )}
          </div>
        </section>
      </main>
    </Layout>
  );
}
