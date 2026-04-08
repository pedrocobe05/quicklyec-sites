type PageLoadingShellProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PageLoadingShell({ eyebrow: _eyebrow, title: _title, description: _description }: PageLoadingShellProps) {
  return (
    <main className="mx-auto flex min-h-[58vh] max-w-6xl items-center justify-center px-6 py-12 animate-route-in">
      <div className="flex flex-col items-center gap-4 rounded-full border border-black/5 bg-white/72 px-6 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(15,59,87,0.06)]">
          <span className="absolute inset-0 rounded-full border border-[rgba(107,170,155,0.22)]" />
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--primary)] border-r-transparent" />
        </span>
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-black/5">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-[linear-gradient(90deg,var(--accent),var(--primary))]" />
        </div>
      </div>
    </main>
  );
}
