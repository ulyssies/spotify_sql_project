import type { Metadata } from 'next'
import { DM_Mono, DM_Sans, Syne } from 'next/font/google'
import './globals.css'

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'SpotYourVibe',
  description: 'Your listening. Visualized.',
  icons: {
    icon: '/brand/spotyourvibe-mark.png',
    shortcut: '/brand/spotyourvibe-mark.png',
    apple: '/brand/spotyourvibe-mark.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${dmSans.variable} ${dmMono.variable}`}
    >
      <body className="bg-background text-primary antialiased">
        {children}
      </body>
    </html>
  )
}
