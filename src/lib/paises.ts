/**
 * Países soportados por el sistema. Cada uno define moneda, formato
 * numérico, etiqueta de identificación fiscal e impuesto principal.
 * Solo Venezuela activa el flujo SENIAT (n° de control, IGTF, Bs.).
 */
export type Pais = {
  code: string;
  nombre: string;
  moneda: string;
  simbolo: string;
  locale: string;
  impuesto: string;
  idLabel: string;
};

export const PAISES: Pais[] = [
  { code: "VE", nombre: "Venezuela", moneda: "USD", simbolo: "$", locale: "es-VE", impuesto: "IVA", idLabel: "RIF" },
  { code: "CO", nombre: "Colombia", moneda: "COP", simbolo: "$", locale: "es-CO", impuesto: "IVA", idLabel: "NIT" },
  { code: "EC", nombre: "Ecuador", moneda: "USD", simbolo: "$", locale: "es-EC", impuesto: "IVA", idLabel: "RUC" },
  { code: "PE", nombre: "Perú", moneda: "PEN", simbolo: "S/", locale: "es-PE", impuesto: "IGV", idLabel: "RUC" },
  { code: "MX", nombre: "México", moneda: "MXN", simbolo: "$", locale: "es-MX", impuesto: "IVA", idLabel: "RFC" },
  { code: "CL", nombre: "Chile", moneda: "CLP", simbolo: "$", locale: "es-CL", impuesto: "IVA", idLabel: "RUT" },
  { code: "AR", nombre: "Argentina", moneda: "ARS", simbolo: "$", locale: "es-AR", impuesto: "IVA", idLabel: "CUIT" },
  { code: "US", nombre: "Estados Unidos", moneda: "USD", simbolo: "$", locale: "en-US", impuesto: "Sales Tax", idLabel: "EIN" },
  { code: "ES", nombre: "España", moneda: "EUR", simbolo: "€", locale: "es-ES", impuesto: "IVA", idLabel: "NIF" },
];

export function paisPorCodigo(code: string): Pais {
  return PAISES.find((p) => p.code === code) ?? PAISES[0];
}
