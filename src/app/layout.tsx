import type { Metadata } from "next";
import { M_PLUS_1p } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { InstallBanner } from "@/components/pwa/InstallBanner";
import { SkipLink } from "@/components/ui/skip-link";
import { Toaster } from "@/components/ui/toaster";
import { APP_CONFIG, ICON_CONFIG } from "@/lib/constants/app-config";

const mPlus1p = M_PLUS_1p({
  variable: "--font-m-plus-1p",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: APP_CONFIG.name,
  description: APP_CONFIG.description,
  // PWA manifest リンク
  manifest: '/manifest.webmanifest',
  // PWA用メタデータ
  applicationName: APP_CONFIG.shortName,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_CONFIG.shortName,
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: ICON_CONFIG.favicon32, sizes: "32x32", type: "image/png" },
      { url: ICON_CONFIG.favicon16, sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: ICON_CONFIG.appleTouchIcon, sizes: "180x180", type: "image/png" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body
        className={`${mPlus1p.variable} antialiased`}
      >
        <SkipLink />
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
          <ServiceWorkerRegistration />
          <InstallBanner />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
