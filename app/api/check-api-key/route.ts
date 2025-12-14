import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY
    
    if (!apiKey) {
      return NextResponse.json(
        { 
          valid: false,
          error: 'OPENROUTER_API_KEY не найден в переменных окружения',
          message: 'Убедитесь, что переменная OPENROUTER_API_KEY задана в .env.local'
        },
        { status: 200 }
      )
    }

    // Делаем тестовый запрос к OpenRouter API для проверки ключа
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Referent - Проверка API ключа'
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat',
        messages: [
          {
            role: 'user',
            content: 'test'
          }
        ],
        max_tokens: 10
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      let errorMessage = 'Неизвестная ошибка'
      
      try {
        const errorJson = JSON.parse(errorData)
        errorMessage = errorJson?.error?.message || errorData || response.statusText
      } catch {
        errorMessage = errorData || response.statusText
      }

      return NextResponse.json({
        valid: false,
        error: `API ключ невалиден или произошла ошибка`,
        details: errorMessage,
        statusCode: response.status,
        message: 'Проверьте правильность API ключа на https://openrouter.ai/keys'
      })
    }

    const data = await response.json()

    return NextResponse.json({
      valid: true,
      message: 'API ключ валиден и работает',
      model: data.model || 'deepseek/deepseek-chat',
      usage: data.usage || null
    })

  } catch (error) {
    return NextResponse.json(
      { 
        valid: false,
        error: `Ошибка при проверке ключа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        message: 'Проверьте подключение к интернету и правильность API ключа'
      },
      { status: 200 }
    )
  }
}
