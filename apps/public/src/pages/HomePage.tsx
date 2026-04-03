import { Layout } from '../components/Layout';
import { TemplateRenderer } from '../components/TemplateRenderer';
import { useSiteConfig } from '../lib/useSiteConfig';

export function HomePage() {
  const { data, loading, error } = useSiteConfig('/');

  if (loading) {
    return <div className="p-10 text-slate-600">Cargando sitio...</div>;
  }

  if (!data || error) {
    return <div className="p-10 text-red-600">No se pudo cargar el sitio: {error}</div>;
  }

  return (
    <Layout site={data}>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <TemplateRenderer site={data} />
      </main>
    </Layout>
  );
}
