import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Judge Me If You Can - Comedy Game Show',
  description: 'The ultimate comedy game show where we test how well you know our guest!',
  keywords: 'comedy, game show, entertainment, live show',
  authors: [{ name: 'JMYIC Team' }],
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#1e1b4b" />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}