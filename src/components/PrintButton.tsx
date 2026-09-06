"use client";

export function PrintButton({ label = "Imprimir factura" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="border border-tinta px-5 py-2.5 text-[14px] font-medium hover:bg-papel-2 print:hidden"
    >
      {label}
    </button>
  );
}
