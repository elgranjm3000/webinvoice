import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";

/**
 * Login según la referencia compartida: fondo gris suave, tarjeta
 * blanca centrada con banda oscura de marca arriba y botón teal.
 */
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { error, ok } = await searchParams;
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-papel px-4 py-10">
      <div className="w-full max-w-[420px]">
        {/* Tarjeta: banda oscura de marca + formulario en blanco */}
        <div className="card-lift overflow-hidden">
          {/* Banda oscura de marca */}
          <div className="bg-tinta px-8 pb-7 pt-8 text-papel">
            <p className="text-[24px] font-semibold leading-none tracking-tight">
              Facturación
              <span className="num ml-2 align-top text-[15px] font-medium text-verde-claro">
                2026
              </span>
            </p>
            <span aria-hidden className="mt-4 block h-px w-full bg-papel/30" />
            <span aria-hidden className="mt-px block h-[3px] w-10 bg-verde-claro" />
            <p className="mt-4 text-[13px] leading-relaxed text-papel/70">
              Facturación fiscal y control de almacenes
            </p>
          </div>

          {/* Formulario */}
          <div className="bg-white px-8 py-8">
            {ok && (
              <p className="mb-5 border-l-2 border-esmeralda px-4 py-3 text-[13.5px] leading-relaxed text-esmeralda">
                {ok}
              </p>
            )}

            <LoginForm error={error} />

            <p className="mt-6 text-center text-[13px] text-tinta-suave">
              ¿Primera vez?{" "}
              <Link href="/registro" className="font-medium text-verde underline underline-offset-2">
                Registra tu empresa
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-[11.5px] leading-relaxed text-tinta-suave/80">
          Sistema multi-país: cada empresa factura en su moneda con los
          requisitos fiscales de su país.
        </p>
      </div>
    </main>
  );
}
