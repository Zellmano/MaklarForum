import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AuthHashHandler } from "@/components/auth-hash-handler";

export const metadata: Metadata = {
  title: {
    default: "Mäklarforum.se – Frågor & svar om bostadsköp och försäljning",
    template: "%s | Mäklarforum.se",
  },
  description: "Ställ frågor om bostadsköp och försäljning och få svar från verifierade fastighetsmäklare i Sverige. Guider, ordlista och mäklarprofiler.",
  metadataBase: new URL("https://maklarforum.se"),
  openGraph: {
    type: "website",
    locale: "sv_SE",
    siteName: "Mäklarforum.se",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
      <body>
        <AuthHashHandler />
        <SiteHeader />
        <main className="mx-auto w-full max-w-6xl px-4 pt-8 sm:px-6">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
