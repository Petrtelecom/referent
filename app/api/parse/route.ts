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

    let html: string
    try {
      html = await response.text()
    } catch (error) {
      console.error('Ошибка при чтении HTML:', error)
      throw new Error('Не удалось прочитать содержимое страницы')
    }

    if (!html || html.length === 0) {
      throw new Error('Страница вернула пустой контент')
    }

    let $
    try {
      $ = load(html)
    } catch (error) {
      console.error('Ошибка при парсинге HTML:', error)
      throw new Error('Не удалось распарсить HTML страницы')
    }

    // Удаляем все скрипты и стили глобально перед парсингом
    $('script, style, noscript').remove()

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
      '[role="article"]',
      // Дополнительные селекторы для различных сайтов
      '.text',
      '.article-text',
      '.main-content',
      '#content',
      '#article-content',
      '.article-body',
      '.post-body'
    ]
    
    for (const selector of contentSelectors) {
      const element = $(selector).first()
      if (element.length) {
        // Удаляем ненужные элементы (скрипты, стили, реклама, код)
        const clone = element.clone()
        clone.find('script, style, nav, aside, .advertisement, .ads, .sidebar, code, pre, .code, .highlight').remove()
        // Удаляем элементы с классами, указывающими на код
        clone.find('[class*="code"], [class*="syntax"], [class*="highlight"]').remove()
        content = clone.text().trim()
        if (content && content.length > 100) break // Минимум 100 символов для валидного контента
      }
    }

    // Если не нашли через селекторы, берем body без header/footer/nav
    if (!content || content.length < 100) {
      try {
        const bodyClone = $('body').clone()
        bodyClone.find('header, footer, nav, aside, script, style, code, pre').remove()
        const bodyText = bodyClone.text().trim()
        if (bodyText && bodyText.length > content.length) {
          content = bodyText
        }
      } catch (error) {
        console.error('Ошибка при извлечении контента из body:', error)
        // Продолжаем с тем, что есть
      }
    }

    // Проверяем, что контент был извлечен
    if (!content || content.trim().length < 50) {
      // Пробуем альтернативный метод - извлечение из всех параграфов
      try {
        const paragraphs = $('p').map((_, el) => $(el).text().trim()).get()
        const paragraphText = paragraphs.filter(p => p.length > 20).join(' ')
        if (paragraphText && paragraphText.length > content.length) {
          content = paragraphText
        }
      } catch (error) {
        console.error('Ошибка при извлечении контента из параграфов:', error)
      }
    }

    // Очищаем контент от лишних пробелов
    content = content.replace(/\s+/g, ' ').trim()
    
    // Удаляем явные фрагменты кода, которые могли попасть в текст
    // (строки, которые выглядят как JavaScript/код)
    try {
      const lines = content.split(/[.!?]\s+/).filter(line => {
        const trimmedLine = line.trim()
        if (!trimmedLine || trimmedLine.length < 10) return true // Оставляем короткие строки
        
        // Пропускаем строки, которые явно являются кодом
        const codeIndicators = [
          /^\w+\.\w+\s*=\s*\w+/,  // window.xxx = yyy
          /^function\s*\(/,        // function(
          /^(const|let|var)\s+\w+\s*=/,  // const/let/var xxx =
          /^if\s*\(/,              // if(
          /^return\s+/,           // return
          /^console\./,           // console.
          /^document\./,          // document.
          /\.addEventListener\(/, // .addEventListener(
          /^[{}();=,\[\]]+$/,     // Только технические символы
        ]
        
        return !codeIndicators.some(pattern => pattern.test(trimmedLine))
      })
      
      content = lines.join('. ').trim()
    } catch (error) {
      console.error('Ошибка при фильтрации кода:', error)
      // Продолжаем с исходным контентом, если фильтрация не удалась
    }

    // Определение языка текста
    // Простая эвристика: проверяем наличие кириллических символов
    const detectLanguage = (text: string): 'ru' | 'en' | 'unknown' => {
      if (!text || text.length < 10) return 'unknown'
      
      // Регулярное выражение для кириллических символов
      const cyrillicPattern = /[А-Яа-яЁё]/
      const cyrillicMatches = text.match(/[А-Яа-яЁё]/g) || []
      const totalLetters = text.match(/[А-Яа-яЁёA-Za-z]/g) || []
      
      // Если есть кириллические символы и их доля больше 30% от всех букв
      if (cyrillicMatches.length > 0 && totalLetters.length > 0) {
        const cyrillicRatio = cyrillicMatches.length / totalLetters.length
        if (cyrillicRatio > 0.3) {
          return 'ru'
        }
      }
      
      // Если нет кириллических символов, но есть латинские - вероятно английский
      const latinMatches = text.match(/[A-Za-z]/g) || []
      if (latinMatches.length > 0 && cyrillicMatches.length === 0) {
        return 'en'
      }
      
      return 'unknown'
    }

    const language = detectLanguage(content)

    return NextResponse.json({
      date: date || 'Не найдена',
      title: title || 'Не найден',
      content: content || 'Не найден',
      language: language
    })

  } catch (error) {
    console.error('Ошибка парсинга:', {
      message: error instanceof Error ? error.message : 'Неизвестная ошибка',
      stack: error instanceof Error ? error.stack : undefined,
      url: url,
      timestamp: new Date().toISOString()
    })
    
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
    
    // Более информативные сообщения об ошибках
    let userFriendlyMessage = `Ошибка при парсинге: ${errorMessage}`
    
    if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
      userFriendlyMessage = 'Превышено время ожидания ответа от сервера. Попробуйте позже или проверьте доступность сайта.'
    } else if (errorMessage.includes('fetch failed') || errorMessage.includes('network')) {
      userFriendlyMessage = 'Ошибка сети при загрузке страницы. Проверьте подключение к интернету и доступность сайта.'
    } else if (errorMessage.includes('JSON') || errorMessage.includes('parse')) {
      userFriendlyMessage = 'Ошибка при обработке данных страницы. Возможно, сайт вернул неожиданный формат данных.'
    }
    
    return NextResponse.json(
      { 
        error: userFriendlyMessage,
        details: errorMessage !== userFriendlyMessage ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}

