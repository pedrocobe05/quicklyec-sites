import { FormEvent, useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import {
  createPlatformUser,
  deletePlatformUser,
  getPlatformRoles,
  getPlatformUsers,
  updatePlatformUser,
} from '../lib/api';
import { Modal } from '../shared/components/modal/Modal';
import { Button } from '../shared/components/ui/Button';
import { Card } from '../shared/components/ui/Card';
import { DataTable, DataTablePagination, DataTableShell, DataTableToolbar } from '../shared/components/ui/DataTable';
import { FormField } from '../shared/components/forms/FormField';
import { Input } from '../shared/components/ui/Input';
import { Select } from '../shared/components/ui/Select';
import { Skeleton } from '../shared/components/ui/Skeleton';
import { useNotification } from '../shared/notifications/use-notification';

interface PlatformUserRecord {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  platformRole: string;
}

interface PlatformRoleRecord {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

export function PlatformUsersPage() {
  const token = localStorage.getItem('qs_access_token');
  const user = JSON.parse(localStorage.getItem('qs_user') ?? 'null') as { isPlatformAdmin?: boolean } | null;
  const { notify } = useNotification();
  const [users, setUsers] = useState<PlatformUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<PlatformRoleRecord[]>([]);
  const [editing, setEditing] = useState<PlatformUserRecord | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const pageSize = 8;
  const filteredUsers = users.filter((platformUser) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [platformUser.fullName, platformUser.email, platformUser.platformRole].some((value) =>
      String(value).toLowerCase().includes(query),
    );
  });
  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  async function loadData() {
    if (!token) return;
    const [usersData, rolesData] = (await Promise.all([
      getPlatformUsers(token),
      getPlatformRoles(token),
    ])) as [PlatformUserRecord[], PlatformRoleRecord[]];
    setUsers(usersData);
    setRoles(rolesData.filter((role) => role.isActive));
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
        fullName: String(form.get('fullName') ?? ''),
        email: String(form.get('email') ?? ''),
        password: String(form.get('password') ?? ''),
        platformRole: String(form.get('platformRole') ?? 'super_admin'),
        isActive: form.get('isActive') === 'on',
      };

      if (editing) {
        await updatePlatformUser(token, editing.id, {
          fullName: payload.fullName,
          email: payload.email,
          password: payload.password || undefined,
          platformRole: payload.platformRole,
          isActive: payload.isActive,
        });
      } else {
        await createPlatformUser(token, payload);
      }

      await loadData();
      setOpen(false);
      setEditing(null);
      notify('Usuario de plataforma guardado.', 'success');
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout isPlatformAdmin={Boolean(user?.isPlatformAdmin)} currentPath="/platform/users">
      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Usuarios de plataforma</h2>
            <p className="mt-1 text-sm text-slate-500">
              Crea y administra usuarios con acceso global al panel.
            </p>
          </div>
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            Nuevo administrador
          </Button>
        </div>

        <DataTableShell>
          <DataTableToolbar
            summary={`${filteredUsers.length} usuario${filteredUsers.length === 1 ? '' : 's'}`}
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Buscar por nombre, correo o rol..."
          />
          <DataTable>
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Estado</th>
                <th className="w-px whitespace-nowrap px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <tr key={`platform-user-skeleton-${index}`} className="border-t border-slate-200">
                    <td className="px-4 py-3" colSpan={4}>
                      <div className="grid gap-3 md:grid-cols-[1.3fr_0.5fr_0.5fr_0.9fr] md:items-center">
                        <Skeleton className="h-16" />
                        <Skeleton className="h-12" />
                        <Skeleton className="h-12" />
                        <Skeleton className="h-12" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-slate-500" colSpan={4}>No hay usuarios de plataforma.</td>
                </tr>
              ) : (
                visibleUsers.map((platformUser) => (
                  <tr key={platformUser.id} className="border-t border-slate-200">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{platformUser.fullName}</p>
                      <p className="text-xs text-slate-500">{platformUser.email}</p>
                    </td>
                    <td className="px-4 py-3">{platformUser.platformRole}</td>
                    <td className="px-4 py-3">{platformUser.isActive ? 'Activo' : 'Inactivo'}</td>
                    <td className="w-px whitespace-nowrap px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" className="h-9 px-4 text-xs font-semibold" onClick={() => { setEditing(platformUser); setOpen(true); }}>
                          Editar
                        </Button>
                        <Button
                          variant="danger"
                          className="h-9 px-4 text-xs font-semibold"
                          onClick={async () => {
                            if (!token) return;
                            try {
                              await deletePlatformUser(token, platformUser.id);
                              await loadData();
                              notify('Usuario desactivado.', 'success');
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
            totalItems={filteredUsers.length}
            onPageChange={setPage}
          />
        </DataTableShell>
      </Card>

      <Modal
        open={open}
        onClose={() => { setOpen(false); setEditing(null); }}
        title={editing ? 'Editar usuario de plataforma' : 'Nuevo usuario de plataforma'}
        maxWidthClassName="max-w-2xl"
      >
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <FormField label="Nombre completo" required>
            <Input name="fullName" defaultValue={editing?.fullName ?? ''} />
          </FormField>
          <FormField label="Correo" required>
            <Input name="email" type="email" defaultValue={editing?.email ?? ''} />
          </FormField>
          <FormField label="Contraseña" optional>
            <Input name="password" type="password" placeholder={editing ? 'Dejar vacío para mantener' : 'Contraseña inicial'} />
          </FormField>
          <FormField label="Rol">
            <Select name="platformRole" defaultValue={editing?.platformRole ?? roles[0]?.code ?? 'super_admin'}>
              {roles.map((role) => (
                <option key={role.id} value={role.code}>
                  {role.name}
                </option>
              ))}
            </Select>
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
