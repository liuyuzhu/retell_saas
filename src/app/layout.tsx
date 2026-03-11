// This is the root layout wrapper - it should NOT contain html/body tags
// The actual layout with html/body is in [locale]/layout.tsx
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
