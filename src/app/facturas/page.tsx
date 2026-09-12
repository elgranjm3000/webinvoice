export const dynamic = "force-dynamic";

import { supabaseServer } from "@/lib/supabase";
import { PageHeader, EmptyState, StatusBadge, Amount } from "@/components/ui";
import { TableSearch } from "@/components/TableSearch";
import { fmtDate, fmtQty } from "@/lib/format";

type Item = {
  id: string;
  invoice_number: string;
  control_number: string;
  issue_date: string;
  status: string | null;
  document_type: string | null;
  total_usd: number | null;
  total_ves: number | null;
  bcv_rate: number | null;
  customer: { legal_name: string } | null;
};

export default async function Facturas({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  // Búsqueda por número de factura, control o cliente, resuelta en el servidor.
  // PostgREST no permite campos embebidos dentro de or(); el cliente se
  // resuelve primero y se pasa como lista de ids.
  const term = (q ?? "").trim();
  let customerIds: string[] | null = null;
  if (term) {
    const like = `%${term.replace(/[%,()]/g, "")}%`;
    const { data: matched } = await supabaseServer()
      .from("customers")
      .select("id")
      .or(`legal_name.ilike.${like},tax_id.ilike.${like}`);
    customerIds = (matched ?? []).map((c) => c.id);
  }

  let query = supabaseServer()
    .from("invoices")
    .select(
      `id, invoice_number, control_number, issue_date, status, document_type,
       total_usd, total_ves, bcv_rate,
       customer:customers(legal_name)`,
      { count: "exact" }
    )
    .order("issue_date", { ascending: false })
    .limit(100);
  if (term) {
    const like = `%${term.replace(/[%,()]/g, "")}%`;
    if (customerIds && customerIds.length > 0) {
      query = query.or(
        `invoice_number.ilike.${like},control_number.ilike.${like},customer_id.in.(${customerIds.join(",")})`
      );
    } else {
      query = query.or(`invoice_number.ilike.${like},control_number.ilike.${like}`);
    }
  }
  const { data, error, count } = await query;

  if (error) {
    return (
      <>
        <PageHeader title="Facturas" />
        <EmptyState
          title="No se pudieron cargar las facturas"
          hint={error.message}
        />
      </>
    );
  }

  const rows = (data ?? []) as unknown as Item[];

  return (
    <>
      <PageHeader
        title="Facturas"
        subtitle="Libro de ventas — últimos 100 documentos"
        action={
          <a
            href="/facturas/nueva"
            className="bg-tinta px-5 py-2.5 text-[14px] font-medium text-white hover:opacity-90"
          >
            Nueva factura
          </a>
        }
      />
      <TableSearch
        action="/facturas"
        q={term}
        placeholder="Buscar por número, control o cliente…"
        shown={rows.length}
        count={count}
        noun="documentos"
      />

      {rows.length === 0 ? (
        <EmptyState
          title={term ? `Ningún documento coincide con «${term}»` : "Todavía no hay documentos emitidos"}
          hint={term ? "Prueba con otro número o cliente." : "La primera factura que registres aparecerá aquí con su número de control."}
        />
      ) : (
        <table className="w-full text-[14px]">
          <thead>
            <tr className="border-b border-tinta text-left text-[12px] text-tinta-suave">
              <th className="py-2 pr-4 font-medium">Documento</th>
              <th className="py-2 pr-4 font-medium">N° control</th>
              <th className="py-2 pr-4 font-medium">Fecha</th>
              <th className="py-2 pr-4 font-medium">Cliente</th>
              <th className="num py-2 pr-4 font-medium">Total USD</th>
              <th className="num py-2 pr-4 font-medium">Total Bs.</th>
              <th className="py-2 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-regla">
                <td className="py-3 pr-4">
                  <a
                    href={`/facturas/${r.id}`}
                    className="num font-medium underline decoration-transparent underline-offset-2 hover:decoration-current"
                  >
                    {r.invoice_number}
                  </a>
                  {r.document_type && r.document_type !== "invoice" && (
                    <span className="ml-2 text-[12px] text-tinta-suave">
                      {r.document_type === "credit_note"
                        ? "Nota de crédito"
                        : "Nota de débito"}
                    </span>
                  )}
                </td>
                <td className="num py-3 pr-4 text-tinta-suave">
                  {r.control_number}
                </td>
                <td className="py-3 pr-4 whitespace-nowrap">
                  {fmtDate(r.issue_date)}
                </td>
                <td className="max-w-[24ch] truncate py-3 pr-4">
                  {r.customer?.legal_name ?? "—"}
                </td>
                <td className="num py-3 pr-4">
                  <Amount usd={r.total_usd} bs={r.total_ves} />
                </td>
                <td className="num py-3 pr-4 text-tinta-suave">
                  {r.bcv_rate ? fmtQty(Number(r.bcv_rate)) : "—"}
                </td>
                <td className="py-3">
                  <StatusBadge status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
