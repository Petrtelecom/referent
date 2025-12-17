import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.TRANSLATION_API_KEY
    
    if (!apiKey) {
      return NextResponse.json(
        { 
          valid: false,
          error: 'TRANSLATION_API_KEY не найден в переменных окружения',
          message: 'Убедитесь, что переменная TRANSLATION_API_KEY задана в .env.local'
        },
        { status: 200 }
      )
    }

    // Получаем конфигурацию из переменных окружения
    const translationProviderUrl = process.env.TRANSLATION_PROVIDER_URL || 'https://openrouter.ai/api/v1/chat/completions'
    const translationModel = process.env.TRANSLATION_MODEL || 'deepseek/deepseek-chat'

    // Делаем тестовый запрос к OpenRouter API для проверки ключа
    const response = await fetch(translationProviderUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Referent - Проверка API ключа'
      },
      body: JSON.stringify({
        model: translationModel,
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

    const translationModel = process.env.TRANSLATION_MODEL || 'deepseek/deepseek-chat'
    
    return NextResponse.json({
      valid: true,
      message: 'API ключ валиден и работает',
      model: data.model || translationModel,
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







