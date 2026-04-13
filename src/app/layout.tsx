import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Facturation - Manil Belkacem EI",
  description: "Application de facturation",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider afterSignOutUrl="/sign-in" signInUrl="/sign-in" signUpUrl="/sign-up">
      <html lang="fr" className={`${inter.variable} h-full antialiased`}>
        <body className="min-h-full flex flex-col bg-gray-50">{children}</body>
      </html>
    </ClerkProvider>
  );
}
