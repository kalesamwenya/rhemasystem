import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { EventsProvider } from "@/components/events/EventsContext";
import AlertProvider from "@/components/ui/AlertProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rhema Zambia | Bible Training Center",
  description: "Training labourers for the harvest fields of the world at Rhema Bible Training Center Zambia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <EventsProvider>
          {children}
          <AlertProvider />
        </EventsProvider>
      </body>
    </html>
  );
}
