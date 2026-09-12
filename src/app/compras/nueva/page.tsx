export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";
import { PageHeader, EmptyState } from "@/components/ui";
import { registerPurchase } from "../actions";
import { fmtUsd } from "@/lib/format";

const inp =
  "w-full border border-regla bg-white px-3 py-2 text-[14px] focus:border-verde focus:outline-none";

export default async function NuevaCompra({
  searchParams,
}: {
  searchParams: Promise<{
    ok?: string;
    error?: string;
    proveedor?: string;
    alm?: string;
    [key: string]: string | string[] | undefined;
  }>;
}) {
  const params = await searchParams;
  const { ok, error: notice, proveedor, alm } = params;
  const sb = supabaseServer();

  const [{ data: suppliers }, { data: warehouses }] = await Promise.all([
    sb.from("suppliers").select("id, legal_name, tax_id").eq("is_active", true).order("legal_name"),
    sb.from("warehouses").select("id, name, code").eq("is_active", true).order("code"),
  ]);

  if (!suppliers || !warehouses) {
    return (
      <>
        <PageHeader title="Registrar compra" />
        <EmptyState title="No se pudieron cargar los datos" />
      </>
    );
  }

  /* ---------- Paso 1: proveedor, números y almacén ---------- */
  if (!proveedor) {
    return (
      <>
        <PageHeader
          title="Registrar compra"
          subtitle="Paso 1 de 2 — datos de la factura del proveedor"
        />
        {notice && (
          <p role="alert" className="mb-6 border-l-2 border-rojo bg-white px-4 py-3 text-[14px] text-rojo">
            {notice}
          </p>
        )}
        {suppliers.length === 0 ? (
          <EmptyState
            title="Primero registra un proveedor"
            hint="Las compras se asocian a un proveedor con su RIF."
          />
        ) : (
          <form action={async (fd: FormData) => {
            "use server";
            const supplier_id = String(fd.get("supplier_id") ?? "");
            if (!supplier_id) {
              redirect(`/compras/nueva?error=${encodeURIComponent("Selecciona el proveedor.")}`);
            }
            const search = new URLSearchParams({
              proveedor: supplier_id,
              alm: String(fd.get("alm") ?? ""),
            });
            redirect(`/compras/nueva?${search}`);
          }} className="max-w-xl card p-6">
            <div className="grid gap-4">
              <label className="block text-[13px] text-tinta-suave">
                Proveedor
                <select name="supplier_id" required className={`mt-1.5 ${inp}`}>
                  <option value="">Selecciona un proveedor…</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.legal_name} · {s.tax_id}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-[13px] text-tinta-suave">
                Almacén que recibe la mercancía
                <select name="alm" required className={`mt-1.5 ${inp}`}>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button
              type="submit"
              className="mt-6 bg-tinta px-6 py-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
            >
              Continuar
            </button>
          </form>
        )}
      </>
    );
  }

  /* ---------- Paso 2: números de la factura + renglones ---------- */
  const { data: products } = await sb
    .from("products")
    .select("id, code, description, unit_of_measure, applies_vat, vat_rate, is_service, price_usd")
    .eq("is_active", true)
    .order("description")
    .limit(200);

  if (!products || products.length === 0) {
    return (
      <>
        <PageHeader title="Registrar compra" />
        <EmptyState
          title="No hay productos en el catálogo"
          hint="Registra productos para poder comprarlos."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Registrar compra"
        subtitle="Paso 2 de 2 — renglones y costos de la factura"
      />
      {notice && (
        <p role="alert" className="mb-6 border-l-2 border-rojo bg-white px-4 py-3 text-[14px] text-rojo">
          {notice}
        </p>
      )}

      <form
        action={async (fd: FormData) => {
          "use server";
          const invoice_number = String(fd.get("invoice_number") ?? "").trim();
          const items = products
            .map((p) => ({
              product_id: p.id,
              quantity: Number(fd.get(`q_${p.id}`) ?? 0),
              unit_cost_usd: Number(fd.get(`c_${p.id}`) ?? 0),
            }))
            .filter((r) => r.quantity > 0);

          const res = await registerPurchase({
            supplier_id: String(proveedor),
            invoice_number,
            control_number: String(fd.get("control_number") ?? "").trim(),
            issue_date: String(fd.get("issue_date") ?? "").trim(),
            warehouse_id: String(alm ?? ""),
            items,
            notes: String(fd.get("notas") ?? "").trim() || undefined,
          });

          if (res.ok) {
            redirect(
              `/compras?ok=${encodeURIComponent(
                `Compra ${res.invoice_number} registrada: $ ${Number(res.total_usd).toFixed(2)} (Bs. ${Number(res.total_ves).toFixed(2)}). Existencias actualizadas.`
              )}`
            );
          }
          redirect(
            `/compras/nueva?proveedor=${proveedor}&alm=${alm}&error=${encodeURIComponent(res.error)}`
          );
        }}
        className="max-w-4xl"
      >
        <div className="mb-8 grid gap-4 card p-6 sm:grid-cols-3">
          <label className="block text-[13px] text-tinta-suave">
            N° de factura del proveedor
            <input name="invoice_number" required placeholder="F-00123" className={`num mt-1.5 ${inp}`} />
          </label>
          <label className="block text-[13px] text-tinta-suave">
            N° de control (si lo tiene)
            <input name="control_number" placeholder="00-00001234" className={`num mt-1.5 ${inp}`} />
          </label>
          <label className="block text-[13px] text-tinta-suave">
            Fecha de la factura
            <input name="issue_date" type="date" className={`num mt-1.5 ${inp}`} />
          </label>
        </div>

        <table className="w-full text-[14px]">
          <thead>
            <tr className="border-b border-tinta text-left text-[12px] text-tinta-suave">
              <th className="py-2 pr-4 font-medium">Producto</th>
              <th className="py-2 pr-4 font-medium">Unidad</th>
              <th className="num py-2 pr-4 font-medium">IVA</th>
              <th className="num py-2 pr-4 font-medium">Cantidad</th>
              <th className="num py-2 pr-4 font-medium">Precio de venta</th>
              <th className="num py-2 font-medium">Costo de compra USD</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-regla">
                <td className="py-3 pr-4">
                  <span className="num mr-2 text-tinta-suave">{p.code}</span>
                  {p.description}
                </td>
                <td className="py-3 pr-4 text-tinta-suave">{p.unit_of_measure ?? "—"}</td>
                <td className="num py-3 pr-4">
                  {p.applies_vat ? `${Number(p.vat_rate ?? 16).toFixed(0)}%` : "Exento"}
                </td>
                <td className="num py-3 pr-4">
                  <input
                    type="number"
                    name={`q_${p.id}`}
                    min="0"
                    step="any"
                    defaultValue="0"
                    aria-label={`Cantidad de ${p.description}`}
                    className="num w-20 border border-regla px-2 py-1.5 text-right text-[14px] focus:border-verde focus:outline-none"
                  />
                </td>
                <td className="num py-3 pr-4 text-tinta-suave">{fmtUsd(p.price_usd)}</td>
                <td className="num py-3">
                  <input
                    type="number"
                    name={`c_${p.id}`}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    aria-label={`Costo de compra de ${p.description}`}
                    className="num w-24 border border-regla px-2 py-1.5 text-right text-[14px] focus:border-verde focus:outline-none"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <label className="mt-8 block max-w-xl text-[13px] text-tinta-suave">
          Observaciones (opcional)
          <input name="notas" maxLength={300} className={`mt-1.5 ${inp}`} />
        </label>

        <p className="mt-4 max-w-prose text-[13px] leading-relaxed text-tinta-suave">
          El costo de compra es el que cobra tu proveedor (suele ser menor al precio
          de venta y es el que alimenta el inventario). Los totales de IVA se
          calculan con la alícuota de cada producto y la tasa BCV vigente.
        </p>

        <div className="mt-6 flex items-center gap-4">
          <button
            type="submit"
            className="bg-tinta px-6 py-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
          >
            Registrar compra
          </button>
          <Link href="/compras" className="text-[13px] text-tinta-suave underline-offset-2 hover:underline">
            Cancelar
          </Link>
        </div>
      </form>
    </>
  );
}
