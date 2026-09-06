export const dynamic = "force-dynamic";

import { supabaseServer } from "@/lib/supabase";
import { PageHeader, EmptyState } from "@/components/ui";
import { fmtDate, fmtQty } from "@/lib/format";

type Movement = {
  id: string;
  movement_type: string;
  quantity: number;
  previous_stock: number | null;
  new_stock: number | null;
  notes: string | null;
  created_at: string;
  warehouse: { name: string } | null;
  invoice_id: string | null;
  product?: { code: string; description: string } | null;
};

export default async function Kardex({
  searchParams,
}: {
  searchParams: Promise<{ producto?: string }>;
}) {
  const { producto } = await searchParams;
  const sb = supabaseServer();

  const [{ data: products }, { data: movements, error }] = await Promise.all([
    sb.from("products").select("id, code, description").eq("is_active", true).order("description"),
    producto
      ? sb
          .from("inventory_movements")
          .select("*, warehouse:warehouses!inventory_movements_warehouse_id_fkey(name), product:products(code, description)")
          .eq(producto === "todos" ? "id" : "product_id", producto === "todos" ? "00000000-0000-0000-0000-000000000000" : producto)
          .order("created_at", { ascending: false })
          .limit(200)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const all = producto === "todos";
  const filtered = all
    ? await sb
        .from("inventory_movements")
        .select("*, warehouse:warehouses!inventory_movements_warehouse_id_fkey(name), product:products(code, description)")
        .order("created_at", { ascending: false })
        .limit(200)
    : null;
  const list = all ? filtered?.data ?? [] : movements ?? [];
  const listError = all ? filtered?.error : error;
  const selected = all ? null : (products ?? []).find((p) => p.id === producto);

  return (
    <>
      <PageHeader
        title="Kardex"
        subtitle={
          all
            ? `Últimos ${list.length} movimientos de todos los productos`
            : selected
              ? `${selected.code} — ${selected.description}`
              : "Movimientos de inventario por producto"
        }
      />

      <form className="mb-10 max-w-md" method="get">
        <label className="block text-[13px] text-tinta-suave">
          Producto
          <select
            name="producto"
            defaultValue={producto ?? ""}
            className="mt-1.5 w-full rounded-none border border-regla bg-white px-3 py-2 text-[14px] focus:border-verde focus:outline-none"
          >
            <option value="todos">Todos los productos</option>
            {(products ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} — {p.description}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="mt-3 border border-tinta px-5 py-2 text-[13px] font-medium hover:bg-papel-2"
        >
          Ver movimientos
        </button>
      </form>

      {listError ? (
        <EmptyState title="No se pudo cargar el kardex" hint={listError.message} />
      ) : producto && list.length === 0 ? (
        <EmptyState
          title="Sin movimientos"
          hint="Este producto aún no registra entradas ni salidas."
        />
      ) : list.length > 0 ? (
        <table className="w-full text-[14px]">
          <thead>
            <tr className="border-b border-tinta text-left text-[12px] text-tinta-suave">
              <th className="py-2 pr-4 font-medium">Fecha</th>
              {all && <th className="py-2 pr-4 font-medium">Producto</th>}
              <th className="py-2 pr-4 font-medium">Movimiento</th>
              <th className="py-2 pr-4 font-medium">Almacén</th>
              <th className="num py-2 pr-4 font-medium">Cant.</th>
              <th className="num py-2 pr-4 font-medium">Saldo anterior</th>
              <th className="num py-2 pr-4 font-medium">Saldo nuevo</th>
              <th className="py-2 font-medium">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {(list as unknown as Movement[]).map((m) => {
              const entrada = m.movement_type.endsWith("_ENTRY") || m.movement_type === "RETURN";
              const label =
                m.movement_type === "PURCHASE_ENTRY"
                  ? "Compra"
                  : m.movement_type === "SALE_EXIT"
                    ? "Venta"
                    : m.movement_type === "RETURN"
                      ? "Devolución"
                      : m.movement_type.startsWith("TRANSFER")
                        ? "Traspaso"
                        : "Ajuste";
              return (
                <tr key={m.id} className="border-b border-regla">
                  <td className="py-2.5 pr-4 whitespace-nowrap">{fmtDate(m.created_at)}</td>
                  {all && (
                    <td className="py-2.5 pr-4">
                      {(m as unknown as { product?: { code: string; description: string } | null }).product?.description ?? "—"}
                    </td>
                  )}
                  <td className={`py-2.5 pr-4 ${entrada ? "text-verde" : "text-ambar"}`}>
                    {label}
                  </td>
                  <td className="py-2.5 pr-4">{m.warehouse?.name ?? "—"}</td>
                  <td className="num py-2.5 pr-4">
                    {entrada ? "+" : "−"}
                    {fmtQty(m.quantity)}
                  </td>
                  <td className="num py-2.5 pr-4 text-tinta-suave">{fmtQty(m.previous_stock)}</td>
                  <td className="num py-2.5 pr-4 font-medium">{fmtQty(m.new_stock)}</td>
                  <td className="max-w-[36ch] truncate py-2.5 text-tinta-suave">
                    {m.notes ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : null}
    </>
  );
}
