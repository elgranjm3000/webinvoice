/**
 * Formato consciente de la configuración de la empresa: moneda y
 * locale vienen de companies (008_company_localization). Venezuela
 * conserva su par USD/Bs.; el resto del mundo formatea solo su moneda.
 */

export type CompanyLocale = {
  currency_code: string;
  currency_symbol: string;
  locale: string;
  tax_name: string;
  tax_id_label: string;
  secondary_currency: string | null;
  uses_igtf: boolean;
  country_code: string;
};

const DEFAULTS: CompanyLocale = {
  country_code: "VE",
  currency_code: "USD",
  currency_symbol: "$",
  locale: "es-VE",
  tax_name: "IVA",
  tax_id_label: "RIF",
  secondary_currency: "VES",
  uses_igtf: true,
};

export function companyLocale(c: Partial<CompanyLocale> | null | undefined): CompanyLocale {
  return { ...DEFAULTS, ...(c ?? {}) };
}

/** Monto principal de la empresa: "$ 1.234,56" con Intl según locale. */
export function money(n: number | null | undefined, cfg: CompanyLocale): string {
  if (n == null) return "—";
  const value = new Intl.NumberFormat(cfg.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return `${cfg.currency_symbol} ${value}`;
}

/** Código de moneda para documentos: "USD 1.234,56". */
export function moneyCode(n: number | null | undefined, cfg: CompanyLocale): string {
  if (n == null) return "—";
  return `${cfg.currency_code} ${money(n, cfg).slice(cfg.currency_symbol.length + 1)}`;
}

export function fmtDateLocale(d: string | null | undefined, locale: string): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
