import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ads, absoluteUrl, site } from "@/lib/site";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { JsonLd, personSchema, websiteSchema } from "@/components/JsonLd";
import { MascotLoader } from "@/components/mascot/MascotLoader";

const display = localFont({
  src: "./fonts/bricolage.woff2",
  variable: "--font-bricolage",
  display: "swap",
  weight: "200 800",
});
const body = localFont({
  src: "./fonts/figtree.woff2",
  variable: "--font-figtree",
  display: "swap",
  weight: "300 900",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.title, template: `%s | ${site.name}` },
  description: site.description,
  applicationName: site.name,
  authors: [{ name: site.author.name, url: site.url }],
  creator: site.author.name,
  publisher: site.author.name,
  // Canonical URLs are set per page via pageMeta() so no page inherits the home canonical.
  alternates: { types: { "application/rss+xml": absoluteUrl("/feed.xml") } },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  openGraph: {
    type: "website",
    locale: site.locale,
    url: site.url,
    siteName: site.name,
    title: site.title,
    description: site.description,
  },
  twitter: { card: "summary_large_image", title: site.title, description: site.description },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
      ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
      : undefined,
  },
  category: "technology",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1124" },
  ],
};

// Runs before paint so a saved theme never flashes the wrong colours.
const themeScript = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {ads.client ? (
          // Loaded directly (not deferred) so AdSense reviewers and crawlers see the tag.
          // Consent for EEA/UK/CH is handled by Google's certified CMP (AdSense → Privacy & messaging).
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ads.client}`}
            crossOrigin="anonymous"
          />
        ) : null}
        {ads.client ? <meta name="google-adsense-account" content={ads.client} /> : null}
      </head>
      <body className="antialiased">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <JsonLd data={[personSchema(), websiteSchema()]} />
        <Header />
        <main id="main">{children}</main>
        <Footer />
        <MascotLoader />
      </body>
    </html>
  );
}
