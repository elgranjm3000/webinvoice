export const dynamic = "force-dynamic";

import { supabaseServer } from "@/lib/supabase";
import { PageHeader, EmptyState, RowMenu, Modal } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { TableSearch } from "@/components/TableSearch";
import {
  createProduct,
  updateProduct,
  deleteProduct,
} from "./actions";
import { fmtUsd, fmtQty } from "@/lib/format";

type Product = {
  id: string;
  code: string;
  description: string;
  price_usd: number | null;
  applies_vat: boolean | null;
  vat_rate: number | null;
  unit_of_measure: string | null;
  is_service: boolean | null;
  is_active: boolean | null;
};

export default async function Productos({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; edit?: string; q?: string; nuevo?: string }>;
}) {
  const { ok, error: notice, edit, q, nuevo } = await searchParams;

  // Búsqueda por código o descripción, resuelta en el servidor.
  const term = (q ?? "").trim();
  let listQuery = supabaseServer()
    .from("products")
    .select("*", { count: "exact" })
    .order("description")
    .limit(200);
  if (term) {
    const like = `%${term.replace(/[%,()]/g, "")}%`;
    listQuery = listQuery.or(`code.ilike.${like},description.ilike.${like}`);
  }
  const [{ data, error, count }, { data: units }] = await Promise.all([
    listQuery,
    supabaseServer().from("units_of_measure").select("code, name").eq("is_active", true).order("code"),
  ]);

  if (error) {
    return (
      <>
        <PageHeader title="Productos" />
        <EmptyState
          title="No se pudieron cargar los productos"
          hint={error.message}
        />
      </>
    );
  }

  const rows = (data ?? []) as Product[];
  const editing = edit ? rows.find((r) => r.id === edit) ?? null : null;

  const inp =
    "w-full border border-regla bg-white px-3 py-2 text-[14px] focus:border-verde focus:outline-none";

  return (
    <>
      <PageHeader
        title="Productos"
        subtitle="Catálogo de bienes y servicios"
        action={
          <a href="/productos?nuevo=1" className="border border-tinta bg-white px-5 py-2.5 text-[14px] font-medium transition-colors hover:bg-papel-2">
            Registrar producto
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
        onCloseHref="/productos"
        open={Boolean(editing) || nuevo === "1"}
        title={editing ? `Editar producto: ${editing.description}` : "Registrar producto"}
      >
        <form action={editing ? updateProduct : createProduct}>
        {editing && <input type="hidden" name="id" value={editing.id} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-[13px] text-tinta-suave">
            Código
            <input
              name="code"
              required
              placeholder="P-0006"
              defaultValue={editing?.code ?? ""}
              className={`num mt-1.5 ${inp}`}
            />
          </label>
          <label className="block text-[13px] text-tinta-suave">
            Descripción
            <input
              name="description"
              required
              maxLength={200}
              defaultValue={editing?.description ?? ""}
              className={`mt-1.5 ${inp}`}
            />
          </label>
          <label className="block text-[13px] text-tinta-suave">
            Precio USD
            <input
              name="price_usd"
              type="number"
              min="0"
              step="0.01"
              required
              defaultValue={editing ? Number(editing.price_usd) : ""}
              className={`num mt-1.5 ${inp}`}
            />
          </label>
          <label className="block text-[13px] text-tinta-suave">
            Unidad de medida
            <select
              name="unit_of_measure"
              defaultValue={editing?.unit_of_measure ?? "UND"}
              className={`num mt-1.5 ${inp}`}
            >
              {(units ?? []).map((u) => (
                <option key={u.code} value={u.code}>
                  {u.code} — {u.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-[13px] text-tinta-suave">
            IVA
            <div className="mt-1.5 flex items-center gap-4">
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="applies_vat"
                  defaultChecked={editing?.applies_vat ?? true}
                  className="h-4 w-4 accent-[#0F766E]"
                />
                Aplica
              </span>
              <select
                name="vat_rate"
                defaultValue={editing ? Number(editing.vat_rate ?? 16) : 16}
                className={`${inp} w-24`}
              >
                <option value="16">16 %</option>
                <option value="8">8 %</option>
                <option value="31">31 %</option>
                <option value="0">0 %</option>
              </select>
            </div>
          </label>
          <div className="flex items-end gap-6 pb-2 text-[13px] text-tinta-suave">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="is_service"
                defaultChecked={editing?.is_service ?? false}
                className="h-4 w-4 accent-[#0F766E]"
              />
              Es servicio
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={editing?.is_active ?? true}
                className="h-4 w-4 accent-[#0F766E]"
              />
              Activo
            </label>
          </div>
        </div>
        <div className="mt-6 flex items-center gap-4">
          <button
            type="submit"
            className="bg-tinta px-6 py-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
          >
            {editing ? "Guardar cambios" : "Guardar producto"}
          </button>
          {editing && (
            <a href="/productos" className="text-[13px] text-tinta-suave underline-offset-2 hover:underline">
              Cancelar
            </a>
          )}
        </div>
        </form>
      </Modal>

      <TableSearch
        action="/productos"
        q={term}
        placeholder="Buscar por código o descripción…"
        shown={rows.length}
        count={count}
        noun="productos"
      />

      {rows.length === 0 ? (
        <EmptyState
          title={term ? `Ningún producto coincide con «${term}»` : "El catálogo está vacío"}
          hint={term ? "Prueba con otro código o descripción." : "Agrega productos con su precio en dólares y su alícuota de IVA."}
        />
      ) : (
        <table className="w-full text-[14px]">
          <thead>
            <tr className="border-b border-tinta text-left text-[12px] text-tinta-suave">
              <th className="py-2 pr-4 font-medium">Código</th>
              <th className="py-2 pr-4 font-medium">Descripción</th>
              <th className="py-2 pr-4 font-medium">Unidad</th>
              <th className="num py-2 pr-4 font-medium">Precio USD</th>
              <th className="py-2 font-medium">IVA</th>
              <th className="py-2 pl-4 text-right font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-regla">
                <td className="num py-3 pr-4">{r.code}</td>
                <td className="py-3 pr-4 font-medium">
                  {r.description}
                  {r.is_service && (
                    <span className="ml-2 text-[12px] text-tinta-suave">
                      servicio
                    </span>
                  )}
                  {r.is_active === false && (
                    <span className="ml-2 text-[12px] text-rojo">
                      inactivo
                    </span>
                  )}
                </td>
                <td className="py-3 pr-4 text-tinta-suave">
                  {r.unit_of_measure ?? "—"}
                </td>
                <td className="num py-3 pr-4">{fmtUsd(r.price_usd)}</td>
                <td className="num py-3">
                  {r.applies_vat
                    ? `${fmtQty(Number(r.vat_rate ?? 16))}%`
                    : "Exento"}
                </td>
                <td className="py-3 pl-4 text-right">
                  <RowMenu editHref={`/productos?edit=${r.id}`}>
                    <form action={deleteProduct}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="description" value={r.description} />
                      <DeleteButton name={r.description} />
                    </form>
                  </RowMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
