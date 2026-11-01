import type { Metadata, Viewport } from 'next';
import { Bodoni_Moda, Instrument_Sans } from 'next/font/google';
import type { ReactNode } from 'react';

import './globals.css';

const display = Bodoni_Moda({ subsets: ['latin'], style: ['normal', 'italic'], variable: '--font-display', display: 'swap' });
const text = Instrument_Sans({ subsets: ['latin'], variable: '--font-text', display: 'swap' });

export const metadata: Metadata = { title: 'Fluffy Africa Admin', robots: { index: false, follow: false } };
export const viewport: Viewport = { themeColor: '#14211f', viewportFit: 'cover' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${text.variable}`}>
      <body>{children}</body>
    </html>
  );
}
