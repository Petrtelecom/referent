import { NextRequest, NextResponse } from 'next/server'
import { load } from 'cheerio'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL обязателен' },
        { status: 400 }
      )
    }

    // Получаем HTML страницы с реалистичными заголовками браузера
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
      },
      redirect: 'follow',
      // Увеличиваем таймаут для медленных сайтов
      signal: AbortSignal.timeout(30000) // 30 секунд
    })

    if (!response.ok) {
      const statusText = response.statusText || 'Неизвестная ошибка'
      let errorMessage = `Не удалось загрузить страницу: ${statusText} (${response.status})`
      
      // Более детальные сообщения об ошибках
      if (response.status === 403) {
        errorMessage = `Доступ запрещен (403). Сайт блокирует автоматические запросы. Возможно, требуется авторизация или сайт защищен от ботов.`
      } else if (response.status === 404) {
        errorMessage = `Страница не найдена (404). Проверьте правильность URL.`
      } else if (response.status === 429) {
        errorMessage = `Слишком много запросов (429). Попробуйте позже.`
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      )
    }

    const html = await response.text()
    const $ = load(html)

    // Извлекаем заголовок
    let title = ''
    // Пробуем разные селекторы для заголовка
    const titleSelectors = [
      'h1',
      'article h1',
      '.post-title',
      '.article-title',
      '.entry-title',
      '[property="og:title"]',
      'title'
    ]
    
    for (const selector of titleSelectors) {
      const element = $(selector).first()
      if (element.length) {
        title = selector.includes('property') 
          ? element.attr('content') || ''
          : element.text().trim()
        if (title) break
      }
    }

    // Извлекаем дату
    let date = ''
    const dateSelectors = [
      'time[datetime]',
      'time',
      '.date',
      '.published',
      '.post-date',
      '.article-date',
      '[property="article:published_time"]',
      'meta[property="article:published_time"]'
    ]
    
    for (const selector of dateSelectors) {
      const element = $(selector).first()
      if (element.length) {
        date = element.attr('datetime') || 
               element.attr('content') || 
               element.text().trim()
        if (date) break
      }
    }

    // Извлекаем основной контент
    let content = ''
    const contentSelectors = [
      'article',
      '.post',
      '.content',
      '.article-content',
      '.entry-content',
      '.post-content',
      'main article',
      '[role="article"]'
    ]
    
    for (const selector of contentSelectors) {
      const element = $(selector).first()
      if (element.length) {
        // Удаляем ненужные элементы (скрипты, стили, реклама)
        element.find('script, style, nav, aside, .advertisement, .ads, .sidebar').remove()
        content = element.text().trim()
        if (content && content.length > 100) break // Минимум 100 символов для валидного контента
      }
    }

    // Если не нашли через селекторы, берем body без header/footer/nav
    if (!content) {
      $('header, footer, nav, aside').remove()
      content = $('body').text().trim()
    }

    // Очищаем контент от лишних пробелов
    content = content.replace(/\s+/g, ' ').trim()

    return NextResponse.json({
      date: date || 'Не найдена',
      title: title || 'Не найден',
      content: content || 'Не найден'
    })

  } catch (error) {
    console.error('Ошибка парсинга:', error)
    return NextResponse.json(
      { error: `Ошибка при парсинге: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}` },
      { status: 500 }
    )
  }
}

