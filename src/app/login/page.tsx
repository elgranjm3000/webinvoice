import { LoginForm } from "@/components/LoginForm";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen flex-col lg:flex-row">
      {/*
        Portada del libro fiscal: el panel en tinta es la contraportada
        del sistema; el formulario vive en la hoja de papel.
      */}
      <section className="relative flex flex-col justify-between overflow-hidden bg-tinta px-7 pb-9 pt-10 text-papel sm:px-10 sm:pb-12 sm:pt-14 lg:w-[46%] lg:max-w-[620px]">
        <div>
          <p className="text-[30px] font-semibold leading-none tracking-tight sm:text-[38px]">
            Facturación
            <span className="num ml-2 align-top text-[18px] font-medium text-verde-claro sm:text-[20px]">
              2026
            </span>
          </p>
          {/* Doble regla de la marca, invertida */}
          <span aria-hidden className="mt-5 block h-px w-full bg-papel/30" />
          <span aria-hidden className="mt-px block h-[3px] w-14 bg-verde-claro" />
          <p className="mt-5 max-w-[30ch] text-[14px] leading-relaxed text-papel/70">
            Facturación fiscal y control de almacenes, con libros al día en
            bolívares y dólares.
          </p>
        </div>

        {/* Franja de datos, como el pie de un formulario fiscal */}
        <dl className="mt-12 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-papel/20 pt-6 text-[12.5px] lg:mt-auto lg:grid-cols-1 lg:gap-y-5 xl:grid-cols-2">
          <div>
            <dt className="text-papel/50">Documentos</dt>
            <dd className="mt-1 font-medium text-papel/90">
              Facturas, notas de crédito y débito
            </dd>
          </div>
          <div>
            <dt className="text-papel/50">Conformidad</dt>
            <dd className="mt-1 font-medium text-papel/90">SENIAT · N° de control</dd>
          </div>
          <div>
            <dt className="text-papel/50">Monedas</dt>
            <dd className="mt-1 font-medium text-papel/90">USD y Bs. a tasa BCV</dd>
          </div>
          <div>
            <dt className="text-papel/50">Inventario</dt>
            <dd className="mt-1 font-medium text-papel/90">Kardex por almacén</dd>
          </div>
        </dl>
      </section>

      {/* Hoja del formulario */}
      <section className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-[400px]">
          <header className="mb-8">
            <p className="text-[12.5px] text-tinta-suave">Acceso al sistema</p>
            <h1 className="mt-1 text-[22px] font-semibold leading-tight tracking-tight">
              Iniciar sesión
            </h1>
            <span aria-hidden className="mt-4 block h-px w-full bg-tinta" />
            <span aria-hidden className="mt-px block h-[3px] w-10 bg-verde" />
          </header>

          <LoginForm error={error} />

          <p className="mt-10 border-t border-regla pt-4 text-[11.5px] leading-relaxed text-tinta-suave">
            Los montos quedan registrados en USD y en bolívares con la tasa BCV
            vigente a la fecha de emisión.
          </p>
        </div>
      </section>
    </main>
  );
}
