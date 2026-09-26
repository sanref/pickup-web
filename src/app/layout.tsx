import type { Metadata } from "next";
import { Familjen_Grotesk, Graduate } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const graduate = Graduate({
  variable: "--font-graduate",
  weight: "400",
  subsets: ["latin"],
});

const grotesk = Familjen_Grotesk({
  variable: "--font-grotesk",
  weight: ["400", "500", "600", "700"],
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
      className={`${graduate.variable} ${grotesk.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <div aria-hidden className="app-backdrop" />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
