import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: { default: 'Pedro Silva | Computational Space Physics', template: '%s | Pedro Silva' },
  description: 'Pedro Silva studies Earth’s magnetosphere, heavy ions, and space weather through physics-based modeling at the University of Illinois Urbana–Champaign.',
  icons: { icon: '/icon.svg' },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
