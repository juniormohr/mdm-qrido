import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Qrido - fidelize seus clientes",
  description: "transforme seus clientes em fãs",
  openGraph: {
    title: "Qrido - fidelize seus clientes",
    description: "transforme seus clientes em fãs",
    url: "https://www.qridoapp.com.br",
    siteName: "Qrido",
    locale: "pt_BR",
    type: "website",
  },
  icons: {
    icon: "/favicon.png?v=4",
    apple: "/apple-touch-icon.png?v=4",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
