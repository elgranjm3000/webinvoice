"use client";

export function DeleteButton({ name }: { name: string }) {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!window.confirm(`¿Eliminar a «${name}»?`)) e.preventDefault();
      }}
      className="block w-full rounded-md px-3 py-2 text-left text-[13px] text-rojo transition-colors hover:bg-[#fef2f2]"
    >
      Eliminar
    </button>
  );
}
