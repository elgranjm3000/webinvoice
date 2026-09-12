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

/**
 * Punto de venta con la piel del "mostrador": superficie oscura en tinta
 * donde flotan el catálogo y el ticket en papel blanco — el documento
 * fiscal se destaca como el único objeto claro de la pantalla.
 */
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

  /* Superficie del mostrador: inputs y catálogo en modo oscuro */
  const darkInput =
    "mt-1.5 w-full border border-white/15 bg-white/[0.06] px-3 py-2 text-[14px] text-papel focus:border-verde-claro focus:outline-none";
  const darkLabel = "block text-[11.5px] font-medium text-papel/50";

  return (
    <div className="border border-tinta bg-tinta text-papel">
      {/* Barra superior del mostrador: quién, desde dónde, en qué moneda */}
      <div className="flex flex-wrap items-end gap-4 border-b border-white/10 px-5 py-4">
        <label className={`min-w-0 flex-1 sm:max-w-56 ${darkLabel}`}>
          Cliente
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className={`${darkInput} [&>option]:bg-tinta`}
          >
            <option value="">Selecciona…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </label>
        <label className={`min-w-0 flex-1 sm:max-w-44 ${darkLabel}`}>
          Punto de emisión
          <select
            value={pointId}
            onChange={(e) => setPointId(e.target.value)}
            className={`${darkInput} [&>option]:bg-tinta`}
          >
            {emissionPoints.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </label>
        <label className={`min-w-0 flex-1 sm:max-w-44 ${darkLabel}`}>
          Despachar desde
          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            className={`${darkInput} [&>option]:bg-tinta`}
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.label}</option>
            ))}
          </select>
        </label>
        <div className="flex border border-white/15 text-[13px] font-medium">
          {(["USD", "VES"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => changeCurrency(c)}
              aria-pressed={cur === c}
              className={`px-4 py-2 transition-colors ${
                cur === c
                  ? "bg-verde text-white"
                  : "text-papel/60 hover:bg-white/10"
              }`}
            >
              {c === "USD" ? "$ USD" : "Bs."}
            </button>
          ))}
        </div>
      </div>

      <div className="grid items-start gap-6 p-5 lg:grid-cols-[1fr_21rem]">
        {/* Columna izquierda: catálogo sobre el mostrador */}
        <div className="min-w-0">
          {error && (
            <p role="alert" className="mb-5 border-l-2 border-[#e2857a] bg-[#3a1f1a] px-4 py-3 text-[14px] leading-relaxed text-[#f2b8ad]">
              {error}
            </p>
          )}

          <label className={`block ${darkLabel}`}>
            <span className="sr-only">Buscar producto</span>
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
              placeholder="Buscar producto — código o descripción… (Enter agrega el primero)"
              className="!mt-0 w-full border border-white/15 bg-white/[0.06] px-4 py-3 text-[15px] text-papel placeholder:text-papel/35 focus:border-verde-claro focus:outline-none"
            />
          </label>

          <div className="mt-4 grid auto-rows-fr grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
            {filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addAndRefocus(p)}
                className="flex h-full flex-col border border-white/10 bg-white/[0.05] p-3.5 text-left transition-colors duration-150 hover:border-verde-claro/70 hover:bg-white/[0.09] focus-visible:border-verde-claro focus-visible:outline-none active:scale-[0.98]"
              >
                <p className="num text-[11px] text-papel/40">{p.code}</p>
                <p className="mt-1 line-clamp-2 min-h-9 text-[13.5px] font-medium leading-snug text-papel">
                  {p.description}
                </p>
                <p className="num mt-auto pt-2 text-[16px] font-bold text-verde-claro">
                  {cur === "VES" && rate > 0 ? fmtBs(p.price_usd * rate) : fmtUsd(p.price_usd)}
                </p>
                <p className={`text-[11px] ${p.applies_vat ? "text-papel/40" : "text-verde-claro"}`}>
                  {p.applies_vat ? `IVA ${Number(p.vat_rate ?? 0)}%` : "Exento"}
                </p>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="col-span-full border border-dashed border-white/20 px-4 py-8 text-center text-[14px] text-papel/50">
                Ningún producto coincide con «{query}».
              </p>
            )}
          </div>
        </div>

        {/* Columna derecha: el ticket en papel, el único objeto claro */}
        <aside className="border border-tinta bg-white text-tinta shadow-[0_12px_32px_rgba(0,0,0,0.35)] lg:sticky lg:top-6">
          <div className="border-b-2 border-verde px-5 pb-3 pt-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[13px] font-semibold tracking-tight">Ticket</p>
              <p className="num text-[12px] text-tinta-suave">
                Tasa BCV {rate > 0 ? fmtQty(rate) : "—"}
              </p>
            </div>
            <p className="mt-0.5 truncate text-[12px] text-tinta-suave">
              {customers.find((c) => c.id === customerId)?.label ?? "Sin cliente"}
            </p>
          </div>

          {/* Renglones del ticket */}
          <div className="max-h-[38vh] overflow-y-auto lg:max-h-[42vh]">
            {lines.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px] leading-relaxed text-tinta-suave">
                Toca un producto del catálogo, o busca y pulsa Enter.
              </p>
            ) : (
              <ul className="divide-y divide-regla">
                {lines.map((l) => {
                  const unitUsd = cur === "VES" && rate > 0 ? l.price / rate : l.price;
                  return (
                    <li key={l.key} className="px-5 py-2.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="truncate text-[13.5px] font-medium">{l.product.description}</p>
                        <p className="num shrink-0 text-[13.5px] font-semibold">
                          {showPrice(unitUsd * l.qty)}
                        </p>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="flex items-center border border-regla">
                          <button
                            type="button"
                            aria-label="Restar"
                            onClick={() =>
                              l.qty > 1
                                ? setLine(l.key, { qty: l.qty - 1 })
                                : setLines((ls) => ls.filter((x) => x.key !== l.key))
                            }
                            className="px-2 py-0.5 text-[15px] leading-none text-tinta-suave hover:bg-papel-2"
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
                            className="num w-11 border-x border-regla px-1 py-1 text-center text-[13px] focus:outline-none"
                          />
                          <button
                            type="button"
                            aria-label="Sumar"
                            onClick={() => setLine(l.key, { qty: l.qty + 1 })}
                            className="px-2 py-0.5 text-[15px] leading-none text-tinta-suave hover:bg-papel-2"
                          >
                            +
                          </button>
                        </div>
                        <label className="text-[11px] text-tinta-suave">
                          <span className="sr-only">Precio unitario</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={l.price}
                            onChange={(e) => setLine(l.key, { price: Math.max(Number(e.target.value) || 0, 0) })}
                            className="num w-20 border border-regla px-2 py-1 text-right text-[13px] focus:border-verde focus:outline-none"
                          />
                        </label>
                        <span className="num text-[11px] text-tinta-suave">
                          {l.product.applies_vat ? `IVA ${Number(l.product.vat_rate ?? 0)}%` : "Exento"}
                        </span>
                        <button
                          type="button"
                          aria-label={`Quitar ${l.product.description}`}
                          onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                          className="ml-auto text-[15px] leading-none text-tinta-suave hover:text-rojo"
                        >
                          ×
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Totales */}
          <dl className="space-y-1 border-t border-regla px-5 py-3 text-[12.5px]">
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

          <div className="border-t-2 border-tinta bg-papel px-5 pb-4 pt-3">
            <p className="num text-[34px] font-bold leading-none tracking-tight">
              {fmtUsd(totals.total)}
            </p>
            <p className="num mt-1.5 text-[15px] font-medium text-ambar">
              {rate > 0 ? fmtBs(totals.total * rate) : "Sin tasa BCV"}
            </p>
            <button
              type="button"
              onClick={emit}
              disabled={pending || lines.length === 0 || !customerId || totals.total === 0}
              className="mt-4 min-h-[48px] w-full bg-tinta px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#161b22] active:bg-[#30363d] disabled:cursor-not-allowed disabled:bg-tinta-suave/30 disabled:text-papel/60"
            >
              {pending ? "Emitiendo…" : "Emitir factura"}
            </button>
            {(lines.length === 0 || !customerId) && (
              <p className="mt-2.5 text-center text-[11.5px] leading-relaxed text-tinta-suave">
                {!customerId ? "Elige un cliente arriba. " : ""}
                {lines.length === 0 ? "Agrega productos al ticket." : ""}
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
