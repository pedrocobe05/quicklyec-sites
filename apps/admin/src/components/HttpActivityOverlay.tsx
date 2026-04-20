import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../shared/utils/cn';

export default function HttpActivityOverlay() {
  const [pending, setPending] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    function handleStart() {
      setPending((c) => c + 1);
    }

    function handleEnd() {
      setPending((c) => Math.max(0, c - 1));
    }

    window.addEventListener('qs:http:start', handleStart as EventListener);
    window.addEventListener('qs:http:end', handleEnd as EventListener);

    return () => {
      window.removeEventListener('qs:http:start', handleStart as EventListener);
      window.removeEventListener('qs:http:end', handleEnd as EventListener);
    };
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (pending > 0) {
      timer = setTimeout(() => setShow(true), 140);
    } else {
      timer = setTimeout(() => setShow(false), 220);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [pending]);

  return createPortal(
    <div
      aria-hidden={!show}
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-[10040] flex justify-center px-4 transition-all duration-300',
        show ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0',
      )}
    >
      <div className="mt-4 w-full max-w-md overflow-hidden rounded-[1.6rem] border border-[rgba(0,1,32,0.08)] bg-[linear-gradient(135deg,rgba(6,12,42,0.94),rgba(15,23,42,0.9))] px-4 py-3 text-white shadow-[0_24px_80px_rgba(0,1,32,0.22)] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
            <span className="absolute inset-0 animate-ping rounded-full bg-[rgba(255,203,48,0.12)]" />
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/80 border-r-transparent" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-[0.08em] text-white">Cargando...</p>
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-[linear-gradient(90deg,#ffcb30,#ffffff)]" />
        </div>
      </div>
    </div>,
    document.body,
  );
}
