import { LoginForm } from "@/components/LoginForm";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen flex-col">
      {/* Marco tipo formulario fiscal */}
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6">
        <header className="border-b border-tinta pb-1 pt-10 text-center sm:pt-16">
          <div className="border-b-[3px] border-tinta pb-6">
          <p className="leading-tight">
            <span className="block text-[28px] font-semibold tracking-tight">
              Facturación
            </span>
            <span className="num mt-1 block text-[16px] text-verde">
              2026 · Venezuela
            </span>
          </p>
          <p className="mt-4 text-[13px] leading-relaxed text-tinta-suave">
            Facturación fiscal y control de almacenes
          </p>
          </div>
        </header>

        <section className="mt-8 border border-regla bg-white p-5 sm:mt-10 sm:p-8">
          <LoginForm error={error} />
        </section>

        <footer className="mt-auto py-8 text-center text-[12px] text-tinta-suave">
          Documentos conforme a SENIAT · Montos en USD y Bs. según tasa BCV
        </footer>
      </div>
    </main>
  );
}
