type PageLoadingShellProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PageLoadingShell({ eyebrow, title, description }: PageLoadingShellProps) {
  return (
    <main className="mx-auto flex min-h-[58vh] max-w-6xl items-center justify-center px-6 py-12 animate-route-in">
      <div className="max-w-xl rounded-[2rem] border border-black/5 bg-white/72 px-8 py-7 text-center shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <p className="text-[0.72rem] uppercase tracking-[0.34em] text-[var(--accent)]">{eyebrow}</p>
        <h1 className="mt-4 font-serif text-3xl text-slate-900 md:text-4xl">{title}</h1>
        <p className="mt-3 text-base leading-7 text-slate-600">{description}</p>
        <div className="mt-6 flex flex-col items-center gap-4">
          <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(15,59,87,0.06)]">
            <span className="absolute inset-0 rounded-full border border-[rgba(107,170,155,0.22)]" />
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--primary)] border-r-transparent" />
          </span>
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-black/5">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-[linear-gradient(90deg,var(--accent),var(--primary))]" />
          </div>
        </div>
      </div>
    </main>
  );
}
