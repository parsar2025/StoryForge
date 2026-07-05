import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'StoryForge',
  description: 'An RPG-style skill development system with AI mentorship',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
