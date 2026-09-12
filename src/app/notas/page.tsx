export const dynamic = "force-dynamic";

import Link from "next/link";
import { supabaseServer } from "@/lib/supabase";
import { PageHeader, EmptyState, StatusBadge } from "@/components/ui";
import { fmtBs, fmtDate, fmtUsd } from "@/lib/format";

type Note = {
  id: string;
  invoice_number: string;
  control_number: string;
  issue_date: string;
  status: string | null;
  document_type: string | null;
  total_usd: number | null;
  total_ves: number | null;
  affected_invoice_id: string | null;
  affected: { invoice_number: string } | null;
};

export default async function Notas({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; tipo?: string }>;
}) {
  const { ok, error: notice, tipo } = await searchParams;
  let query = supabaseServer()
    .from("invoices")
    .select(
      "id, invoice_number, control_number, issue_date, status, document_type, total_usd, total_ves, affected_invoice_id"
    )
    .in("document_type", ["credit_note", "debit_note"])
    .order("issue_date", { ascending: false })
    .limit(100);
  if (tipo === "credito" || tipo === "debito") {
    query = query.eq(
      "document_type",
      tipo === "credito" ? "credit_note" : "debit_note"
    );
  }
  const { data, error } = await query;

  if (error) {
    return (
      <>
        <PageHeader title="Notas de crédito" />
        <EmptyState title="No se pudieron cargar las notas" hint={error.message} />
      </>
    );
  }

  const raw = (data ?? []) as Note[];
  const affectedIds = [...new Set(raw.map((r) => r.affected_invoice_id).filter(Boolean))] as string[];
  const { data: affectedInvoices } = affectedIds.length
    ? await supabaseServer()
        .from("invoices")
        .select("id, invoice_number")
        .in("id", affectedIds)
    : { data: [] as { id: string; invoice_number: string }[] | null };
  const affectedMap = new Map(
    (affectedInvoices ?? []).map((a) => [a.id, a.invoice_number])
  );
  const rows = raw.map((r) => ({
    ...r,
    affected: r.affected_invoice_id
      ? { invoice_number: affectedMap.get(r.affected_invoice_id) ?? "—" }
      : null,
  }));

  return (
    <>
      <PageHeader
        title="Notas de crédito y débito"
        subtitle="Correcciones fiscales sobre facturas emitidas"
        action={
          <Link
            href="/notas/nueva"
            className="bg-tinta px-5 py-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
          >
            Nueva nota
          </Link>
        }
      />

      <div className="mb-6 flex gap-4 text-[13px]">
        <Link
          href="/notas"
          className={`underline-offset-4 ${!tipo ? "font-medium text-tinta underline" : "text-tinta-suave hover:text-tinta"}`}
        >
          Todas
        </Link>
        <Link
          href="/notas?tipo=credito"
          className={`underline-offset-4 ${tipo === "credito" ? "font-medium text-tinta underline" : "text-tinta-suave hover:text-tinta"}`}
        >
          Crédito
        </Link>
        <Link
          href="/notas?tipo=debito"
          className={`underline-offset-4 ${tipo === "debito" ? "font-medium text-tinta underline" : "text-tinta-suave hover:text-tinta"}`}
        >
          Débito
        </Link>
      </div>

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

      {rows.length === 0 ? (
        <EmptyState
          title="Sin notas registradas"
          hint="Emite una desde «Nueva nota» para devolver, corregir o cargar una factura."
        />
      ) : (
        <table className="w-full text-[14px]">
          <thead>
            <tr className="border-b border-tinta text-left text-[12px] text-tinta-suave">
              <th className="py-2 pr-4 font-medium">Nota</th>
              <th className="py-2 pr-4 font-medium">N° de control</th>
              <th className="py-2 pr-4 font-medium">Fecha</th>
              <th className="py-2 pr-4 font-medium">Factura afectada</th>
              <th className="num py-2 pr-4 font-medium">Total USD</th>
              <th className="num py-2 pr-4 font-medium">Total Bs.</th>
              <th className="py-2 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-regla">
                <td className="num py-3 pr-4 font-medium">
                  <Link
                    href={`/facturas/${r.id}`}
                    className="underline decoration-transparent underline-offset-2 hover:decoration-current"
                  >
                    {r.invoice_number}
                  </Link>
                  {r.document_type === "debit_note" && (
                    <span className="ml-2 text-[12px] text-tinta-suave">débito</span>
                  )}
                </td>
                <td className="num py-3 pr-4">{r.control_number}</td>
                <td className="py-3 pr-4 whitespace-nowrap">{fmtDate(r.issue_date)}</td>
                <td className="num py-3 pr-4">
                  {r.affected?.invoice_number ?? "—"}
                </td>
                <td className="num py-3 pr-4">{fmtUsd(r.total_usd)}</td>
                <td className="num py-3 pr-4 text-ambar">{fmtBs(r.total_ves)}</td>
                <td className="py-3">
                  <StatusBadge status={r.status ?? "issued"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
