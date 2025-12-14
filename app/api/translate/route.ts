import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Текст обязателен' },
        { status: 400 }
      )
    }

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

    // Подготавливаем данные для запроса
    const requestBody = {
      model: 'deepseek/deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You are a professional translator. Translate the following text from English to Russian, preserving the structure and style of the original text.'
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.3,
      max_tokens: 8000
    }

    // Запрос к OpenRouter AI для перевода
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Referent - Translator'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      let errorData = ''
      try {
        errorData = await response.text()
      } catch (e) {
        errorData = 'Не удалось прочитать ответ'
      }
      console.error('Ошибка OpenRouter API:', errorData)
      
      let errorMessage = `Ошибка при обращении к API перевода: ${response.status} ${response.statusText}`
      try {
        const errorJson = JSON.parse(errorData)
        errorMessage = errorJson.error?.message || errorMessage
      } catch {
        // Если не JSON, используем текст как есть
      }
      
      return NextResponse.json(
        { error: errorMessage },
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

    const translatedText = data.choices[0].message.content

    return NextResponse.json(
      {
        translation: translatedText
      },
      {
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        }
      }
    )

  } catch (error) {
    console.error('Ошибка перевода:', error)
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
        error: `Ошибка при переводе: ${errorMessage}` 
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
