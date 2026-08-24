import type { Metadata } from "next";
import { AppShell } from "../components/app-shell";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  title: {
    default: "Controle de Empenhos Hortifruti",
    template: "%s · HortiControl",
  },
  description:
    "Controle de notas de empenho, pedidos, quantidades e saldos de hortifruti.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    ...(siteUrl ? { url: siteUrl } : {}),
    siteName: "HortiControl",
    title: "Controle de Empenhos Hortifruti",
    description: "Pedidos, saldos e NEs sob controle.",
    ...(siteUrl
      ? {
          images: [
            {
              url: `${siteUrl}/og.png`,
              width: 1536,
              height: 1024,
              alt: "Controle de Empenhos Hortifruti",
            },
          ],
        }
      : {}),
  },
  twitter: {
    card: "summary_large_image",
    title: "Controle de Empenhos Hortifruti",
    description: "Pedidos, saldos e NEs sob controle.",
    ...(siteUrl ? { images: [`${siteUrl}/og.png`] } : {}),
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <AppShell displayName="Usuário">{children}</AppShell>
      </body>
    </html>
  );
}
