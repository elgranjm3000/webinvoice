const usd = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const qty = new Intl.NumberFormat("es-VE", { maximumFractionDigits: 2 });

export const fmtUsd = (n: number | null | undefined) =>
  n == null ? "—" : `$ ${usd.format(n)}`;

export const fmtBs = (n: number | null | undefined) =>
  n == null ? "—" : `Bs. ${usd.format(n)}`;

export const fmtQty = (n: number | null | undefined) =>
  n == null ? "—" : qty.format(n);

export const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("es-VE", { day: "2-digit", month: "short", year: "numeric" }) : "—";
