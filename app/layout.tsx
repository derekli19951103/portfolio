import { ReactNode } from 'react'
import '../styles/globals.css'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html>
      <head>
        <title>Yufeng Li</title>
        <meta name="description" content="Yufeng Li Portfolio" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>{children}</body>
    </html>
  )
}
