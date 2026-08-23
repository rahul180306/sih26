import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'JalRakshak Urban — Flood Nowcasting & Intelligence Platform',
  description: 'Real-time urban flood nowcasting connecting rainfall, drainage, and terrain intelligence for smart cities.',
  openGraph: {
    title: 'JalRakshak Urban — Flood Nowcasting & Intelligence Platform',
    description: 'Real-time urban flood nowcasting connecting rainfall, drainage, and terrain intelligence for smart cities.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'JalRakshak Urban — Flood Nowcasting & Intelligence Platform',
    description: 'Real-time urban flood nowcasting connecting rainfall, drainage, and terrain intelligence for smart cities.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
