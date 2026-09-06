import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";
import { Shell } from "@/components/Shell";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
});

export const metadata: Metadata = {
  title: "Facturación 2026",
  description: "Facturación fiscal venezolana y control de almacenes",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-VE">
      <body className={`${archivo.variable} antialiased`}>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
