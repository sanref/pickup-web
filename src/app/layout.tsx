import type { Metadata } from "next";
import { Caprasimo, Figtree } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const caprasimo = Caprasimo({
  variable: "--font-caprasimo",
  weight: "400",
  subsets: ["latin", "latin-ext"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  weight: ["400", "600", "700"],
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: {
    default: "PickUp — Armá el partido",
    template: "%s · PickUp",
  },
  description:
    "Publicá el partido con dos o tres horarios posibles, votá el que te sirve y sumate hasta completar el cupo.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-AR"
      className={`${caprasimo.variable} ${figtree.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
