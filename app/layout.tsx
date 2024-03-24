import { Viewport } from 'next'
import { ReactNode } from 'react'
import '../styles/globals.css'

export const viewport: Viewport = {
  themeColor: 'black',
  viewportFit: 'cover'
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  )
}
