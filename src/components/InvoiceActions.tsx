"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { voidInvoice, registerRetention } from "@/app/facturas/actions";
import { fmtBs } from "@/lib/format";

export function VoidInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = () =>
    start(async () => {
      const res = await voidInvoice(invoiceId);
      if (res.ok) {
        setConfirming(false);
        router.refresh();
      } else {
        setError(res.error ?? "No se pudo anular.");
      }
    });

  return (
    <div className="print:hidden">
      {error && <p className="mt-2 text-[13px] text-rojo">{error}</p>}
      {confirming ? (
        <p className="flex flex-wrap items-center gap-3 text-[14px]">
          <span className="text-tinta-suave">
            Se revertirá el inventario y la factura quedará anulada.
          </span>
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="border border-rojo px-4 py-2 text-[13px] font-medium text-rojo"
          >
            {pending ? "Anulando…" : "Confirmar anulación"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="text-[13px] text-tinta-suave underline underline-offset-2"
          >
            Cancelar
          </button>
        </p>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="border border-rojo px-4 py-2 text-[13px] font-medium text-rojo hover:bg-rojo hover:text-white"
        >
          Anular factura
        </button>
      )}
    </div>
  );
}

export function RetentionForm({
  invoiceId,
  taxableBaseVes,
  vatAmountVes,
}: {
  invoiceId: string;
  taxableBaseVes: number;
  vatAmountVes: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [kind, setKind] = useState<"iva" | "islr">("iva");
  const [voucher, setVoucher] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [pct, setPct] = useState("75");
  const [base, setBase] = useState(String(taxableBaseVes));
  const [concept, setConcept] = useState("");

  const inputCls =
    "mt-1.5 w-full rounded-none border border-regla bg-white px-3 py-2 text-[14px] focus:border-verde focus:outline-none";

  const submit = () => {
    setError(null);
    setDone(null);
    start(async () => {
      const res = await registerRetention({
        invoice_id: invoiceId,
        kind,
        voucher_number: voucher,
        voucher_date: date,
        retention_percentage: Number(pct),
        taxable_base_ves: Number(base),
        vat_amount_ves: vatAmountVes,
        seniat_concept_code: concept || undefined,
      });
      if (res.ok) {
        setDone(`Retención registrada por ${fmtBs(res.retained)}`);
        setVoucher("");
        router.refresh();
      } else {
        setError(res.error ?? "No se pudo registrar la retención.");
      }
    });
  };

  return (
    <div className="max-w-2xl">
      {error && (
        <p role="alert" className="mb-4 border-l-2 border-rojo bg-white px-4 py-3 text-[14px] text-rojo">
          {error}
        </p>
      )}
      {done && (
        <p className="mb-4 border-l-2 border-verde bg-white px-4 py-3 text-[14px] text-verde">
          {done}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-3">
        <label className="block text-[13px] text-tinta-suave">
          Tipo
          <select value={kind} onChange={(e) => setKind(e.target.value as "iva" | "islr")} className={inputCls}>
            <option value="iva">Retención de IVA</option>
            <option value="islr">Retención de ISLR</option>
          </select>
        </label>
        <label className="block text-[13px] text-tinta-suave">
          N° de comprobante
          <input type="text" value={voucher} onChange={(e) => setVoucher(e.target.value)} className={inputCls} />
        </label>
        <label className="block text-[13px] text-tinta-suave">
          Fecha del comprobante
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`num ${inputCls}`} />
        </label>
        <label className="block text-[13px] text-tinta-suave">
          Base imponible (Bs.)
          <input
            type="number" min="0" step="0.01" value={base}
            onChange={(e) => setBase(e.target.value)}
            className={`num ${inputCls}`}
          />
        </label>
        <label className="block text-[13px] text-tinta-suave">
          % de retención
          <input
            type="number" min="0" max="100" step="0.01" value={pct}
            onChange={(e) => setPct(e.target.value)}
            className={`num ${inputCls}`}
          />
        </label>
        {kind === "islr" && (
          <label className="block text-[13px] text-tinta-suave">
            Concepto SENIAT
            <input type="text" value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Ej: 011" className={inputCls} />
          </label>
        )}
      </div>

      <div className="mt-4 text-right">
        <button
          type="button"
          onClick={submit}
          disabled={pending || !voucher || Number(base) <= 0}
          className="bg-verde px-6 py-2.5 text-[14px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Registrando…" : "Registrar retención"}
        </button>
      </div>
      <p className="mt-3 text-[12px] text-tinta-suave">
        Sugerido: base imponible de la factura Bs. {fmtBs(taxableBaseVes)} · IVA Bs. {fmtBs(vatAmountVes)}
      </p>
    </div>
  );
}
