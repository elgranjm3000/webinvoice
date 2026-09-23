export const dynamic = "force-dynamic";

import { supabaseServer } from "@/lib/supabase";
import { PageHeader, EmptyState } from "@/components/ui";
import { fmtUsd, fmtQty } from "@/lib/format";

type Producto = {
  id: string;
  code: string;
  description: string;
  unit_of_measure: string | null;
  price_usd: number | null;
};

type CompraItem = {
  product_id: string | null;
  unit_cost_usd: number;
  purchase: { issue_date: string }[] | null;
};

export default async function Margenes({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const sb = supabaseServer();

  const [{ data: products }, { data: items }] = await Promise.all([
    sb
      .from("products")
      .select("id, code, description, unit_of_measure, price_usd")
      .eq("is_active", true)
      .order("description")
      .limit(500),
    sb
      .from("purchase_items")
      .select("product_id, unit_cost_usd, purchase:purchase_invoices(issue_date)")
      .limit(5000),
  ]);

  if (!products) {
    return (
      <>
        <PageHeader title="Márgenes" />
        <EmptyState title="No se pudieron cargar los productos" />
      </>
    );
  }

  // Último costo de compra por producto: el renglón con la factura más reciente.
  const lastCost = new Map<string, { cost: number; date: string }>();
  for (const it of (items ?? []) as CompraItem[]) {
    if (!it.product_id) continue;
    const date = it.purchase?.[0]?.issue_date ?? "";
    const prev = lastCost.get(it.product_id);
    if (!prev || date >= prev.date) {
      lastCost.set(it.product_id, { cost: Number(it.unit_cost_usd), date });
    }
  }

  type Fila = {
    p: Producto;
    cost: number | null;
    marginUsd: number | null;
    marginPct: number | null;
  };
  const filas: Fila[] = products.map((p) => {
    const cost = lastCost.get(p.id)?.cost ?? null;
    const price = Number(p.price_usd ?? 0);
    if (cost == null || price <= 0) {
      return { p, cost, marginUsd: null, marginPct: null };
    }
    return {
      p,
      cost,
      marginUsd: price - cost,
      marginPct: ((price - cost) / price) * 100,
    };
  });

  const term = (q ?? "").trim().toLowerCase();
  const visibles = term
    ? filas.filter(
        (f) =>
          f.p.description.toLowerCase().includes(term) ||
          f.p.code.toLowerCase().includes(term)
      )
    : filas;

  // Peores primero: lo que hay que revisar sale arriba.
  visibles.sort((a, b) => (a.marginPct ?? 999) - (b.marginPct ?? 999));

  const conCosto = filas.filter((f) => f.marginPct != null);
  const margenProm =
    conCosto.length > 0
      ? conCosto.reduce((s, f) => s + (f.marginPct ?? 0), 0) / conCosto.length
      : null;
  const enRojo = filas.filter((f) => f.marginPct != null && f.marginPct <= 0);
  const enAmbar = filas.filter((f) => f.marginPct != null && f.marginPct > 0 && f.marginPct < 15);
  const peor = visibles.find((f) => f.marginPct != null && f.marginPct <= 15);

  return (
    <>
      <PageHeader
        title="Márgenes de ganancia"
        subtitle="Costo de compra contra precio de venta, producto por producto"
      />

      {/* Lectura rápida, en lenguaje de dueño de negocio */}
      {margenProm != null && (
        <aside className="mb-10 max-w-prose border-l-2 border-verde bg-white px-5 py-4 text-[13.5px] leading-relaxed">
          <p>
            Tu margen promedio es del{" "}
            <strong className="num">{margenProm.toFixed(1)}%</strong>.{" "}
            {enRojo.length > 0 && (
              <>
                {" "}
                <strong className="text-rojo">{enRojo.length} producto(s)</strong>{" "}
                se venden por debajo del costo: revísalos hoy.
              </>
            )}
            {enRojo.length === 0 && enAmbar.length > 0 && (
              <>
                {" "}
                <strong className="text-ambar">{enAmbar.length} producto(s)</strong>{" "}
                ganan menos de 15%: poco colchón para la tasa.
              </>
            )}
            {enRojo.length === 0 && enAmbar.length === 0 && (
              <> Todos los productos ganan al menos 15%: buena salud.</>
            )}
            {peor && (
              <>
                {" "}
                El más apretado es{" "}
                <strong>{peor.p.description}</strong>.
              </>
            )}
          </p>
        </aside>
      )}

      {filas.length === 0 ? (
        <EmptyState
          title="Sin productos en el catálogo"
          hint="Registra productos y compras para ver sus márgenes."
        />
      ) : (
        <>
          <form action="/margenes" method="get" className="mb-6 flex items-end gap-3">
            <label className="block text-[13px] text-tinta-suave">
              Buscar producto
              <input
                name="q"
                defaultValue={q ?? ""}
                placeholder="Nombre o código…"
                className="mt-1.5 block w-64 border border-regla bg-white px-3 py-2 text-[14px] focus:border-verde focus:outline-none"
              />
            </label>
            <button
              type="submit"
              className="border border-tinta bg-white px-4 py-2 text-[14px] font-medium hover:bg-papel-2"
            >
              Buscar
            </button>
          </form>

          <p className="num mb-3 text-[12px] text-tinta-suave">
            {visibles.length} de {filas.length} productos · ordenados del peor margen al mejor
          </p>

          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-regla text-left text-[12px] text-tinta-suave">
                <th className="py-2 pr-4 font-medium">Producto</th>
                <th className="num py-2 pr-4 font-medium">Último costo</th>
                <th className="num py-2 pr-4 font-medium">Precio venta</th>
                <th className="num py-2 pr-4 font-medium">Ganancia</th>
                <th className="num py-2 font-medium">Margen</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((f) => {
                const pct = f.marginPct;
                const tone =
                  pct == null
                    ? "text-tinta-suave"
                    : pct <= 0
                      ? "text-rojo font-semibold"
                      : pct < 15
                        ? "text-ambar font-medium"
                        : "text-esmeralda font-medium";
                return (
                  <tr key={f.p.id} className="border-b border-regla">
                    <td className="py-3 pr-4">
                      <span className="num mr-2 text-tinta-suave">{f.p.code}</span>
                      {f.p.description}
                      <span className="ml-2 text-[12px] text-tinta-suave">
                        {f.p.unit_of_measure ?? ""}
                      </span>
                    </td>
                    <td className="num py-3 pr-4 text-tinta-suave">
                      {f.cost != null ? fmtUsd(f.cost) : "sin compras"}
                    </td>
                    <td className="num py-3 pr-4">{fmtUsd(Number(f.p.price_usd ?? 0))}</td>
                    <td className={`num py-3 pr-4 ${tone}`}>
                      {f.marginUsd != null
                        ? `${f.marginUsd >= 0 ? "+" : "−"}$ ${fmtUsd(Math.abs(f.marginUsd)).slice(2)}`
                        : "—"}
                    </td>
                    <td className={`num py-3 ${tone}`}>
                      {pct != null ? `${pct >= 0 ? "" : "−"}${Math.abs(pct).toFixed(1)}%` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <p className="mt-6 max-w-prose text-[13px] leading-relaxed text-tinta-suave">
            El costo toma la última compra registrada de cada producto. La ganancia
            y el margen se calculan sobre el precio de venta sin IVA. Verde:
            margen sano (15% o más). Ámbar: colchón corto. Rojo: se vende al costo
            o por debajo.
          </p>
        </>
      )}
    </>
  );
}
