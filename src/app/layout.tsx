import "@fontsource-variable/inter";
import "@fontsource-variable/space-grotesk";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { NativeAppSetup } from "@/components/NativeAppSetup";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} — ${site.tagline}`, template: `%s · ${site.name}` },
  description: site.description,
  applicationName: site.name,
  openGraph: { type: "website", siteName: site.name, locale: "en_IN" },
  twitter: { card: "summary_large_image" },
  formatDetection: { email: false, telephone: false, address: false },
  verification: site.googleSiteVerification ? { google: site.googleSiteVerification } : undefined,
  // AdSense site verification (meta-tag method). Loads no ad code by itself.
  other: site.ads.client ? { "google-adsense-account": site.ads.client } : undefined,
};

export const viewport: Viewport = { themeColor: "#0a0f1f", colorScheme: "dark", viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: browser extensions (recorders, password managers, translators) add attributes to
    // <html>/<body> before React loads. This ignores attribute differences on these two elements only.
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <a href="#main" className="skip-link">Skip to content</a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
        <NativeAppSetup />
      </body>
    </html>
  );
}
