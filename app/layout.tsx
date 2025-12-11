import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Referent',
  description: 'Референт - переводчик с ИИ-обработкой',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
