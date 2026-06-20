import "./globals.css";
import { ElevateAppProvider } from "@/components/Context";

export const metadata = {
  title: "Elevate AI — Premium Business Growth Operating System",
  description: "Capture leads, qualify prospects using AI, automate high-conversion follow-ups, and manage your pipeline from one premium, unified growth operating system.",
  keywords: "business growth, CRM pipeline, lead scoring, artificial intelligence CRM, sales automation, email automation, WhatsApp sales expert",
  authors: [{ name: "Elevate AI Team" }],
  openGraph: {
    title: "Elevate AI — AI Growth Operating System",
    description: "Turn more leads into customers automatically. The modern business platform for clinics, gyms, realtors, service providers, and manufacturers.",
    url: "https://elevateai.io",
    siteName: "Elevate AI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Elevate AI — AI Growth Operating System",
    description: "Turn more leads into customers automatically with advanced AI follow-ups.",
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="antialiased">
        <ElevateAppProvider>
          {children}
        </ElevateAppProvider>
      </body>
    </html>
  );
}
