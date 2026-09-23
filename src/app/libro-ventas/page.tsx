export const dynamic = "force-dynamic";

import { supabaseServer } from "@/lib/supabase";
import { PageHeader, EmptyState } from "@/components/ui";
import { fmtDate } from "@/lib/format";

const num = (n: number) =>
  n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Row = {
  id: string;
  document_type: string | null;
  invoice_number: string;
  control_number: string | null;
  issue_date: string;
  status: string | null;
  exempt_amount_usd: number | null;
  taxable_base_usd: number | null;
  vat_amount_usd: number | null;
  total_usd: number | null;
  customer: { legal_name: string; tax_id: string } | null;
};

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function monthLabel(m: string) {
  const [y, mo] = m.split("-");
  return `${MESES[Number(mo) - 1]} ${y}`;
}

function defaultMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthRange(m: string) {
  const [y, mo] = m.split("-").map(Number);
  const start = new Date(Date.UTC(y, mo - 1, 1));
  const end = new Date(Date.UTC(y, mo, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}

export default async function LibroVentas({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; error?: string }>;
}) {
  const { mes: mesParam, error: notice } = await searchParams;
  const mes = /^\d{4}-\d{2}$/.test(mesParam ?? "") ? (mesParam as string) : defaultMonth();
  const { start, end } = monthRange(mes);

  // Libro fiscal: facturas suman, notas de crédito restan, las anuladas se excluyen.
  const { data, error } = await supabaseServer()
    .from("invoices")
    .select(
      `id, document_type, invoice_number, control_number, issue_date, status,
       exempt_amount_usd, taxable_base_usd, vat_amount_usd, total_usd,
       customer:customers(legal_name, tax_id)`
    )
    .gte("issue_date", start)
    .lt("issue_date", end)
    .neq("status", "voided")
    .order("issue_date", { ascending: true })
    .limit(1000);

  if (error) {
    return (
      <>
        <PageHeader title="Libro de ventas IVA" />
        <EmptyState title="No se pudo cargar el libro" hint={error.message} />
      </>
    );
  }

  const rows = ((data ?? []) as unknown as Row[]).map((r) => {
    const sign = r.document_type === "credit_note" ? -1 : 1;
    return {
      ...r,
      sign,
      exempt: Number(r.exempt_amount_usd ?? 0) * sign,
      taxable: Number(r.taxable_base_usd ?? 0) * sign,
      vat: Number(r.vat_amount_usd ?? 0) * sign,
      total: Number(r.total_usd ?? 0) * sign,
    };
  });

  const t = rows.reduce(
    (a, r) => ({
      exempt: a.exempt + r.exempt,
      taxable: a.taxable + r.taxable,
      vat: a.vat + r.vat,
      total: a.total + r.total,
    }),
    { exempt: 0, taxable: 0, vat: 0, total: 0 }
  );

  return (
    <>
      <PageHeader
        title="Libro de ventas IVA"
        subtitle={`Período ${monthLabel(mes)} — montos en USD`}
      />

      {notice && (
        <p role="alert" className="mb-6 border-l-2 border-rojo bg-white px-4 py-3 text-[14px] text-rojo">
          {notice}
        </p>
      )}

      <form action="/libro-ventas" method="get" className="mb-8 flex items-end gap-3">
        <label className="block text-[13px] text-tinta-suave">
          Período fiscal
          <input
            type="month"
            name="mes"
            defaultValue={mes}
            className="num mt-1.5 block border border-regla bg-white px-3 py-2 text-[14px] focus:border-verde focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="border border-tinta bg-white px-4 py-2 text-[14px] font-medium transition-colors hover:bg-papel-2"
        >
          Ver libro
        </button>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title={`Sin documentos en ${monthLabel(mes)}`}
          hint="Las facturas emitidas en el período aparecerán aquí con su desglose fiscal."
        />
      ) : (
        <>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-regla text-left text-[11px] text-tinta-suave">
                <th className="py-2 pr-3 font-medium">Fecha</th>
                <th className="py-2 pr-3 font-medium">Documento</th>
                <th className="py-2 pr-3 font-medium">RIF</th>
                <th className="py-2 pr-3 font-medium">Razón social</th>
                <th className="num py-2 pr-3 font-medium">N° control</th>
                <th className="num py-2 pr-3 text-right font-medium">Exento</th>
                <th className="num py-2 pr-3 text-right font-medium">Base</th>
                <th className="num py-2 pr-3 text-right font-medium">IVA</th>
                <th className="num py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-regla">
                  <td className="whitespace-nowrap py-2.5 pr-3">{fmtDate(r.issue_date)}</td>
                  <td className="py-2.5 pr-3">
                    <a
                      href={`/facturas/${r.id}`}
                      className="num underline decoration-transparent underline-offset-2 hover:decoration-current"
                    >
                      {r.invoice_number}
                    </a>
                    {r.document_type === "credit_note" && (
                      <span className="ml-1.5 text-[11px] text-tinta-suave">NC</span>
                    )}
                    {r.document_type === "debit_note" && (
                      <span className="ml-1.5 text-[11px] text-tinta-suave">ND</span>
                    )}
                  </td>
                  <td className="num py-2.5 pr-3">{r.customer?.tax_id ?? "—"}</td>
                  <td className="max-w-[28ch] truncate py-2.5 pr-3">
                    {r.customer?.legal_name ?? "—"}
                  </td>
                  <td className="num py-2.5 pr-3 text-tinta-suave">
                    {r.control_number ?? "—"}
                  </td>
                  <td className="num py-2.5 pr-3 text-right">{num(r.exempt)}</td>
                  <td className="num py-2.5 pr-3 text-right">{num(r.taxable)}</td>
                  <td className="num py-2.5 pr-3 text-right">{num(r.vat)}</td>
                  <td className="num py-2.5 text-right font-medium">{num(r.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-tinta font-medium">
                <td colSpan={5} className="py-3 text-[13px]">
                  Totales del período ({rows.length} documentos)
                </td>
                <td className="num py-3 pr-3 text-right">{num(t.exempt)}</td>
                <td className="num py-3 pr-3 text-right">{num(t.taxable)}</td>
                <td className="num py-3 pr-3 text-right">{num(t.vat)}</td>
                <td className="num py-3 text-right">{num(t.total)}</td>
              </tr>
            </tfoot>
          </table>

          <p className="mt-6 max-w-prose text-[13px] leading-relaxed text-tinta-suave">
            Las notas de crédito restan del período de su emisión. El IVA declarado
            ante el SENIAT es el de esta columna, menos el crédito fiscal del libro
            de compras.
          </p>
        </>
      )}
    </>
  );
}
