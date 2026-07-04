import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AuthHashHandler } from "@/components/auth-hash-handler";

export const metadata: Metadata = {
  title: {
    default: "MäklarForum – Sveriges community för fastighetsmäklare",
    template: "%s | MäklarForum",
  },
  description:
    "Slutet community för verifierade fastighetsmäklare i Sverige. Diskutera med kollegor i geografiska grupper, ställ frågor, rösta och bygg ditt nätverk.",
  metadataBase: new URL("https://maklarforum.se"),
  openGraph: {
    type: "website",
    locale: "sv_SE",
    siteName: "MäklarForum",
    title: "MäklarForum – Sveriges community för fastighetsmäklare",
    description:
      "Slutet community för verifierade fastighetsmäklare i Sverige. Geografiska grupper, frågor & svar, omröstningar och direktmeddelanden.",
    images: [{ url: "/images/hero-bg.jpg", width: 1440, height: 640, alt: "MäklarForum" }],
  },
  robots: {
    index: true,
    follow: true,
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
