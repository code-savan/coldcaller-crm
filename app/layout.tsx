import "./globals.css";
import { metadata } from "./metadata";
import { ClientLayout } from "@/components/ClientLayout";

export { metadata };

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="CallFlow" />
        <link rel="apple-touch-icon" href="/logo1.png" />
      </head>
      <body className="antialiased bg-zinc-950 text-white min-h-screen">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
