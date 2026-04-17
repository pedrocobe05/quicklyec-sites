import { usePublicCopy } from '../lib/public-language';

interface PageErrorStateProps {
  title?: string;
  description?: string;
}

export function PageErrorState({
  title,
  description,
}: PageErrorStateProps) {
  const copy = usePublicCopy();
  const resolvedTitle = title ?? copy.shell.error.title;
  const resolvedDescription = description ?? copy.shell.error.description;

  return (
    <section className="mx-auto max-w-3xl px-6 py-14">
      <div className="rounded-[2rem] border border-black/5 bg-white/85 p-10 text-center shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-sm">
        <p className="text-[0.72rem] uppercase tracking-[0.34em] text-[var(--accent)]">{copy.shell.error.eyebrow}</p>
        <h1 className="mt-4 text-3xl font-semibold text-slate-900">{resolvedTitle}</h1>
        <p className="mt-3 text-base leading-7 text-slate-600">{resolvedDescription}</p>
      </div>
    </section>
  );
}
