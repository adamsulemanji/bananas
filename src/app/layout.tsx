import type { Metadata } from "next";
import { Geist, Geist_Mono, Cinzel_Decorative, Crimson_Pro, Courier_Prime } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cinzel = Cinzel_Decorative({
  variable: "--font-cinzel-display",
  weight: ["400", "700", "900"],
  subsets: ["latin"],
});

const crimson = Crimson_Pro({
  variable: "--font-crimson-body",
  weight: ["200", "300", "400", "500", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
});

const courierPrime = Courier_Prime({
  variable: "--font-courier-prime",
  weight: ["400", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bananagrams",
  description: "Assemble your tiles. Form your words. Beat the bunch.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${cinzel.variable} ${crimson.variable} ${courierPrime.variable} antialiased`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
