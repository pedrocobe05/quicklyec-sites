import { Layout } from '../components/Layout';
import { PageErrorState } from '../components/PageErrorState';
import { PageLoadingShell } from '../components/PageLoadingShell';
import { TemplateRenderer } from '../components/TemplateRenderer';
import { useSiteConfig } from '../lib/useSiteConfig';

export function HomePage() {
  const { data, loading, error } = useSiteConfig('/');

  if (loading) {
    return (
      <PageLoadingShell
        eyebrow="Cargando sitio"
        title="Preparando una experiencia visual más suave y continua."
        description="Estamos cargando las secciones, estilos y contenido del sitio para que la transición se sienta natural."
      />
    );
  }

  if (!data || error) {
    return <PageErrorState />;
  }

  return (
    <Layout site={data}>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <TemplateRenderer site={data} />
      </main>
    </Layout>
  );
}
