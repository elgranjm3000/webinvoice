export const dynamic = "force-dynamic";

import { supabaseServer } from "@/lib/supabase";
import { PageHeader, EmptyState } from "@/components/ui";
import { TableSearch } from "@/components/TableSearch";
import { fmtDate, fmtUsd } from "@/lib/format";

type Purchase = {
  id: string;
  invoice_number: string;
  control_number: string | null;
  issue_date: string;
  bcv_rate: number | null;
  total_usd: number | null;
  total_ves: number | null;
  vat_amount_usd: number | null;
  supplier: { legal_name: string } | null;
};

export default async function Compras({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const term = (q ?? "").trim();

  // PostgREST no permite campos embebidos dentro de or(); el proveedor se
  // resuelve primero y se pasa como lista de ids.
  let supplierIds: string[] | null = null;
  if (term) {
    const like = `%${term.replace(/[%,()]/g, "")}%`;
    const { data: matched } = await supabaseServer()
      .from("suppliers")
      .select("id")
      .or(`legal_name.ilike.${like},tax_id.ilike.${like}`);
    supplierIds = (matched ?? []).map((s) => s.id);
  }

  let query = supabaseServer()
    .from("purchase_invoices")
    .select(
      `id, invoice_number, control_number, issue_date, bcv_rate,
       total_usd, total_ves, vat_amount_usd,
       supplier:suppliers(legal_name)`,
      { count: "exact" }
    )
    .order("issue_date", { ascending: false })
    .limit(100);
  if (term) {
    const like = `%${term.replace(/[%,()]/g, "")}%`;
    if (supplierIds && supplierIds.length > 0) {
      query = query.or(
        `invoice_number.ilike.${like},control_number.ilike.${like},supplier_id.in.(${supplierIds.join(",")})`
      );
    } else {
      query = query.or(`invoice_number.ilike.${like},control_number.ilike.${like}`);
    }
  }
  const { data, error, count } = await query;

  if (error) {
    return (
      <>
        <PageHeader title="Compras" />
        <EmptyState
          title="No se pudieron cargar las compras"
          hint={error.message}
        />
      </>
    );
  }

  const rows = (data ?? []) as unknown as Purchase[];

  return (
    <>
      <PageHeader
        title="Compras"
        subtitle="Facturas de proveedores — base del crédito fiscal IVA"
        action={
          <a
            href="/compras/nueva"
            className="bg-tinta px-5 py-2.5 text-[14px] font-medium text-white hover:opacity-90"
          >
            Registrar compra
          </a>
        }
      />
      <TableSearch
        action="/compras"
        q={term}
        placeholder="Buscar por número, control o proveedor…"
        shown={rows.length}
        count={count}
        noun="compras"
      />

      {rows.length === 0 ? (
        <EmptyState
          title={term ? `Ninguna compra coincide con «${term}»` : "Todavía no hay compras registradas"}
          hint={term ? "Prueba con otro número o proveedor." : "Registra las facturas de tus proveedores para acreditar el IVA y sumar existencias."}
        />
      ) : (
        <table className="w-full text-[14px]">
          <thead>
            <tr className="border-b border-regla text-left text-[12px] text-tinta-suave">
              <th className="py-2 pr-4 font-medium">Factura</th>
              <th className="py-2 pr-4 font-medium">N° control</th>
              <th className="py-2 pr-4 font-medium">Fecha</th>
              <th className="py-2 pr-4 font-medium">Proveedor</th>
              <th className="num py-2 pr-4 font-medium">IVA USD</th>
              <th className="num py-2 pr-4 font-medium">Total USD</th>
              <th className="num py-2 pr-4 font-medium">Total Bs.</th>
              <th className="num py-2 font-medium">Tasa</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-regla">
                <td className="num py-3 pr-4 font-medium">{r.invoice_number}</td>
                <td className="num py-3 pr-4 text-tinta-suave">
                  {r.control_number ?? "—"}
                </td>
                <td className="py-3 pr-4 whitespace-nowrap">
                  {fmtDate(r.issue_date)}
                </td>
                <td className="max-w-[24ch] truncate py-3 pr-4">
                  {r.supplier?.legal_name ?? "—"}
                </td>
                <td className="num py-3 pr-4 text-verde">{fmtUsd(r.vat_amount_usd)}</td>
                <td className="num py-3 pr-4">{fmtUsd(r.total_usd)}</td>
                <td className="num py-3 pr-4 text-tinta-suave">
                  {r.total_ves == null ? "—" : `Bs. ${Number(r.total_ves).toLocaleString("es-VE", { minimumFractionDigits: 2 })}`}
                </td>
                <td className="num py-3 text-tinta-suave">
                  {r.bcv_rate ? Number(r.bcv_rate).toLocaleString("es-VE", { maximumFractionDigits: 2 }) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
