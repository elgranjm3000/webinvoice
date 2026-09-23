export const dynamic = "force-dynamic";

import { supabaseServer } from "@/lib/supabase";
import { PageHeader, EmptyState, Modal, RowMenu } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { permisos, MODULOS } from "@/lib/permisos";
import {
  crearUsuario,
  cambiarRol,
  quitarUsuario,
  crearRol,
  actualizarRol,
  eliminarRol,
} from "./actions";

const inp =
  "mt-1.5 w-full border border-regla bg-white px-3 py-2 text-[14px] focus:border-verde focus:outline-none";

export default async function Usuarios({
  searchParams,
}: {
  searchParams: Promise<{
    ok?: string;
    error?: string;
    nuevo?: string;
    rol?: string;
  }>;
}) {
  const { ok, error: notice, nuevo, rol } = await searchParams;
  const p = await permisos();

  if (!p.esAdmin) {
    return (
      <>
        <PageHeader title="Usuarios y roles" />
        <EmptyState
          title="Solo administradores"
          hint="Pide a un administrador que te asigne el acceso a esta sección."
        />
      </>
    );
  }

  const sb = supabaseServer();
  const [{ data: roles }, { data: links }] = await Promise.all([
    sb.from("roles").select("id, name, modules").order("name"),
    sb
      .from("company_users")
      .select("id, user_id, role, role_id, created_at")
      .order("created_at"),
  ]);

  // Correos de los usuarios vinculados, vía API de administración.
  const { data: allUsers } = await sb.auth.admin.listUsers();
  const emailDe = new Map(
    (allUsers?.users ?? []).map((u) => [u.id, u.email ?? "—"])
  );

  const misLinks = (links ?? []).filter(
    (l) => !p.companyId || true // se filtra por empresa al vincular; muestra todos los vinculados
  );
  const rolNombre = (roleId: string | null, legacy: string | null) =>
    (roles ?? []).find((r) => r.id === roleId)?.name ??
    legacy ??
    "—";

  const rolEditando = rol
    ? (roles ?? []).find((r) => r.id === rol) ?? null
    : null;

  const inputCls = `mt-1.5 ${inp}`;

  return (
    <>
      <PageHeader
        title="Usuarios y roles"
        subtitle="Define qué módulos ve cada rol y crea los accesos de tu equipo"
        action={
          <a href="/usuarios?nuevo=1" className="bg-verde px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[#0d5f58]">
            Crear usuario
          </a>
        }
      />

      {notice && (
        <p role="alert" className="mb-6 border-l-2 border-rojo bg-white px-4 py-3 text-[14px] text-rojo">
          {notice}
        </p>
      )}
      {ok && (
        <p className="mb-6 border-l-2 border-verde bg-white px-4 py-3 text-[14px] text-verde">
          {ok}
        </p>
      )}

      {/* Modal: alta de usuario */}
      <Modal open={nuevo === "1"} title="Crear usuario" onCloseHref="/usuarios">
        <form action={crearUsuario}>
          <label className="block text-[13px] font-medium text-tinta-suave">
            Correo de acceso
            <input type="email" name="email" required autoFocus placeholder="nombre@empresa.com" className={`num ${inputCls}`} />
          </label>
          <label className="mt-4 block text-[13px] font-medium text-tinta-suave">
            Contraseña temporal (mín. 8)
            <input type="text" name="password" required minLength={8} placeholder="cámbiala al entrar" className={`num ${inputCls}`} />
          </label>
          <label className="mt-4 block text-[13px] font-medium text-tinta-suave">
            Rol
            <select name="role_id" required className={inputCls}>
              <option value="">Selecciona un rol…</option>
              {(roles ?? []).map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </label>
          {(roles ?? []).length === 0 && (
            <p className="mt-2 text-[12px] text-rojo">
              Primero crea un rol más abajo.
            </p>
          )}
          <button type="submit" className="mt-6 min-h-[44px] w-full rounded-md bg-verde px-6 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-[#0d5f58]">
            Crear usuario
          </button>
        </form>
      </Modal>

      {/* Modal: edición de rol */}
      <Modal
        open={Boolean(rolEditando)}
        title={rolEditando ? `Editar rol: ${rolEditando.name}` : "Editar rol"}
        onCloseHref="/usuarios"
      >
        {rolEditando && (
          <form action={actualizarRol}>
            <input type="hidden" name="id" value={rolEditando.id} />
            <label className="block text-[13px] font-medium text-tinta-suave">
              Nombre del rol
              <input name="name" required maxLength={60} defaultValue={rolEditando.name} className={inputCls} />
            </label>
            <p className="mt-4 text-[13px] font-medium text-tinta-suave">Módulos visibles</p>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {MODULOS.map((m) => (
                <label key={m.href} className="flex items-center gap-2 text-[13px] text-tinta">
                  <input
                    type="checkbox"
                    name="modulos"
                    value={m.href}
                    defaultChecked={((rolEditando.modules as string[]) ?? []).includes(m.href)}
                    className="h-4 w-4 accent-[#0F766E]"
                  />
                  {m.label}
                </label>
              ))}
            </div>
            <div className="mt-6 flex items-center gap-4">
              <button type="submit" className="rounded-md bg-verde px-6 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-[#0d5f58]">
                Guardar rol
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Usuarios de la empresa */}
      <section className="mb-12">
        <h2 className="mb-4 text-[15px] font-semibold tracking-tight">Usuarios con acceso</h2>
        {misLinks.length === 0 ? (
          <EmptyState title="Sin usuarios todavía" hint="Crea el primero con el botón de arriba." />
        ) : (
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-regla text-left text-[12px] text-tinta-suave">
                <th className="py-2 pr-4 font-medium">Correo</th>
                <th className="py-2 pr-4 font-medium">Rol</th>
                <th className="py-2 pl-4 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {misLinks.map((l) => (
                <tr key={l.id} className="border-b border-regla">
                  <td className="py-3 pr-4">{emailDe.get(l.user_id) ?? l.user_id.slice(0, 8)}</td>
                  <td className="py-3 pr-4">
                    <span className="rounded-full bg-verde-claro/40 px-2.5 py-0.5 text-[12px] font-medium text-verde">
                      {rolNombre(l.role_id, l.role)}
                    </span>
                  </td>
                  <td className="py-3 pl-4 text-right">
                    <RowMenu editHref={`/usuarios?edit=${l.id}`}>
                      <form action={quitarUsuario}>
                        <input type="hidden" name="id" value={l.id} />
                        <DeleteButton name={emailDe.get(l.user_id) ?? "este usuario"} label="Quitar acceso" />
                      </form>
                    </RowMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Roles */}
      <section>
        <h2 className="mb-4 text-[15px] font-semibold tracking-tight">Roles</h2>

        {/* Nuevo rol */}
        <form action={crearRol} className="card mb-6 p-5">
          <div className="flex flex-wrap items-end gap-4">
            <label className="block text-[13px] font-medium text-tinta-suave">
              Nombre del rol
              <input name="name" required maxLength={60} placeholder="Vendedor, Cajero…" className={`w-56 ${inputCls}`} />
            </label>
            <button type="submit" className="min-h-[42px] rounded-md bg-tinta px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[#1f2937]">
              Crear rol
            </button>
            <p className="text-[12px] text-tinta-suave">
              Tras crearlo, edítalo para elegir sus módulos.
            </p>
          </div>
        </form>

        {(roles ?? []).length === 0 ? (
          <EmptyState title="Sin roles definidos" hint="Crea roles como «Vendedor» y marca solo Facturas y Por cobrar." />
        ) : (
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-regla text-left text-[12px] text-tinta-suave">
                <th className="py-2 pr-4 font-medium">Rol</th>
                <th className="py-2 pr-4 font-medium">Módulos visibles</th>
                <th className="py-2 pl-4 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {(roles ?? []).map((r) => {
                const mods = (r.modules as string[]) ?? [];
                const etiquetas = mods
                  .map((m) => MODULOS.find((x) => x.href === m)?.label ?? m)
                  .slice(0, 6);
                return (
                  <tr key={r.id} className="border-b border-regla">
                    <td className="py-3 pr-4 font-medium">{r.name}</td>
                    <td className="py-3 pr-4 text-[13px] text-tinta-suave">
                      {mods.length === 0
                        ? "sin módulos asignados"
                        : `${etiquetas.join(", ")}${mods.length > 6 ? ` y ${mods.length - 6} más` : ""}`}
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <RowMenu editHref={`/usuarios?rol=${r.id}`}>
                        <form action={eliminarRol}>
                          <input type="hidden" name="id" value={r.id} />
                          <DeleteButton name="este rol" label="Eliminar rol" />
                        </form>
                      </RowMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
