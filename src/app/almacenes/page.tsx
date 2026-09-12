export const dynamic = "force-dynamic";

import { supabaseServer } from "@/lib/supabase";
import { PageHeader, EmptyState, Modal } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import {
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
} from "./actions";
import { fmtQty } from "@/lib/format";

type Warehouse = {
  id: string;
  code: string;
  name: string;
  address: string | null;
  is_main: boolean | null;
  is_active: boolean | null;
};

type StockRow = {
  warehouse_id: string;
  current_stock: number | null;
  min_stock: number | null;
  product: { code: string; description: string } | null;
};

export default async function Almacenes({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; edit?: string; nuevo?: string }>;
}) {
  const { ok, error: notice, edit, nuevo } = await searchParams;
  const sb = supabaseServer();
  const [{ data: wh, error: eWh }, { data: stock, error: eStock }] =
    await Promise.all([
      sb.from("warehouses").select("*").order("code"),
      sb
        .from("inventory_stock")
        .select(
          "warehouse_id, current_stock, min_stock, product:products(code, description)"
        )
        .order("warehouse_id")
        .limit(500),
    ]);

  if (eWh || eStock) {
    return (
      <>
        <PageHeader title="Almacenes" />
        <EmptyState
          title="No se pudieron cargar los almacenes"
          hint={(eWh ?? eStock)?.message}
        />
      </>
    );
  }

  const warehouses = (wh ?? []) as Warehouse[];
  const rows = ((stock ?? []) ?? []) as unknown as StockRow[];
  const editing = edit
    ? warehouses.find((w) => w.id === edit) ?? null
    : null;

  const inp =
    "w-full border border-regla bg-white px-3 py-2 text-[14px] focus:border-verde focus:outline-none";

  return (
    <>
      <PageHeader
        title="Almacenes"
        subtitle="Existencias por ubicación"
        action={
          <a href="/almacenes?nuevo=1" className="border border-tinta bg-white px-5 py-2.5 text-[14px] font-medium transition-colors hover:bg-papel-2">
            Registrar almacén
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
        title={editing ? `Editar almacén: ${editing.name}` : "Registrar almacén"}
        onCloseHref="/almacenes"
      >
      <form action={editing ? updateWarehouse : createWarehouse}>
        {editing && <input type="hidden" name="id" value={editing.id} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-[13px] text-tinta-suave">
            Código
            <input
              name="code"
              required
              autoFocus
              placeholder="ALM-03"
              defaultValue={editing?.code ?? ""}
              className={`num mt-1.5 ${inp}`}
            />
          </label>
          <label className="block text-[13px] text-tinta-suave">
            Nombre
            <input
              name="name"
              required
              maxLength={120}
              placeholder="Depósito norte"
              defaultValue={editing?.name ?? ""}
              className={`mt-1.5 ${inp}`}
            />
          </label>
          <label className="block text-[13px] text-tinta-suave sm:col-span-2">
            Dirección
            <input
              name="address"
              defaultValue={editing?.address ?? ""}
              className={`mt-1.5 ${inp}`}
            />
          </label>
          <div className="flex items-end gap-6 pb-2 text-[13px] text-tinta-suave">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="is_main"
                defaultChecked={editing?.is_main ?? false}
                className="h-4 w-4 accent-[#0D1117]"
              />
              Almacén principal
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={editing?.is_active ?? true}
                className="h-4 w-4 accent-[#0D1117]"
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
            {editing ? "Guardar cambios" : "Guardar almacén"}
          </button>
          {editing && (
            <a href="/almacenes" className="text-[13px] text-tinta-suave underline-offset-2 hover:underline">
              Cancelar
            </a>
          )}
        </div>
      </form>
      </Modal>

      {warehouses.length === 0 ? (
        <EmptyState
          title="Sin almacenes configurados"
          hint="Crea al menos un almacén principal para empezar a registrar inventario."
        />
      ) : (
        <div className="space-y-14">
          {warehouses.map((w) => {
            const items = rows.filter((r) => r.warehouse_id === w.id);
            const underMin = items.filter(
              (r) =>
                r.min_stock != null &&
                Number(r.current_stock ?? 0) <= Number(r.min_stock)
            ).length;
            return (
              <section key={w.id}>
                <div className="mb-3 flex items-baseline justify-between border-b border-tinta pb-2">
                  <h2 className="text-[16px] font-semibold tracking-tight">
                    {w.name}{" "}
                    <span className="num font-normal text-tinta-suave">
                      {w.code}
                      {w.is_main ? " · principal" : ""}
                      {w.is_active === false ? " · inactivo" : ""}
                    </span>
                  </h2>
                  <div className="flex items-baseline gap-4">
                    <p className="num text-[13px] text-tinta-suave">
                      {items.length} productos
                      {underMin > 0 && (
                        <span className="text-rojo"> · {underMin} bajo mínimo</span>
                      )}
                    </p>
                    <a
                      href={`/almacenes?edit=${w.id}`}
                      className="text-[12px] text-tinta-suave underline-offset-2 hover:text-verde hover:underline"
                    >
                      Editar
                    </a>
                    <form action={deleteWarehouse}>
                      <input type="hidden" name="id" value={w.id} />
                      <input type="hidden" name="name" value={w.name} />
                      <DeleteButton name={w.name} />
                    </form>
                  </div>
                </div>
                {items.length === 0 ? (
                  <p className="py-4 text-[13px] text-tinta-suave">
                    Este almacén no tiene existencias registradas todavía.
                  </p>
                ) : (
                  <table className="w-full text-[14px]">
                    <tbody>
                      {items.map((r, i) => {
                        const low =
                          r.min_stock != null &&
                          Number(r.current_stock ?? 0) <= Number(r.min_stock);
                        return (
                          <tr key={i} className="border-b border-regla">
                            <td className="num py-2.5 pr-4 text-tinta-suave">
                              {r.product?.code ?? "—"}
                            </td>
                            <td className="py-2.5 pr-4">
                              {r.product?.description ?? "—"}
                            </td>
                            <td className="num w-32 py-2.5 pr-4">
                              {fmtQty(r.current_stock)}
                            </td>
                            <td className="num w-32 py-2.5">
                              {low && (
                                <span className="text-rojo">bajo mínimo</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
