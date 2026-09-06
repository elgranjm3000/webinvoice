"use client";

export function DeleteButton({ name }: { name: string }) {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!window.confirm(`¿Eliminar a «${name}»?`)) e.preventDefault();
      }}
      className="text-[12px] text-tinta-suave underline-offset-2 hover:text-rojo hover:underline"
    >
      Eliminar
    </button>
  );
}
