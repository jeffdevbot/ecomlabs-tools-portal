import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ecomlabs Tools Portal",
  description: "Central hub for Ecomlabs internal tools"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
