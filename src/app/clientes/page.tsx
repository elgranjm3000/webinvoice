export const dynamic = "force-dynamic";

import { supabaseServer } from "@/lib/supabase";
import { PageHeader, EmptyState } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { TableSearch } from "@/components/TableSearch";
import { Modal } from "@/components/ui";
import { createCustomer, updateCustomer, deleteCustomer } from "./actions";

type Customer = {
  id: string;
  tax_id: string;
  legal_name: string;
  id_type: string;
  fiscal_address: string | null;
  phone: string | null;
  is_special_taxpayer: boolean | null;
};

export default async function Clientes({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; edit?: string; q?: string; nuevo?: string }>;
}) {
  const { ok, error: notice, edit, q, nuevo } = await searchParams;
  const { data: editing } = edit
    ? await supabaseServer()
        .from("customers")
        .select("id, legal_name, id_type, tax_id, fiscal_address, phone, email, is_special_taxpayer")
        .eq("id", edit)
        .maybeSingle()
    : { data: null };

  // Búsqueda por razón social o RIF, resuelta en el servidor.
  const term = (q ?? "").trim();
  let query = supabaseServer()
    .from("customers")
    .select("*", { count: "exact" })
    .order("legal_name")
    .limit(200);
  if (term) {
    const like = `%${term.replace(/[%,()]/g, "")}%`;
    query = query.or(`legal_name.ilike.${like},tax_id.ilike.${like}`);
  }
  const { data, error, count } = await query;

  if (error) {
    return (
      <>
        <PageHeader title="Clientes" />
        <EmptyState
          title="No se pudieron cargar los clientes"
          hint={error.message}
        />
      </>
    );
  }

  const rows = (data ?? []) as Customer[];

  const inp =
    "w-full border border-regla bg-white px-3 py-2 text-[14px] focus:border-verde focus:outline-none";

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle="Razón social, RIF y datos fiscales"
        action={
          <a href="/clientes?nuevo=1" className="border border-tinta bg-white px-5 py-2.5 text-[14px] font-medium transition-colors hover:bg-papel-2">
            Registrar cliente
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

      <Modal
        open={Boolean(editing) || nuevo === "1"}
        title={editing ? `Editar cliente: ${editing.legal_name}` : "Registrar cliente"}
        onCloseHref="/clientes"
      >
        <form action={editing ? updateCustomer : createCustomer}>
        {editing && <input type="hidden" name="id" value={editing.id} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-[13px] text-tinta-suave sm:col-span-2">
            Razón social
            <input name="legal_name" required maxLength={200} autoFocus defaultValue={editing?.legal_name ?? ""} className={`mt-1.5 ${inp}`} />
          </label>
          <label className="block text-[13px] text-tinta-suave">
            Tipo de RIF
            <select name="id_type" defaultValue={editing?.id_type ?? "J"} className={`mt-1.5 ${inp}`}>
              <option value="V">V — Persona natural residente</option>
              <option value="E">E — Persona natural no residente</option>
              <option value="J">J — Persona jurídica</option>
              <option value="G">G — Ente gubernamental</option>
              <option value="P">P — Pasaporte</option>
            </select>
          </label>
          <label className="block text-[13px] text-tinta-suave">
            Número de RIF
            <input name="tax_id" required placeholder="J-30698765-4" defaultValue={editing?.tax_id ?? ""} className={`num mt-1.5 ${inp}`} />
          </label>
          <label className="block text-[13px] text-tinta-suave sm:col-span-2">
            Dirección fiscal
            <input name="fiscal_address" defaultValue={editing?.fiscal_address ?? ""} className={`mt-1.5 ${inp}`} />
          </label>
          <label className="block text-[13px] text-tinta-suave">
            Teléfono
            <input name="phone" defaultValue={editing?.phone ?? ""} className={`num mt-1.5 ${inp}`} />
          </label>
          <label className="block text-[13px] text-tinta-suave">
            Correo
            <input name="email" type="email" defaultValue={editing?.email ?? ""} className={`mt-1.5 ${inp}`} />
          </label>
          <label className="flex items-center gap-2 text-[13px] text-tinta-suave sm:col-span-2">
            <input type="checkbox" name="is_special_taxpayer" defaultChecked={editing?.is_special_taxpayer ?? false} className="h-4 w-4 accent-[#0D1117]" />
            Contribuyente especial
          </label>
        </div>
        <div className="mt-6 flex items-center gap-4">
          <button
            type="submit"
            className="bg-tinta px-6 py-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
          >
            {editing ? "Guardar cambios" : "Guardar cliente"}
          </button>
          {editing && (
            <a href="/clientes" className="text-[13px] text-tinta-suave underline-offset-2 hover:underline">
              Cancelar
            </a>
          )}
        </div>
        </form>
      </Modal>

      <TableSearch
        action="/clientes"
        q={term}
        placeholder="Buscar por razón social o RIF…"
        shown={rows.length}
        count={count}
        noun="clientes"
      />

      {rows.length === 0 ? (
        <EmptyState
          title={term ? `Ningún cliente coincide con «${term}»` : "Sin clientes registrados"}
          hint={term ? "Prueba con otra razón social o RIF." : "Registra tu primer cliente con su RIF para poder emitir facturas."}
        />
      ) : (
        <table className="w-full text-[14px]">
          <thead>
            <tr className="border-b border-tinta text-left text-[12px] text-tinta-suave">
              <th className="py-2 pr-4 font-medium">Razón social</th>
              <th className="py-2 pr-4 font-medium">RIF</th>
              <th className="py-2 pr-4 font-medium">Dirección fiscal</th>
              <th className="py-2 pr-4 font-medium">Teléfono</th>
              <th className="py-2 font-medium">Condición</th>
              <th className="py-2 pl-4 font-medium text-right"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-regla">
                <td className="py-3 pr-4 font-medium">{r.legal_name}</td>
                <td className="num py-3 pr-4">
                  {r.tax_id}
                </td>
                <td className="max-w-[32ch] truncate py-3 pr-4 text-tinta-suave">
                  {r.fiscal_address ?? "—"}
                </td>
                <td className="num py-3 pr-4">{r.phone ?? "—"}</td>
                <td className="py-3">
                  {r.is_special_taxpayer ? (
                    <span className="text-verde">Contribuyente especial</span>
                  ) : (
                    <span className="text-tinta-suave">Ordinario</span>
                  )}
                </td>
                <td className="py-3 pl-4 text-right">
                  <div className="flex justify-end gap-3">
                  <a
                    href={`/clientes?edit=${r.id}`}
                    className="text-[12px] text-tinta-suave underline-offset-2 hover:text-verde hover:underline"
                  >
                    Editar
                  </a>
                  <form action={deleteCustomer}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="legal_name" value={r.legal_name} />
                    <DeleteButton name={r.legal_name} />
                  </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
