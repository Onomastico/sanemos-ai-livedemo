import { Plus_Jakarta_Sans, Inter, Lora } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const lora = Lora({
  variable: "--font-ai",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

export const metadata = {
  title: "Sanemos AI Live — Grief Support with Real-Time Voice AI",
  description: "24/7 grief companion platform with 8 specialized AI agents. Real-time voice conversations powered by Google Gemini Multimodal Live API.",
  icons: {
    icon: "/sanemos_logo.png",
    apple: "/sanemos_logo.png",
  },
  openGraph: {
    title: "Sanemos AI Live",
    description: "Real-time voice AI companions for grief support. 8 specialized agents, emotion detection, breathing exercises, and crisis support — always available.",
    siteName: "Sanemos AI Live",
    type: "website",
  },
};

// Inline script to prevent FOUC — runs before React hydration
const themeScript = `(function(){try{var t=localStorage.getItem('sanemos_theme')||'dark';if(t==='system'){t=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'}document.documentElement.classList.add(t)}catch(e){document.documentElement.classList.add('dark')}})()`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${plusJakarta.variable} ${inter.variable} ${lora.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
