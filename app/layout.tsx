import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Referent',
  description: 'Я изучаю Next.js',
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
