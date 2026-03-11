import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Retell AI Management Console",
  description: "Comprehensive management dashboard for Retell AI voice platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
