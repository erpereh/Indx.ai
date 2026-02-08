import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { InvestmentProvider } from "@/context/InvestmentContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Indx.ai - Dashboard de Inversiones",
    description: "Dashboard personalizado para seguimiento de inversiones y cartera de fondos",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="es" className="dark">
            <body className={inter.className}>
                <InvestmentProvider>
                    {children}
                </InvestmentProvider>
            </body>
        </html>
    );
}
