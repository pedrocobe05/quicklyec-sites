import { FormEvent, useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import {
  createPlatformRole,
  deletePlatformRole,
  getPlatformRoles,
  updatePlatformRole,
} from '../lib/api';
import { Modal } from '../shared/components/modal/Modal';
import { Button } from '../shared/components/ui/Button';
import { Card } from '../shared/components/ui/Card';
import { DataTable, DataTablePagination, DataTableShell, DataTableToolbar } from '../shared/components/ui/DataTable';
import { FormField } from '../shared/components/forms/FormField';
import { Input } from '../shared/components/ui/Input';
import { Skeleton } from '../shared/components/ui/Skeleton';
import { Textarea } from '../shared/components/ui/Textarea';
import { useNotification } from '../shared/notifications/use-notification';

interface PlatformRoleRecord {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  isActive: boolean;
  permissions: string[];
}

export function PlatformRolesPage() {
  const token = localStorage.getItem('qs_access_token');
  const user = JSON.parse(localStorage.getItem('qs_user') ?? 'null') as { isPlatformAdmin?: boolean } | null;
  const { notify } = useNotification();
  const [roles, setRoles] = useState<PlatformRoleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PlatformRoleRecord | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const pageSize = 8;
  const filteredRoles = roles.filter((role) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [role.name, role.code, role.description ?? ''].some((value) =>
      String(value).toLowerCase().includes(query),
    );
  });
  const pageCount = Math.max(1, Math.ceil(filteredRoles.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRoles = filteredRoles.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  async function loadData() {
    if (!token) return;
    const data = (await getPlatformRoles(token)) as PlatformRoleRecord[];
    setRoles(data);
  }

  useEffect(() => {
    if (!token) return;
    loadData()
      .catch((err: Error) => notify(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      const payload = {
        code: String(form.get('code') ?? ''),
        name: String(form.get('name') ?? ''),
        description: String(form.get('description') ?? ''),
        permissions: String(form.get('permissions') ?? '')
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
        isActive: form.get('isActive') === 'on',
      };

      if (editing) {
        await updatePlatformRole(token, editing.id, payload);
      } else {
        await createPlatformRole(token, payload);
      }

      await loadData();
      setOpen(false);
      setEditing(null);
      notify('Rol de plataforma guardado.', 'success');
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout isPlatformAdmin={Boolean(user?.isPlatformAdmin)} currentPath="/platform/roles">
      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Roles de plataforma</h2>
            <p className="mt-1 text-sm text-slate-500">Define y administra los roles globales del panel de plataforma.</p>
          </div>
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            Nuevo rol
          </Button>
        </div>

        <DataTableShell>
          <DataTableToolbar
            summary={`${filteredRoles.length} rol${filteredRoles.length === 1 ? '' : 'es'}`}
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Buscar por nombre, código o descripción..."
          />
          <DataTable>
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Permisos</th>
                <th className="px-4 py-3">Estado</th>
                <th className="w-px whitespace-nowrap px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <tr key={`platform-role-skeleton-${index}`} className="border-t border-slate-200">
                    <td className="px-4 py-3" colSpan={5}>
                      <div className="grid gap-3 md:grid-cols-[1.2fr_0.5fr_0.4fr_0.4fr_0.9fr] md:items-center">
                        <Skeleton className="h-16" />
                        <Skeleton className="h-12" />
                        <Skeleton className="h-12" />
                        <Skeleton className="h-12" />
                        <Skeleton className="h-12" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : filteredRoles.length === 0 ? (
                <tr><td className="px-4 py-4 text-slate-500" colSpan={5}>No hay roles configurados.</td></tr>
              ) : (
                visibleRoles.map((role) => (
                  <tr key={role.id} className="border-t border-slate-200">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{role.name}</p>
                      <p className="text-xs text-slate-500">{role.description || 'Sin descripción'}</p>
                    </td>
                    <td className="px-4 py-3">{role.code}</td>
                    <td className="px-4 py-3">{role.permissions.length}</td>
                    <td className="px-4 py-3">{role.isActive ? 'Activo' : 'Inactivo'}</td>
                    <td className="w-px whitespace-nowrap px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" className="h-9 px-4 text-xs font-semibold" onClick={() => { setEditing(role); setOpen(true); }}>
                          Editar
                        </Button>
                        <Button
                          variant="danger"
                          className="h-9 px-4 text-xs font-semibold"
                          onClick={async () => {
                            if (!token) return;
                            try {
                              await deletePlatformRole(token, role.id);
                              await loadData();
                              notify('Rol desactivado.', 'success');
                            } catch (err) {
                              notify((err as Error).message, 'error');
                            }
                          }}
                        >
                          Desactivar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </DataTable>
          <DataTablePagination
            page={currentPage}
            pageCount={pageCount}
            pageSize={pageSize}
            totalItems={filteredRoles.length}
            onPageChange={setPage}
          />
        </DataTableShell>
      </Card>

      <Modal
        open={open}
        onClose={() => { setOpen(false); setEditing(null); }}
        title={editing ? 'Editar rol de plataforma' : 'Nuevo rol de plataforma'}
        maxWidthClassName="max-w-2xl"
      >
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Nombre" required>
              <Input name="name" defaultValue={editing?.name ?? ''} />
            </FormField>
            <FormField label="Código" required>
              <Input name="code" defaultValue={editing?.code ?? 'super_admin'} readOnly={Boolean(editing?.isSystem)} />
            </FormField>
          </div>
          <FormField label="Descripción">
            <Input name="description" defaultValue={editing?.description ?? ''} />
          </FormField>
          <FormField label="Permisos">
            <Textarea
              name="permissions"
              defaultValue={(editing?.permissions ?? []).join(', ')}
              className="min-h-24"
            />
          </FormField>
          <label className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
            <input type="checkbox" name="isActive" defaultChecked={editing ? editing.isActive : true} />
            Activo
          </label>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => { setOpen(false); setEditing(null); }}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={saving} loadingLabel="Guardando...">
              Guardar
            </Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
