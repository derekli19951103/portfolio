import type { Viewport } from 'next'
import { ReactNode } from 'react'
import '../styles/globals.css'

export const viewport: Viewport = {
  themeColor: 'black',
  viewportFit: 'cover'
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
