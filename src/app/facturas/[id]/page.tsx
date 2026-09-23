export const dynamic = "force-dynamic";

import Link from "next/link";
import { supabaseServer } from "@/lib/supabase";
import { PageHeader, EmptyState, StatusBadge } from "@/components/ui";
import { PaymentForm } from "@/components/PaymentForm";
import { VoidInvoiceButton, RetentionForm } from "@/components/InvoiceActions";
import { PrintButton } from "@/components/PrintButton";
import { fmtBs, fmtDate, fmtQty, fmtUsd } from "@/lib/format";

export default async function Factura({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const { id } = await params;
  const { ok } = await searchParams;
  const sb = supabaseServer();

  const [{ data: inv, error }, { data: company }, { data: payments }] =
    await Promise.all([
      sb
        .from("invoices")
        .select(
          `*, customer:customers(*), emission_point:emission_points(name, point_code)`
        )
        .eq("id", id)
        .maybeSingle(),
      sb.from("companies").select("*").limit(1).maybeSingle(),
      sb
        .from("payments")
        .select("*")
        .eq("invoice_id", id)
        .order("payment_date"),
    ]);

  if (error || !inv) {
    return (
      <>
        <PageHeader title="Factura" />
        <EmptyState
          title="No se encontró la factura"
          hint={error?.message}
        />
      </>
    );
  }

  const paid = (payments ?? []).reduce(
    (s, p) => s + Number(p.ves_equivalent_amount ?? 0),
    0
  );
  const remaining = Math.max(Number(inv.total_ves ?? 0) - paid, 0);
  const items = await supabaseServer()
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", id);

  const cust = inv.customer as {
    legal_name: string;
    tax_id: string;
    fiscal_address: string | null;
    id_type: string;
    phone: string | null;
  } | null;
  const co = company as {
    legal_name: string;
    trade_name: string | null;
    tax_id: string;
    fiscal_address: string;
    phone: string | null;
  } | null;

  return (
    <>
      <div className="print:hidden">
        {ok && (
          <p className="mb-6 border-l-2 border-verde bg-white px-4 py-3 text-[14px] text-verde">
            {ok}
          </p>
        )}
        <PageHeader
          title={`Factura ${inv.invoice_number}`}
          subtitle={`N° de control ${inv.control_number} · ${fmtDate(inv.issue_date)}`}
          action={
            <div className="flex items-center gap-4">
              <StatusBadge status={inv.status} />
              <Link
                href={`/facturas/${id}/imprimir`}
                className="border border-tinta px-4 py-2 text-[13px] font-medium hover:bg-papel-2"
              >
                Documento imprimible
              </Link>
            </div>
          }
        />
      </div>

      {/* Encabezado fiscal */}
      <section className="mb-10 grid gap-8 card p-6 sm:grid-cols-2 print:border-0">
        <div className="text-[13px] leading-relaxed">
          <p className="text-[15px] font-semibold">{co?.legal_name}</p>
          {co?.trade_name && <p className="text-tinta-suave">{co.trade_name}</p>}
          <p className="num text-tinta-suave">RIF: {co?.tax_id}</p>
          <p className="text-tinta-suave">{co?.fiscal_address}</p>
          {co?.phone && <p className="num text-tinta-suave">{co.phone}</p>}
        </div>
        <div className="text-[13px] leading-relaxed sm:text-right">
          <p>
            <span className="text-tinta-suave">Factura </span>
            <span className="num font-semibold">{inv.invoice_number}</span>
          </p>
          <p>
            <span className="text-tinta-suave">Control </span>
            <span className="num font-semibold">{inv.control_number}</span>
          </p>
          <p className="text-tinta-suave">Fecha de emisión: {fmtDate(inv.issue_date)}</p>
          <p className="text-tinta-suave">
            Punto de emisión: {(inv.emission_point as { name: string } | null)?.name ?? "—"}
          </p>
          <p className="num text-ambar">
            Tasa BCV: {fmtBs(Number(inv.bcv_rate))} / USD
          </p>
        </div>
      </section>

      {/* Cliente */}
      <section className="mb-10 grid gap-8 sm:grid-cols-2">
        <div className="text-[13px] leading-relaxed">
          <p className="mb-1 text-[12px] text-tinta-suave">Cliente</p>
          <p className="text-[15px] font-medium">{cust?.legal_name}</p>
          <p className="num text-tinta-suave">
            {cust?.id_type}: {cust?.tax_id}
          </p>
          <p className="text-tinta-suave">{cust?.fiscal_address}</p>
        </div>
        <div className="sm:text-right">
          <StatusBadge status={inv.status} />
        </div>
      </section>

      {/* Ítems */}
      <table className="w-full text-[14px]">
        <thead>
          <tr className="border-b border-regla text-left text-[12px] text-tinta-suave">
            <th className="py-2 pr-4 font-medium">Código</th>
            <th className="py-2 pr-4 font-medium">Descripción</th>
            <th className="num py-2 pr-4 font-medium">Cant.</th>
            <th className="num py-2 pr-4 font-medium">Precio USD</th>
            <th className="num py-2 pr-4 font-medium">Total USD</th>
            <th className="num py-2 font-medium">Total Bs.</th>
          </tr>
        </thead>
        <tbody>
          {(items.data ?? []).map((it) => (
            <tr key={it.id} className="border-b border-regla">
              <td className="num py-2.5 pr-4 text-tinta-suave">{it.product_code}</td>
              <td className="py-2.5 pr-4">
                {it.description}
                {!it.applies_vat && (
                  <span className="ml-2 text-[12px] text-verde">exento</span>
                )}
              </td>
              <td className="num py-2.5 pr-4">{fmtQty(it.quantity)}</td>
              <td className="num py-2.5 pr-4">{fmtUsd(it.unit_price_usd)}</td>
              <td className="num py-2.5 pr-4">{fmtUsd(it.total_amount_usd)}</td>
              <td className="num py-2.5 text-ambar">{fmtBs(it.total_amount_ves)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totales */}
      <div className="mt-6 flex justify-end">
        <dl className="w-72 space-y-1.5 text-[14px]">
          <div className="flex justify-between">
            <dt className="text-tinta-suave">Exento</dt>
            <dd className="num">{fmtUsd(inv.exempt_amount_usd)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-tinta-suave">Base imponible</dt>
            <dd className="num">{fmtUsd(inv.taxable_base_usd)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-tinta-suave">IVA</dt>
            <dd className="num">{fmtUsd(inv.vat_amount_usd)}</dd>
          </div>
          <div className="flex justify-between border-t-2 border-tinta pt-2 font-semibold">
            <dt>Total USD</dt>
            <dd className="num">{fmtUsd(inv.total_usd)}</dd>
          </div>
          <div className="flex justify-between font-semibold text-ambar">
            <dt>Total Bs.</dt>
            <dd className="num">{fmtBs(inv.total_ves)}</dd>
          </div>
        </dl>
      </div>

      {/* Pagos */}
      <section className="mt-14 print:hidden">
        <h2 className="mb-4 border-b border-tinta pb-2 text-[15px] font-semibold tracking-tight">
          Pagos
        </h2>
        {(payments ?? []).length > 0 && (
          <table className="mb-8 w-full text-[14px]">
            <thead>
              <tr className="border-b border-regla text-left text-[12px] text-tinta-suave">
                <th className="py-2 pr-4 font-medium">Fecha</th>
                <th className="py-2 pr-4 font-medium">Método</th>
                <th className="num py-2 pr-4 font-medium">Monto original</th>
                <th className="num py-2 pr-4 font-medium">Equivalente Bs.</th>
                <th className="num py-2 pr-4 font-medium">IGTF</th>
                <th className="py-2 font-medium">Referencia</th>
              </tr>
            </thead>
            <tbody>
              {(payments ?? []).map((p) => (
                <tr key={p.id} className="border-b border-regla">
                  <td className="py-2.5 pr-4 whitespace-nowrap">{fmtDate(p.payment_date)}</td>
                  <td className="py-2.5 pr-4 capitalize">{String(p.payment_method).replace(/_/g, " ")}</td>
                  <td className="num py-2.5 pr-4">
                    {p.payment_currency === "USD"
                      ? fmtUsd(p.original_currency_amount)
                      : fmtBs(p.original_currency_amount)}
                  </td>
                  <td className="num py-2.5 pr-4">{fmtBs(p.ves_equivalent_amount)}</td>
                  <td className="num py-2.5 pr-4 text-ambar">
                    {Number(p.igtf_amount_ves ?? 0) > 0 ? fmtBs(p.igtf_amount_ves) : "—"}
                  </td>
                  <td className="py-2.5 text-tinta-suave">{p.reference_number ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {inv.status !== "voided" ? (
          <PaymentForm invoiceId={inv.id} remainingVes={remaining} />
        ) : (
          <p className="text-[14px] text-tinta-suave">
            Factura anulada: no admite pagos.
          </p>
        )}
      </section>

      <div className="mt-12">
        <PrintButton />
      </div>

      {/* Retenciones */}
      <section className="mt-14 print:hidden">
        <h2 className="mb-4 border-b border-tinta pb-2 text-[15px] font-semibold tracking-tight">
          Retenciones
        </h2>
        <RetentionForm
          invoiceId={inv.id}
          taxableBaseVes={Number(inv.taxable_base_ves ?? 0)}
          vatAmountVes={Number(inv.vat_amount_ves ?? 0)}
        />
      </section>

      {/* Anulación */}
      {inv.status !== "voided" && (
        <section className="mt-14 print:hidden">
          <h2 className="mb-4 border-b border-tinta pb-2 text-[15px] font-semibold tracking-tight">
            Anulación
          </h2>
          <VoidInvoiceButton invoiceId={inv.id} />
        </section>
      )}
    </>
  );
}
