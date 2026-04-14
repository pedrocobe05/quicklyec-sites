import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Modal } from '../../../shared/components/modal/Modal';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { Textarea } from '../../../shared/components/ui/Textarea';
import { Select } from '../../../shared/components/ui/Select';
import { Checkbox } from '../../../shared/components/ui/Checkbox';
import { FormField } from '../../../shared/components/forms/FormField';
import { ImagePreview } from '../../../shared/components/ui/ImagePreview';

interface PageRecord {
  id: string;
  slug: string;
  title: string;
  isHome: boolean;
  isPublished: boolean;
  ogImageUrl?: string | null;
  template?: {
    name: string;
  };
}

interface SectionRecord {
  id: string;
  scope?: 'global' | 'page';
  pageId?: string | null;
  type: string;
  variant: string;
  position: number;
  isVisible: boolean;
  content: Record<string, unknown>;
}

function pickSectionPreview(section: SectionRecord) {
  const directImage = typeof section.content.imageUrl === 'string' ? section.content.imageUrl : null;
  if (directImage) {
    return directImage;
  }

  const assets = Array.isArray(section.content.assets)
    ? (section.content.assets as Array<{ url?: string | null }>)
    : [];
  if (typeof assets[0]?.url === 'string') {
    return assets[0].url;
  }

  const items = Array.isArray(section.content.items)
    ? (section.content.items as Array<{ imageUrl?: string | null }>)
    : [];
  if (typeof items[0]?.imageUrl === 'string') {
    return items[0].imageUrl;
  }

  return null;
}

interface SiteSectionProps {
  saving: string | null;
  pages: PageRecord[];
  globalSections: SectionRecord[];
  sections: SectionRecord[];
  selectedPage: PageRecord | null;
  selectedPageId: string;
  maxPages?: number | null;
  onSelectPage: (pageId: string) => void;
  onCreatePage: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onCreateSection: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onEditPage: (page: PageRecord) => void;
  onEditSection: (section: SectionRecord) => void;
  onUploadPageImage: (page: PageRecord, file: File) => void;
  onUploadSectionImage: (section: SectionRecord, file: File) => void;
  onUploadSectionAssets: (section: SectionRecord, files: FileList | File[]) => void;
  sectionTypeOptions: Array<{ value: string; label: string; description?: string }>;
  itemRow: (props: {
    title: string;
    subtitle: string;
    meta?: string;
    visual?: React.ReactNode;
    actionLabel: string;
    onAction: () => void;
    uploadSlot?: React.ReactNode;
    disabled?: boolean;
  }) => JSX.Element;
}

export function SiteSection({
  saving,
  pages,
  globalSections,
  sections,
  selectedPage,
  selectedPageId,
  maxPages,
  onSelectPage,
  onCreatePage,
  onCreateSection,
  onEditPage,
  onEditSection,
  onUploadPageImage,
  onUploadSectionImage,
  onUploadSectionAssets,
  sectionTypeOptions,
  itemRow,
}: SiteSectionProps) {
  const [activeView, setActiveView] = useState<'pages' | 'global' | 'sections'>('pages');
  const [createPageOpen, setCreatePageOpen] = useState(false);
  const [createSectionOpen, setCreateSectionOpen] = useState(false);
  const [createSectionType, setCreateSectionType] = useState(sectionTypeOptions[0]?.value ?? 'hero');

  const orderedPages = useMemo(() => {
    const orderMap: Record<string, number> = { home: 0, servicios: 1, contacto: 2 };
    return [...pages].sort((a, b) => {
      const orderA = orderMap[a.slug] ?? 99;
      const orderB = orderMap[b.slug] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.title.localeCompare(b.title);
    });
  }, [pages]);

  const selectedPageLabel = selectedPage?.isHome ? 'Inicio' : selectedPage?.title ?? 'Selecciona página';
  const canCreatePages = typeof maxPages !== 'number' || pages.length < maxPages;
  const sectionCreationScope = activeView === 'global' ? 'global' : 'page';
  const currentSections = activeView === 'global' ? globalSections : sections;
  const createableTypeOptions = sectionTypeOptions.filter((option) =>
    sectionCreationScope === 'global'
      ? ['header', 'footer', 'custom_html'].includes(option.value)
      : !['header', 'footer'].includes(option.value),
  );

  useEffect(() => {
    if (!createableTypeOptions.some((option) => option.value === createSectionType)) {
      setCreateSectionType(createableTypeOptions[0]?.value ?? 'hero');
    }
  }, [createSectionType, createableTypeOptions]);

  useEffect(() => {
    if (selectedPageId) {
      setActiveView('sections');
    }
  }, [selectedPageId]);

  return (
    <>
      <article id="site" className="rounded-[2rem] bg-white p-6 shadow-sm scroll-mt-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-serif text-2xl">Sitio</h3>
            <p className="mt-1 text-sm text-slate-500">Administra las páginas base y las secciones de cada página.</p>
          </div>
          <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              className={`rounded-full px-4 py-2 text-sm font-medium ${activeView === 'pages' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
              onClick={() => setActiveView('pages')}
            >
              Páginas
            </button>
            <button
              type="button"
              className={`rounded-full px-4 py-2 text-sm font-medium ${activeView === 'global' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
              onClick={() => setActiveView('global')}
            >
              Globales
            </button>
            <button
              type="button"
              className={`rounded-full px-4 py-2 text-sm font-medium ${activeView === 'sections' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
              onClick={() => setActiveView('sections')}
            >
              Secciones
            </button>
          </div>
        </div>
        {activeView === 'pages' ? (
          <>
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600">
              Estas son las páginas base del sitio. Desde aquí editas la página y eliges cuál quieres gestionar en el apartado de secciones.
            </div>
            <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600">
              <span>
                {typeof maxPages === 'number'
                  ? `Páginas usadas: ${pages.length} de ${maxPages}`
                  : `Páginas usadas: ${pages.length}`}
              </span>
              <Button type="button" disabled={!canCreatePages} onClick={() => setCreatePageOpen(true)}>
                Nueva página
              </Button>
            </div>
            <div className="mt-6 grid gap-3">
              {orderedPages.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  className={`rounded-2xl border p-4 text-left transition ${selectedPageId === page.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                  onClick={() => {
                    onSelectPage(page.id);
                    setActiveView('sections');
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <ImagePreview src={page.ogImageUrl} alt={`OG ${page.title}`} label="OG" className="h-20 w-20 shrink-0" />
                      <div>
                        <p className="font-medium text-slate-900">{page.isHome ? 'Inicio' : page.title}</p>
                        <p className="mt-1 text-sm text-slate-600">/{page.isHome ? '' : page.slug}</p>
                        <p className="mt-1 text-xs text-slate-500">{page.isPublished ? 'Publicada' : 'Borrador'}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                      Gestionar secciones
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-9 px-4 text-xs font-semibold"
                      onClick={(event) => {
                        event.stopPropagation();
                        onEditPage(page);
                      }}
                    >
                      {saving === `edit-page-${page.id}` ? 'Guardando...' : 'Editar página'}
                    </Button>
                    <label
                      className="inline-flex cursor-pointer items-center justify-center rounded-full border border-[rgba(15,23,42,0.08)] bg-slate-50 px-4 py-2 text-xs font-medium text-slate-700"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.currentTarget.files?.[0];
                          if (file) onUploadPageImage(page, file);
                          event.currentTarget.value = '';
                        }}
                      />
                      {saving === `upload-page-image-${page.id}` ? 'Subiendo imagen...' : 'Subir imagen OG'}
                    </label>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : activeView === 'global' ? (
          <>
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600">
              Las secciones globales se comparten en todas las páginas del sitio. Aquí viven el encabezado, el pie de página y bloques HTML globales.
              <div className="mt-4">
                <Button type="button" onClick={() => setCreateSectionOpen(true)}>
                  Nueva sección global
                </Button>
              </div>
            </div>
            <div className="mt-6 grid gap-3">
              {globalSections.length > 0 ? globalSections.map((section) =>
                itemRow({
                  title: `${section.position}. ${section.type}`,
                  subtitle: 'Global',
                  meta: section.type === 'custom_html'
                    ? `HTML personalizado · ${Array.isArray(section.content.assets) ? section.content.assets.length : 0} assets`
                    : String(section.content.title ?? section.content.subtitle ?? section.content.text ?? section.content.body ?? 'Sin contenido'),
                  visual: ['header', 'footer', 'custom_html'].includes(section.type)
                    ? undefined
                    : <ImagePreview src={pickSectionPreview(section)} alt={`Vista previa ${section.type}`} className="h-20 w-20" />,
                  actionLabel: saving === `edit-section-${section.id}` ? 'Guardando...' : 'Editar',
                  onAction: () => onEditSection(section),
                  uploadSlot: section.type === 'custom_html' ? (
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-[rgba(15,23,42,0.08)] bg-slate-50 px-4 py-2 text-xs font-medium text-slate-700">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(event) => {
                          if (event.currentTarget.files?.length) onUploadSectionAssets(section, event.currentTarget.files);
                          event.currentTarget.value = '';
                        }}
                      />
                      {saving === `upload-section-assets-${section.id}` ? 'Subiendo assets...' : 'Subir assets'}
                    </label>
                  ) : ['header', 'footer'].includes(section.type) ? undefined : (
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-[rgba(15,23,42,0.08)] bg-slate-50 px-4 py-2 text-xs font-medium text-slate-700">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.currentTarget.files?.[0];
                          if (file) onUploadSectionImage(section, file);
                          event.currentTarget.value = '';
                        }}
                      />
                      {saving === `upload-section-image-${section.id}` ? 'Subiendo imagen...' : 'Subir imagen'}
                    </label>
                  ),
                }),
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-sm text-slate-500">
                  Aún no hay secciones globales adicionales para este sitio.
                </div>
              )}
            </div>
          </>
        ) : selectedPage ? (
          <>
            <div className="mt-5 grid gap-4 lg:grid-cols-[320px,1fr]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Página activa</p>
                <div className="mt-3 grid gap-2">
                  {orderedPages.map((page) => (
                    <button
                      key={page.id}
                      type="button"
                      className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${selectedPageId === page.id ? 'border-slate-900 bg-white text-slate-900' : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-white'}`}
                      onClick={() => onSelectPage(page.id)}
                    >
                      <p className="font-medium">{page.isHome ? 'Inicio' : page.title}</p>
                      <p className="mt-1 text-xs text-slate-500">/{page.isHome ? '' : page.slug}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600">
                Estás editando la página <span className="font-semibold text-slate-900">{selectedPageLabel}</span>. Las secciones de esta vista pertenecen solo a esa página del tenant actual.
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="button" onClick={() => setCreateSectionOpen(true)}>
                    Nueva sección
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setActiveView('pages')}>
                    Volver a páginas
                  </Button>
                </div>
              </div>
            </div>
            <div className="mt-6 grid gap-3">
              {currentSections.length > 0 ? currentSections.map((section) =>
                itemRow({
                  title: `${section.position}. ${section.type}`,
                  subtitle: section.variant,
                  meta: section.type === 'custom_html'
                    ? `HTML personalizado · ${Array.isArray(section.content.assets) ? section.content.assets.length : 0} assets`
                    : String(section.content.title ?? section.content.body ?? 'Sin contenido'),
                  visual: section.type === 'custom_html'
                    ? undefined
                    : <ImagePreview src={pickSectionPreview(section)} alt={`Vista previa ${section.type}`} className="h-20 w-20" />,
                  actionLabel: saving === `edit-section-${section.id}` ? 'Guardando...' : 'Editar',
                  onAction: () => onEditSection(section),
                  uploadSlot: section.type === 'custom_html' ? (
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-[rgba(15,23,42,0.08)] bg-slate-50 px-4 py-2 text-xs font-medium text-slate-700">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(event) => {
                          if (event.currentTarget.files?.length) onUploadSectionAssets(section, event.currentTarget.files);
                          event.currentTarget.value = '';
                        }}
                      />
                      {saving === `upload-section-assets-${section.id}` ? 'Subiendo assets...' : 'Subir assets'}
                    </label>
                  ) : (
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-[rgba(15,23,42,0.08)] bg-slate-50 px-4 py-2 text-xs font-medium text-slate-700">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.currentTarget.files?.[0];
                          if (file) onUploadSectionImage(section, file);
                          event.currentTarget.value = '';
                        }}
                      />
                      {saving === `upload-section-image-${section.id}` ? 'Subiendo imagen...' : 'Subir imagen'}
                    </label>
                  ),
                }),
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-sm text-slate-500">
                  Esta página aún no tiene secciones. Usa <span className="font-medium text-slate-900">Nueva sección</span> para agregar la primera.
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="mt-5 text-sm text-slate-500">Selecciona una página para administrar sus secciones.</p>
        )}
      </article>
      <Modal
        open={createSectionOpen}
        onClose={() => setCreateSectionOpen(false)}
        title={`Nueva sección para ${selectedPageLabel}`}
        description="Agrega una nueva sección a la página seleccionada."
        maxWidthClassName="max-w-3xl"
      >
        <form
          className="grid gap-3"
          onSubmit={async (event) => {
            await Promise.resolve(onCreateSection(event));
            setCreateSectionOpen(false);
          }}
        >
          <input type="hidden" name="scope" value={sectionCreationScope} />
          <div className="grid gap-3 md:grid-cols-3">
            <FormField label="Tipo" required>
              <Select
                name="type"
                value={createSectionType}
                onChange={(event) => setCreateSectionType(event.target.value)}
              >
                {createableTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Variante">
              <Input name="variant" placeholder="Variante" />
            </FormField>
            <FormField label="Posición">
              <Input name="position" type="number" defaultValue={currentSections.length + 1} placeholder="Posición" />
            </FormField>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-xs text-slate-500">
            Tipos disponibles hoy: {createableTypeOptions.map((option) => option.label).join(', ')}.
          </div>
          {createSectionType === 'custom_html' ? (
            <>
              <FormField label="HTML personalizado">
                <Textarea
                  name="contentHtml"
                  placeholder="<section><h2>Contenido personalizado</h2><p>Bloque libre sanitizado.</p></section>"
                  className="min-h-40 font-mono text-xs"
                />
              </FormField>
              <FormField label="CSS personalizado">
                <Textarea
                  name="contentCss"
                  placeholder="& h2 { letter-spacing: 0.08em; }&#10;& .card { background: #f7f3ee; border-radius: 24px; }"
                  className="min-h-32 font-mono text-xs"
                />
              </FormField>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-xs text-slate-500">
                Después de crear la sección podrás subir varias imágenes y usarlas en el HTML con placeholders como <span className="font-mono text-slate-700">{'{{asset:mi-imagen}}'}</span>.
              </div>
            </>
          ) : (
            <>
              <FormField label="Contenido: título">
                <Input name="contentTitle" placeholder="Contenido: título" />
              </FormField>
              <FormField label="Contenido: descripción">
                <Textarea name="contentBody" placeholder="Contenido: descripción" className="min-h-20" />
              </FormField>
              <FormField label="Contenido: imagen">
                <Input name="contentImageUrl" placeholder="Referencia interna o URL pública" />
              </FormField>
            </>
          )}
          <label className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
            <Checkbox type="checkbox" name="isVisible" defaultChecked /> Visible
          </label>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setCreateSectionOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="rounded-full px-5 py-3 text-sm font-semibold">
              {saving === 'section' ? 'Guardando...' : 'Crear sección'}
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={createPageOpen}
        onClose={() => setCreatePageOpen(false)}
        title="Nueva página"
        description="Crea una nueva página dentro del límite permitido por el plan."
        maxWidthClassName="max-w-2xl"
      >
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            await Promise.resolve(onCreatePage(event));
            setCreatePageOpen(false);
          }}
        >
          <FormField label="Título" required>
            <Input name="title" placeholder="Galería, promociones, faq..." />
          </FormField>
          <FormField label="Slug" required>
            <Input name="slug" placeholder="galeria" />
          </FormField>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
              <Checkbox type="checkbox" name="isPublished" defaultChecked /> Publicada
            </label>
            <label className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
              <Checkbox type="checkbox" name="isIndexable" defaultChecked /> Indexable
            </label>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setCreatePageOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!canCreatePages}>
              Crear página
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
