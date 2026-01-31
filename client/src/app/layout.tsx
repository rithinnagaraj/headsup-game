import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Who Am I? - Multiplayer Guessing Game',
  description: 'A real-time multiplayer game where players guess their assigned identities',
  keywords: ['game', 'multiplayer', 'guessing', 'party game', 'headbands'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning>
        <main className="min-h-screen bg-game-bg">
          {children}
        </main>
      </body>
    </html>
  );
}
