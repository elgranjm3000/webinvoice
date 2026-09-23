import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";

/**
 * Login minimalista: tarjeta blanca de máx. 400px centrada sobre
 * gris frío, logotipo arriba en el centro, sin adornos.
 */
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { error, ok } = await searchParams;
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-papel px-4 py-10">
      {/* Logotipo centrado, reducido */}
      <div className="mb-8 text-center">
        <p className="text-[20px] font-semibold leading-none tracking-tight text-tinta">
          Facturación
          <span className="num ml-1.5 text-[14px] font-medium text-verde">26</span>
        </p>
        <span aria-hidden className="mx-auto mt-3 block h-px w-16 bg-tinta/60" />
        <span aria-hidden className="mx-auto mt-px block h-[2.5px] w-8 bg-verde" />
      </div>

      <div className="w-full max-w-[400px] rounded-lg border border-regla bg-white p-8">
        <h1 className="text-[18px] font-semibold tracking-tight text-tinta">
          Iniciar sesión
        </h1>
        <p className="mt-1 text-[13px] text-tinta-suave">
          Accede con tu cuenta para continuar.
        </p>

        {ok && (
          <p className="mt-5 rounded-md bg-esmeralda/10 px-4 py-3 text-[13px] leading-relaxed text-esmeralda">
            {ok}
          </p>
        )}

        <div className="mt-6">
          <LoginForm error={error} />
        </div>

        <p className="mt-7 border-t border-regla pt-4 text-center text-[13px] text-tinta-suave">
          ¿Primera vez?{" "}
          <Link href="/registro" className="font-medium text-verde hover:text-indigo">
            Registra tu empresa
          </Link>
        </p>
      </div>

      <p className="mt-6 max-w-[400px] text-center text-[11.5px] leading-relaxed text-tinta-suave/80">
        Sistema de facturación multi-país con requisitos fiscales locales.
      </p>
    </main>
  );
}
