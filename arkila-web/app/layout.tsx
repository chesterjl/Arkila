  import type { Metadata } from "next";
  import type { ReactNode } from "react";
  import "./globals.css";
  import { Toaster } from "react-hot-toast";
  import { AuthProvider } from "@/lib/auth";
  import Header from "@/components/Header";

  export const metadata: Metadata = { title: "Arkila", description: "Peer-to-peer car rental in Manila City."};

  export default function RootLayout({ children }: { children: ReactNode }) {
    return (
      <html lang="en">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Figtree:wght@400;500;600;700&display=swap" rel="stylesheet" />
        </head>
        <body>
          <AuthProvider>
            <Header />
            <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
          </AuthProvider>
          <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
        </body>
      </html>
    );
  }