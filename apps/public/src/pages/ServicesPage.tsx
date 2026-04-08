import { Layout } from '../components/Layout';
import { PageErrorState } from '../components/PageErrorState';
import { PageLoadingShell } from '../components/PageLoadingShell';
import { TemplateRenderer } from '../components/TemplateRenderer';
import { useSiteConfig } from '../lib/useSiteConfig';

export function ServicesPage() {
  const { data, loading, error } = useSiteConfig('/servicios');

  if (loading) {
    return (
      <PageLoadingShell
        eyebrow="Cargando servicios"
        title="Estamos preparando el catálogo con una transición más agradable."
        description="Se están cargando los bloques, tarjetas y contenido para que el cambio de página no se sienta abrupto."
      />
    );
  }
  if (!data || error) return <PageErrorState />;

  return (
    <Layout site={data}>
      <main className="mx-auto max-w-6xl px-6 py-12">
        <section className="rounded-[2rem] border border-black/5 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(245,239,233,0.92))] p-10 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <p className="text-xs uppercase tracking-[0.4em] text-[var(--accent)]">Servicios disponibles</p>
          <h1 className="mt-4 font-serif text-5xl leading-[0.98] text-slate-900 md:text-6xl">Explora la oferta disponible y encuentra la atención que necesitas.</h1>≈
        </section>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {data.services.map((service) => (
            <article key={service.id} className="rounded-[2rem] border border-black/5 bg-white/90 p-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[0.68rem] uppercase tracking-[0.35em] text-[var(--accent)]">Servicio</p>
                  <h2 className="mt-3 font-serif text-3xl text-slate-900">{service.name}</h2>
                  <p className="mt-4 text-base leading-7 text-slate-600">{service.description}</p>
                </div>
                <div className="rounded-[1.25rem] bg-[var(--secondary)] px-4 py-3 text-right text-sm text-slate-600 shadow-sm">
                  <p>{service.durationMinutes} min</p>
                  <p className="mt-1 font-medium text-slate-900">{service.price ? `$${service.price}` : 'Consultar precio'}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
        {data.page.sections.some((section) => section.type === 'custom_html') ? (
          <div className="mt-10">
            <TemplateRenderer
              site={{
                ...data,
                page: {
                  ...data.page,
                  sections: data.page.sections.filter((section) => section.type === 'custom_html'),
                },
              }}
            />
          </div>
        ) : null}
      </main>
    </Layout>
  );
}
