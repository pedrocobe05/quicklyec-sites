import { Layout } from '../components/Layout';
import { PageErrorState } from '../components/PageErrorState';
import { PageLoadingShell } from '../components/PageLoadingShell';
import { TemplateRenderer } from '../components/TemplateRenderer';
import { useSiteConfig } from '../lib/useSiteConfig';
import { usePublicCopy } from '../lib/public-language';

export function HomePage() {
  const { data, loading, error } = useSiteConfig('/');
  const copy = usePublicCopy();

  if (loading) {
    return (
      <PageLoadingShell
        eyebrow={copy.home.loading.eyebrow}
        title={copy.home.loading.title}
        description={copy.home.loading.description}
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
