"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registerPayment } from "@/app/facturas/actions";
import { fmtBs } from "@/lib/format";

const METHODS = [
  { value: "pos", label: "Punto de venta" },
  { value: "pago_movil", label: "Pago móvil" },
  { value: "bank_transfer_ves", label: "Transferencia Bs." },
  { value: "zelle", label: "Zelle" },
  { value: "binance", label: "Binance" },
  { value: "cash_usd", label: "Efectivo en divisas" },
  { value: "cash_ves", label: "Efectivo en bolívares" },
];

export function PaymentForm({
  invoiceId,
  remainingVes,
}: {
  invoiceId: string;
  remainingVes: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [method, setMethod] = useState(METHODS[0].value);
  const [currency, setCurrency] = useState("USD");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [igtf, setIgtf] = useState(false);

  const submit = () => {
    setError(null);
    setDone(null);
    start(async () => {
      const res = await registerPayment({
        invoice_id: invoiceId,
        payment_method: method,
        payment_currency: currency,
        amount: Number(amount),
        applies_igtf: igtf,
        reference: reference || undefined,
      });
      if (res.ok) {
        setDone(
          res.remaining_ves > 0
            ? `Pago registrado. Saldo pendiente: ${fmtBs(res.remaining_ves)}`
            : "Pago registrado. Factura pagada en su totalidad."
        );
        setAmount("");
        setReference("");
        setIgtf(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  };

  const inputCls =
    "mt-1.5 w-full rounded-none border border-regla bg-white px-3 py-2 text-[14px] focus:border-verde focus:outline-none";

  return (
    <div className="max-w-2xl">
      <p className="num mb-4 text-[14px] text-tinta-suave">
        Saldo pendiente:{" "}
        <span className={remainingVes > 0 ? "font-medium text-ambar" : "text-verde"}>
          {fmtBs(remainingVes)}
        </span>
      </p>

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

      <div className="grid gap-5 sm:grid-cols-4">
        <label className="block text-[13px] text-tinta-suave">
          Método
          <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputCls}>
            {METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </label>
        <label className="block text-[13px] text-tinta-suave">
          Moneda
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls}>
            <option value="USD">Dólares</option>
            <option value="VES">Bolívares</option>
          </select>
        </label>
        <label className="block text-[13px] text-tinta-suave">
          Monto
          <input
            type="number" min="0" step="0.01" value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={`num ${inputCls}`}
          />
        </label>
        <label className="block text-[13px] text-tinta-suave">
          Referencia
          <input
            type="text" value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Opcional"
            className={inputCls}
          />
        </label>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <label className="flex items-center gap-2 text-[13px] text-tinta-suave">
          <input
            type="checkbox" checked={igtf} onChange={(e) => setIgtf(e.target.checked)}
            className="h-4 w-4 accent-[#1c5d4e]"
          />
          Aplica IGTF (3% — efectivo en divisas)
        </label>
        <button
          type="button"
          onClick={submit}
          disabled={pending || !amount || Number(amount) <= 0 || remainingVes <= 0}
          className="bg-verde px-6 py-2.5 text-[14px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Registrando…" : "Registrar pago"}
        </button>
      </div>
    </div>
  );
}
