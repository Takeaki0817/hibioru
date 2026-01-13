import type { Metadata, Viewport } from "next";
import { M_PLUS_Rounded_1c } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { InstallBanner } from "@/components/pwa/InstallBanner";
import { SkipLink } from "@/components/ui/skip-link";
import { Toaster } from "sonner";
import { APP_CONFIG, ICON_CONFIG } from "@/lib/constants/app-config";

const mPlusRounded1c = M_PLUS_Rounded_1c({
  variable: "--font-m-plus-rounded-1c",
  weight: ["500", "700"],
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

// モバイルでキーボード表示時にレイアウトビューポートもリサイズ
// dvh使用時にキーボードを考慮した高さになる
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body
        className={`${mPlusRounded1c.variable} font-sans antialiased font-medium`}
      >
        <SkipLink />
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>{children}</AuthProvider>
          </QueryProvider>
          <ServiceWorkerRegistration />
          <InstallBanner />
          <Toaster position="top-center" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
