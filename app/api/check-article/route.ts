import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  let url: string | undefined
  try {
    const requestBody = await request.json()
    url = requestBody.url

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL обязателен' },
        { status: 400 }
      )
    }

    // Проверяем доступность статьи
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(10000) // 10 секунд для проверки
      })

      // Проверяем, что статус успешный (2xx) или редирект (3xx)
      const isAvailable = response.ok || (response.status >= 300 && response.status < 400)
      
      return NextResponse.json({
        exists: isAvailable,
        status: response.status
      })
    } catch (headError) {
      // Если HEAD не поддерживается, пробуем GET с ограничением
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
          },
          redirect: 'follow',
          signal: AbortSignal.timeout(10000)
        })

        const isAvailable = response.ok || (response.status >= 300 && response.status < 400)
        
        return NextResponse.json({
          exists: isAvailable,
          status: response.status
        })
      } catch (getError) {
        return NextResponse.json(
          { 
            exists: false,
            error: 'Не удалось проверить доступность статьи'
          },
          { status: 200 } // Возвращаем 200, но с exists: false
        )
      }
    }
  } catch (error) {
    console.error('Ошибка проверки статьи:', error)
    return NextResponse.json(
      { 
        exists: false,
        error: 'Ошибка при проверке доступности статьи'
      },
      { status: 200 }
    )
  }
}

