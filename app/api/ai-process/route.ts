import { NextRequest, NextResponse } from 'next/server'

type ActionType = 'summary' | 'theses' | 'telegram-post'

interface ArticleData {
  title: string
  content: string
  date: string
}

function getPromptForAction(action: ActionType, articleData: ArticleData): string {
  const { title, content, date } = articleData
  
  const articleText = `Заголовок: ${title}\n\nДата: ${date}\n\nСодержание:\n${content}`
  
  switch (action) {
    case 'summary':
      return `Проанализируй следующую статью и напиши краткое описание её содержания на русском языке (2-3 абзаца). Опиши основные темы, идеи и выводы.

${articleText}`
    
    case 'theses':
      return `Проанализируй следующую статью и создай структурированные тезисы на русском языке. Используй формат списка с основными пунктами и подпунктами. Каждый тезис должен быть кратким и информативным.

${articleText}`
    
    case 'telegram-post':
      return `Проанализируй следующую статью и создай пост для Telegram на русском языке. Пост должен быть информативным, привлекательным, с эмодзи и хештегами. Формат: заголовок, краткое содержание, ключевые моменты, призыв к действию. Длина поста должна быть оптимальной для Telegram (не слишком длинной).

${articleText}`
    
    default:
      throw new Error(`Неизвестный тип действия: ${action}`)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Парсинг и валидация JSON запроса
    let requestBody
    try {
      requestBody = await request.json()
    } catch (error) {
      console.error('Ошибка парсинга JSON запроса:', error)
      return NextResponse.json(
        { error: 'Неверный формат запроса. Ожидается JSON.' },
        { status: 400 }
      )
    }

    const { action, articleData } = requestBody

    // Валидация action
    if (!action || typeof action !== 'string') {
      return NextResponse.json(
        { error: 'Тип действия (action) обязателен и должен быть строкой' },
        { status: 400 }
      )
    }

    const validActions: ActionType[] = ['summary', 'theses', 'telegram-post']
    if (!validActions.includes(action as ActionType)) {
      return NextResponse.json(
        { 
          error: 'Неверный тип действия',
          details: `Допустимые значения: ${validActions.join(', ')}`
        },
        { status: 400 }
      )
    }

    // Валидация articleData
    if (!articleData || typeof articleData !== 'object') {
      return NextResponse.json(
        { error: 'Данные статьи (articleData) обязательны' },
        { status: 400 }
      )
    }

    const { title, content, date } = articleData as ArticleData

    // Валидация заголовка
    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { error: 'Заголовок статьи обязателен и должен быть строкой' },
        { status: 400 }
      )
    }

    if (title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Заголовок статьи не может быть пустым' },
        { status: 400 }
      )
    }

    if (title.length > 1000) {
      return NextResponse.json(
        { error: 'Заголовок статьи слишком длинный (максимум 1000 символов)' },
        { status: 400 }
      )
    }

    // Валидация контента
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Содержание статьи обязательно и должно быть строкой' },
        { status: 400 }
      )
    }

    if (!content.trim() || content.trim().length < 50) {
      return NextResponse.json(
        { error: 'Содержание статьи слишком короткое (минимум 50 символов)' },
        { status: 400 }
      )
    }

    // Валидация даты (опционально, но если есть - должна быть строкой)
    if (date !== undefined && date !== null && typeof date !== 'string') {
      return NextResponse.json(
        { error: 'Дата статьи должна быть строкой или не указана' },
        { status: 400 }
      )
    }

    // Ограничение длины контента для AI-обработки
    // Для summary/theses/telegram-post можно использовать больше текста, но все равно ограничим
    const MAX_CONTENT_LENGTH = 200000 // ~50000 токенов
    let contentToProcess = content
    let wasTruncated = false

    if (content.length > MAX_CONTENT_LENGTH) {
      contentToProcess = content.substring(0, MAX_CONTENT_LENGTH)
      wasTruncated = true
      // Пытаемся обрезать по предложению
      const lastSentenceEnd = contentToProcess.lastIndexOf('. ')
      if (lastSentenceEnd > MAX_CONTENT_LENGTH * 0.9) {
        contentToProcess = contentToProcess.substring(0, lastSentenceEnd + 1)
      }
    }

    // Проверка API ключа
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      console.error('OPENROUTER_API_KEY не найден в переменных окружения')
      return NextResponse.json(
        { 
          error: 'OPENROUTER_API_KEY не настроен',
          details: 'Убедитесь, что переменная OPENROUTER_API_KEY задана в .env.local (локально) или в настройках проекта на Vercel (для продакшена). После добавления переменной перезапустите сервер.'
        },
        { status: 500 }
      )
    }

    // Получаем промпт для выбранного действия (используем обрезанный контент)
    const userPrompt = getPromptForAction(action as ActionType, { title, content: contentToProcess, date: date || 'Не указана' })

    // Определяем системный промпт в зависимости от действия
    let systemPrompt = ''
    switch (action) {
      case 'summary':
        systemPrompt = 'You are an expert content analyst. Your task is to analyze articles and provide clear, concise summaries in Russian.'
        break
      case 'theses':
        systemPrompt = 'You are an expert content analyst. Your task is to analyze articles and create structured theses in Russian with clear bullet points.'
        break
      case 'telegram-post':
        systemPrompt = 'You are a social media content creator. Your task is to create engaging Telegram posts in Russian with emojis and hashtags.'
        break
    }

    // Подготавливаем данные для запроса к OpenRouter AI
    const apiRequestBody = {
      model: 'deepseek/deepseek-chat',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000
    }

    // Запрос к OpenRouter AI
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Referent - AI Processor'
      },
      body: JSON.stringify(apiRequestBody)
    })

    if (!response.ok) {
      let errorData = ''
      try {
        errorData = await response.text()
      } catch (e) {
        errorData = 'Не удалось прочитать ответ'
      }
      console.error('Ошибка OpenRouter API:', {
        status: response.status,
        statusText: response.statusText,
        errorData: errorData.substring(0, 500) // Ограничиваем длину лога
      })
      
      let errorMessage = `Ошибка при обращении к AI API: ${response.status} ${response.statusText}`
      let userFriendlyMessage = errorMessage
      
      try {
        const errorJson = JSON.parse(errorData)
        const apiErrorMessage = errorJson.error?.message || ''
        errorMessage = apiErrorMessage || errorMessage
        
        // Улучшенные сообщения для распространённых ошибок
        if (apiErrorMessage.includes('User not found') || apiErrorMessage.includes('user not found')) {
          userFriendlyMessage = 'API ключ невалиден или аккаунт не найден. Проверьте правильность ключа на https://openrouter.ai/keys'
        } else if (apiErrorMessage.includes('Insufficient credits') || apiErrorMessage.includes('insufficient')) {
          userFriendlyMessage = 'Недостаточно средств на счёте OpenRouter. Пополните баланс на https://openrouter.ai/credits'
        } else if (apiErrorMessage.includes('Invalid API key') || apiErrorMessage.includes('invalid')) {
          userFriendlyMessage = 'Неверный API ключ. Проверьте правильность ключа в .env.local или настройках Vercel'
        } else if (apiErrorMessage.includes('Rate limit') || apiErrorMessage.includes('rate limit')) {
          userFriendlyMessage = 'Превышен лимит запросов. Попробуйте позже'
        } else if (apiErrorMessage.includes('maximum context length') || apiErrorMessage.includes('context length')) {
          userFriendlyMessage = 'Статья слишком длинная для обработки. Текст был автоматически обрезан. Попробуйте использовать более короткую статью или разделить её на части.'
        } else {
          userFriendlyMessage = apiErrorMessage || errorMessage
        }
      } catch {
        // Если не JSON, используем текст как есть
        userFriendlyMessage = errorData || errorMessage
      }
      
      return NextResponse.json(
        { 
          error: userFriendlyMessage,
          details: errorMessage !== userFriendlyMessage ? errorMessage : undefined
        },
        { 
          status: response.status,
          headers: {
            'Content-Type': 'application/json; charset=utf-8'
          }
        }
      )
    }

    const data = await response.json()

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return NextResponse.json(
        { error: 'Неверный формат ответа от API' },
        { status: 500 }
      )
    }

    const result = data.choices[0].message.content

    // Добавляем предупреждение, если текст был обрезан
    let finalResult = result
    if (wasTruncated) {
      finalResult = `⚠️ Внимание: статья была обрезана из-за большого размера (обработано ${Math.round(contentToProcess.length / 1000)}k из ${Math.round(content.length / 1000)}k символов).\n\n${result}`
    }

    return NextResponse.json(
      {
        result: finalResult,
        truncated: wasTruncated
      },
      {
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        }
      }
    )

  } catch (error) {
    console.error('Ошибка AI-обработки:', {
      message: error instanceof Error ? error.message : 'Неизвестная ошибка',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    })
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
    
    // Обработка ошибки кодировки
    if (errorMessage.includes('ByteString') || errorMessage.includes('greater than 255')) {
      return NextResponse.json(
        { 
          error: 'Ошибка кодировки. Попробуйте еще раз или проверьте текст статьи.',
          details: 'Проблема может быть связана с нестандартными символами в тексте.'
        },
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json; charset=utf-8'
          }
        }
      )
    }
    
    return NextResponse.json(
      { 
        error: `Ошибка при AI-обработке: ${errorMessage}` 
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        }
      }
    )
  }
}

