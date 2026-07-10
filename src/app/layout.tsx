import type { Metadata } from "next";
import { appConfig, siteUrl } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Instant Seeker | AI-assisted match screenshot analysis",
    template: "%s | Instant Seeker",
  },
  description: appConfig.description,
  applicationName: appConfig.name,
  keywords: [
    "virtual match analysis",
    "screenshot analysis",
    "probability insights",
    "risk indicators",
  ],
  openGraph: {
    type: "website",
    siteName: appConfig.name,
    title: "Instant Seeker",
    description: appConfig.description,
    url: "/",
    images: [
      {
        url: "/og.png",
        width: 1734,
        height: 907,
        alt: "Instant Seeker probability analysis interface",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Instant Seeker",
    description: appConfig.description,
    images: ["/og.png"],
  },
  alternates: { canonical: "/" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
