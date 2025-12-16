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
    // Для некоторых сайтов HEAD может не работать, поэтому сразу пробуем GET
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
          'Referer': 'https://www.google.com/',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(15000) // 15 секунд для проверки
      })

      // Проверяем, что статус успешный (2xx) или редирект (3xx)
      // Также считаем доступным, если статус 403 (может быть защита, но страница существует)
      const isAvailable = response.ok || 
                          (response.status >= 300 && response.status < 400) ||
                          response.status === 403 // 403 может означать, что страница есть, но доступ ограничен
      
      console.log('Проверка доступности статьи:', {
        url,
        status: response.status,
        ok: response.ok,
        isAvailable,
        timestamp: new Date().toISOString()
      })
      
      return NextResponse.json({
        exists: isAvailable,
        status: response.status
      })
    } catch (checkError) {
      const errorMessage = checkError instanceof Error ? checkError.message : 'Неизвестная ошибка'
      console.error('Ошибка проверки доступности статьи:', {
        url,
        error: errorMessage,
        timestamp: new Date().toISOString()
      })
      
      // Если это таймаут или сетевая ошибка, считаем, что статья может быть доступна
      // (позволим парсеру попробовать)
      if (errorMessage.includes('timeout') || errorMessage.includes('aborted')) {
        return NextResponse.json({
          exists: true, // Позволяем попробовать парсить
          status: 0,
          warning: 'Таймаут при проверке, но попытка парсинга будет выполнена'
        })
      }
      
      return NextResponse.json(
        { 
          exists: false,
          error: 'Не удалось проверить доступность статьи',
          details: errorMessage
        },
        { status: 200 } // Возвращаем 200, но с exists: false
      )
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

