import { Layout } from '../components/Layout';
import { PageErrorState } from '../components/PageErrorState';
import { PageLoadingShell } from '../components/PageLoadingShell';
import { TemplateRenderer } from '../components/TemplateRenderer';
import { useSiteConfig } from '../lib/useSiteConfig';

export function ContactPage() {
  const { data, loading, error } = useSiteConfig('/contacto');

  if (loading) {
    return (
      <PageLoadingShell
        eyebrow="Cargando contacto"
        title="Estamos preparando los canales de atención y los bloques editoriales."
        description="La vista se está montando con una transición más suave para que la experiencia se sienta continua."
      />
    );
  }
  if (!data || error) return <PageErrorState />;

  return (
    <Layout site={data}>
      <main className="mx-auto max-w-6xl px-6 py-12">
        <section className="grid gap-8 md:grid-cols-[1.05fr,0.95fr]">
          <div className="rounded-[2rem] border border-black/5 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(245,239,233,0.92))] p-10 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <p className="text-xs uppercase tracking-[0.4em] text-[var(--accent)]">Contacto</p>
            <h1 className="mt-4 font-serif text-5xl leading-[0.98] text-slate-900 md:text-6xl">Conversemos sobre tu próxima cita.</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Este bloque de demo muestra cómo una marca puede presentar sus canales de contacto de forma cálida, profesional y ordenada.
            </p>
          </div>
          <div className="rounded-[2rem] border border-black/5 bg-white/90 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <p className="text-[0.7rem] uppercase tracking-[0.35em] text-[var(--accent)]">Canales disponibles</p>
            <div className="mt-6 grid gap-4">
              <div className="rounded-[1.5rem] bg-[var(--secondary)] px-5 py-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Correo</p>
                <p className="mt-2 text-lg text-slate-900">{data.tenant.contactEmail ?? 'demo@quicklyecsites.local'}</p>
              </div>
              <div className="rounded-[1.5rem] bg-[var(--secondary)] px-5 py-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Teléfono</p>
                <p className="mt-2 text-lg text-slate-900">{data.tenant.contactPhone ?? '+593 999 999 999'}</p>
              </div>
              <div className="rounded-[1.5rem] bg-[var(--secondary)] px-5 py-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">WhatsApp</p>
                <p className="mt-2 text-lg text-slate-900">{data.tenant.whatsappNumber ?? '+593 999 999 999'}</p>
              </div>
            </div>
          </div>
        </section>
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
