"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { emitInvoice } from "@/app/facturas/actions";
import { fmtUsd, fmtBs, fmtQty } from "@/lib/format";

export type PosProduct = {
  id: string;
  code: string;
  description: string;
  price_usd: number;
  applies_vat: boolean;
  vat_rate: number | null;
};

export type PosOption = { id: string; label: string };

type Line = {
  key: number;
  product: PosProduct;
  qty: number;
  /** Precio capturado en la moneda activa del ticket. */
  price: number;
};

let seq = 0;

export function POSForm({
  customers,
  emissionPoints,
  warehouses,
  products,
  bcvRate,
}: {
  customers: PosOption[];
  emissionPoints: PosOption[];
  warehouses: PosOption[];
  products: PosProduct[];
  bcvRate: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState("");
  const [pointId, setPointId] = useState(emissionPoints[0]?.id ?? "");
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? "");
  const [cur, setCur] = useState<"USD" | "VES">("USD");
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  const rate = bcvRate > 0 ? bcvRate : 0;
  const symb = cur === "USD" ? "$" : "Bs.";

  const setLine = (key: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const addProduct = (p: PosProduct) => {
    setLines((ls) => {
      const existing = ls.find((l) => l.product.id === p.id);
      if (existing) {
        return ls.map((l) =>
          l.product.id === p.id ? { ...l, qty: l.qty + 1 } : l
        );
      }
      const price = cur === "VES" && rate > 0 ? p.price_usd * rate : p.price_usd;
      return [...ls, { key: ++seq, product: p, qty: 1, price }];
    });
  };

  /** Agrega y devuelve el foco al buscador: captura continua con teclado o lector. */
  const addAndRefocus = (p: PosProduct) => {
    addProduct(p);
    setQuery("");
    searchRef.current?.focus();
  };

  const changeCurrency = (next: "USD" | "VES") => {
    if (next === cur || rate <= 0) return;
    setLines((ls) =>
      ls.map((l) => ({
        ...l,
        price:
          Math.round(
            (next === "VES" ? l.price * rate : l.price / rate) * 100
          ) / 100,
      }))
    );
    setCur(next);
  };

  // Totales en vivo: siempre se normaliza a USD para el cálculo fiscal.
  const totals = useMemo(() => {
    let exempt = 0, taxable = 0, vat = 0;
    for (const l of lines) {
      const unitUsd = cur === "VES" && rate > 0 ? l.price / rate : l.price;
      const t = unitUsd * l.qty;
      if (l.product.applies_vat) {
        taxable += t;
        vat += (t * (l.product.vat_rate ?? 0)) / 100;
      } else {
        exempt += t;
      }
    }
    vat = Math.round(vat * 100) / 100;
    const total = exempt + taxable + vat;
    return { exempt, taxable, vat, total };
  }, [lines, cur, rate]);

  const showPrice = (usd: number) =>
    cur === "VES" && rate > 0
      ? fmtBs(usd * rate)
      : fmtUsd(usd);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 12);
    return products
      .filter(
        (p) =>
          p.description.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [products, query]);

  const emit = () => {
    setError(null);
    start(async () => {
      const res = await emitInvoice({
        emission_point_id: pointId,
        customer_id: customerId,
        warehouse_id: warehouseId,
        items: lines.map((l) => ({
          product_id: l.product.id,
          quantity: l.qty,
          unit_price_usd:
            Math.round(
              (cur === "VES" && rate > 0 ? l.price / rate : l.price) * 100
            ) / 100,
          applies_vat: l.product.applies_vat,
          vat_rate: Number(l.product.vat_rate ?? 0),
        })),
      });
      if (res.ok) {
        const notice =
          "invoice_number" in res && res.invoice_number
            ? `Factura ${res.invoice_number} emitida. Lista para imprimir.`
            : "Factura emitida.";
        router.push(
          "id" in res && res.id
            ? `/facturas/${res.id}?ok=${encodeURIComponent(notice)}`
            : "/facturas"
        );
      } else {
        setError(res.error);
      }
    });
  };

  const sel =
    "w-full rounded-none border border-regla bg-white px-3 py-2 text-[14px] focus:border-verde focus:outline-none";

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_20rem]">
      {/* Columna izquierda: venta */}
      <div className="min-w-0">
        {error && (
          <p role="alert" className="mb-6 border-l-2 border-rojo bg-white px-4 py-3 text-[14px] text-rojo">
            {error}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-[13px] text-tinta-suave">
            Cliente
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={`mt-1.5 ${sel}`}>
              <option value="">Selecciona…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-[13px] text-tinta-suave">
            Punto de emisión
            <select value={pointId} onChange={(e) => setPointId(e.target.value)} className={`mt-1.5 ${sel}`}>
              {emissionPoints.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-[13px] text-tinta-suave">
            Despachar desde
            <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={`mt-1.5 ${sel}`}>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.label}</option>
              ))}
            </select>
          </label>
        </div>

        {/* Búsqueda + moneda */}
        <div className="mt-8 flex items-end gap-4">
          <label className="min-w-0 flex-1 text-[13px] text-tinta-suave">
            Buscar producto
            <input
              ref={searchRef}
              type="search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && filtered.length > 0) {
                  e.preventDefault();
                  addAndRefocus(filtered[0]);
                }
              }}
              placeholder="Código o descripción… (Enter agrega el primero)"
              className="mt-1.5 w-full rounded-none border border-regla bg-white px-3 py-2 text-[14px] focus:border-verde focus:outline-none"
            />
          </label>
          <div className="flex border border-tinta text-[13px] font-medium">
            {(["USD", "VES"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => changeCurrency(c)}
                aria-pressed={cur === c}
                className={`px-4 py-2 transition-colors ${
                  cur === c
                    ? "bg-papel-2 font-semibold text-verde"
                    : "bg-white text-tinta-suave hover:bg-papel-2"
                }`}
              >
                {c === "USD" ? "$ USD" : "Bs."}
              </button>
            ))}
          </div>
        </div>

        {/* Catálogo */}
        <div className="mt-4 grid auto-rows-fr grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => addAndRefocus(p)}
              className="flex h-full flex-col border border-regla bg-white p-3 text-left transition-colors hover:border-verde focus-visible:border-verde focus-visible:outline-none"
            >
              <p className="num text-[12px] text-tinta-suave">{p.code}</p>
              <p className="mt-0.5 line-clamp-2 min-h-8 text-[13px] leading-snug">
                {p.description}
              </p>
              <p className="num mt-1.5 text-[14px] font-semibold">
                {cur === "VES" && rate > 0 ? fmtBs(p.price_usd * rate) : fmtUsd(p.price_usd)}
              </p>
              <p className={`text-[11px] ${p.applies_vat ? "text-tinta-suave" : "text-verde"}`}>
                {p.applies_vat ? `IVA ${Number(p.vat_rate ?? 0)}%` : "Exento"}
              </p>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full border border-dashed border-regla bg-white px-4 py-6 text-center text-[14px] text-tinta-suave">
              Ningún producto coincide con «{query}».
            </p>
          )}
        </div>

        {/* Ticket */}
        <h2 className="mb-3 mt-10 border-b border-tinta pb-2 text-[13px] font-medium text-tinta-suave">
          Ticket — {lines.length} {lines.length === 1 ? "línea" : "líneas"}
        </h2>
        {lines.length === 0 ? (
          <p className="border border-dashed border-regla bg-white px-4 py-8 text-center text-[14px] text-tinta-suave">
            Haz clic en un producto del catálogo, o busca y pulsa Enter para agregarlo.
          </p>
        ) : (
          <ul className="divide-y divide-regla border border-regla bg-white">
            {lines.map((l) => {
              const unitUsd = cur === "VES" && rate > 0 ? l.price / rate : l.price;
              return (
                <li key={l.key} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px]">{l.product.description}</p>
                    <p className="num text-[12px] text-tinta-suave">
                      {l.product.code} · {l.product.applies_vat ? `IVA ${Number(l.product.vat_rate ?? 0)}%` : "Exento"}
                    </p>
                  </div>
                  <div className="flex items-center border border-regla">
                    <button
                      type="button"
                      aria-label="Restar"
                      onClick={() =>
                        l.qty > 1
                          ? setLine(l.key, { qty: l.qty - 1 })
                          : setLines((ls) => ls.filter((x) => x.key !== l.key))
                      }
                      className="px-2.5 py-1.5 text-[16px] leading-none text-tinta-suave hover:bg-papel-2"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      value={l.qty}
                      onChange={(e) => setLine(l.key, { qty: Math.max(Number(e.target.value) || 0, 0) })}
                      aria-label="Cantidad"
                      className="num w-12 border-x border-regla px-1 py-1.5 text-center text-[14px] focus:outline-none"
                    />
                    <button
                      type="button"
                      aria-label="Sumar"
                      onClick={() => setLine(l.key, { qty: l.qty + 1 })}
                      className="px-2.5 py-1.5 text-[16px] leading-none text-tinta-suave hover:bg-papel-2"
                    >
                      +
                    </button>
                  </div>
                  <label className="text-[12px] text-tinta-suave">
                    <span className="sr-only">Precio unitario</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={l.price}
                      onChange={(e) => setLine(l.key, { price: Math.max(Number(e.target.value) || 0, 0) })}
                      className="num w-20 rounded-none border border-regla px-2 py-1.5 text-right text-[14px] focus:border-verde focus:outline-none"
                    />
                  </label>
                  <p className="num w-20 text-right text-[14px] font-medium">
                    {showPrice(unitUsd * l.qty)}
                  </p>
                  <button
                    type="button"
                    aria-label={`Quitar ${l.product.description}`}
                    onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                    className="text-[16px] leading-none text-tinta-suave hover:text-rojo"
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Columna derecha: comprobante (cinta fiscal) */}
      <aside className="border border-tinta bg-white lg:sticky lg:top-6">
        <div className="border-b-[3px] border-tinta px-5 pb-3 pt-4">
          <p className="text-[12px] text-tinta-suave">Comprobante</p>
          <p className="num mt-1 text-[15px] font-semibold">
            Tasa BCV {rate > 0 ? fmtQty(rate) : "—"}
          </p>
          <p className="mt-0.5 truncate text-[12px] text-tinta-suave">
            {customers.find((c) => c.id === customerId)?.label ?? "Sin cliente"}
          </p>
        </div>

        <dl className="space-y-1.5 px-5 py-4 text-[13px]">
          <div className="flex justify-between">
            <dt className="text-tinta-suave">Exento</dt>
            <dd className="num">{fmtUsd(totals.exempt)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-tinta-suave">Base imponible</dt>
            <dd className="num">{fmtUsd(totals.taxable)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-tinta-suave">IVA</dt>
            <dd className="num">{fmtUsd(totals.vat)}</dd>
          </div>
        </dl>

        <div className="border-t border-regla px-5 pb-1 pt-3">
          <p className="num text-[30px] font-semibold leading-none">
            {fmtUsd(totals.total)}
          </p>
          <p className="num mt-1.5 text-[15px] font-medium text-ambar">
            {rate > 0 ? fmtBs(totals.total * rate) : "Sin tasa BCV"}
          </p>
        </div>

        <div className="border-t border-regla p-5">
          <button
            type="button"
            onClick={emit}
            disabled={pending || lines.length === 0 || !customerId || totals.total === 0}
            className="w-full bg-verde px-6 py-3 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? "Emitiendo…" : "Emitir factura"}
          </button>
          {(lines.length === 0 || !customerId) && (
            <p className="mt-3 text-[12px] leading-relaxed text-tinta-suave">
              {!customerId ? "Elige un cliente. " : ""}
              {lines.length === 0 ? "Agrega productos al ticket." : ""}
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
