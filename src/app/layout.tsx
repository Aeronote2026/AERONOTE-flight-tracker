import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AERONOTE · Student Pilot Flight Tracker",
  description:
    "A personal flight logbook and training tracker for EASA student pilots.",
  applicationName: "AERONOTE",
  appleWebApp: {
    capable: true,
    title: "AERONOTE",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#070d1a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
