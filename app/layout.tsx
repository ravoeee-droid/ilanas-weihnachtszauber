import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "Ilanas Weihnachtszauber",
  title: {
    default: "Ilanas Weihnachtszauber",
    template: "%s · Ilanas Weihnachtszauber"
  },
  description:
    "Eine magische Fleißsterne-App mit Puschelplumps, Wünschen und Weihnachtsabenteuern.",
  manifest: "/manifest.webmanifest",
  formatDetection: {
    telephone: false,
    email: false,
    address: false
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Weihnachtszauber"
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#061321"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
