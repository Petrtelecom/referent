import { NextRequest, NextResponse } from 'next/server'

interface ArticleData {
  title: string
  content: string
  date: string
  url?: string
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

    const { articleData } = requestBody

    // Валидация articleData
    if (!articleData || typeof articleData !== 'object') {
      return NextResponse.json(
        { error: 'Данные статьи (articleData) обязательны' },
        { status: 400 }
      )
    }

    const { title, content, date } = articleData as ArticleData

    // Валидация заголовка
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Заголовок статьи обязателен и должен быть строкой' },
        { status: 400 }
      )
    }

    // Валидация контента
    if (!content || typeof content !== 'string' || !content.trim() || content.trim().length < 50) {
      return NextResponse.json(
        { error: 'Содержимое статьи слишком короткое (минимум 50 символов)' },
        { status: 400 }
      )
    }

    // Ограничение длины контента для AI-обработки
    const MAX_CONTENT_LENGTH = 200000
    let contentToProcess = content
    if (content.length > MAX_CONTENT_LENGTH) {
      contentToProcess = content.substring(0, MAX_CONTENT_LENGTH)
      const lastSentenceEnd = contentToProcess.lastIndexOf('. ')
      if (lastSentenceEnd > MAX_CONTENT_LENGTH * 0.9) {
        contentToProcess = contentToProcess.substring(0, lastSentenceEnd + 1)
      }
    }

    // Проверка API ключа OpenRouter
    const openRouterApiKey = process.env.OPENROUTER_API_KEY
    if (!openRouterApiKey) {
      console.error('OPENROUTER_API_KEY не найден в переменных окружения')
      return NextResponse.json(
        { 
          error: 'OPENROUTER_API_KEY не настроен',
          details: 'Убедитесь, что переменная OPENROUTER_API_KEY задана в .env.local'
        },
        { status: 500 }
      )
    }

    // Проверка API ключа Hugging Face
    const huggingFaceApiKey = process.env.HUGGING_FACE_API_KEY
    if (!huggingFaceApiKey) {
      console.error('HUGGING_FACE_API_KEY не найден в переменных окружения')
      return NextResponse.json(
        { 
          error: 'HUGGING_FACE_API_KEY не настроен',
          details: 'Убедитесь, что переменная HUGGING_FACE_API_KEY задана в .env.local. Получить ключ можно на https://huggingface.co/settings/tokens'
        },
        { status: 500 }
      )
    }

    // Проверка конфигурации генерации изображений
    const imageProviderUrl = process.env.IMAGE_GENERATION_PROVIDER_URL || 'https://router.huggingface.co/hf-inference/models/'
    const imageModel = process.env.IMAGE_GENERATION_MODEL || 'stabilityai/stable-diffusion-xl-base-1.0'
    
    if (!imageModel) {
      console.error('IMAGE_GENERATION_MODEL не найден в переменных окружения')
      return NextResponse.json(
        { 
          error: 'IMAGE_GENERATION_MODEL не настроен',
          details: 'Убедитесь, что переменная IMAGE_GENERATION_MODEL задана в .env.local'
        },
        { status: 500 }
      )
    }
    
    // Получаем конфигурацию для генерации промпта (используем те же переменные, что и для переводов)
    const translationProviderUrl = process.env.TRANSLATION_PROVIDER_URL || 'https://openrouter.ai/api/v1/chat/completions'
    const translationModel = process.env.TRANSLATION_MODEL || 'deepseek/deepseek-chat'
    
    // Логируем начало попытки генерации (без ключа)
    console.log('Начало генерации изображения. API ключ Hugging Face:', huggingFaceApiKey ? 'найден' : 'не найден')

    // Шаг 1: Создание промпта через OpenRouter
    const articleText = `Заголовок: ${title}\n\nДата: ${date || 'Не указана'}\n\nСодержание:\n${contentToProcess}`

    const promptGenerationSystemPrompt = 'You are an expert at creating detailed, vivid prompts for image generation. Your task is to create a concise, descriptive prompt in English (max 200 words) that captures the main themes, mood, and visual elements of an article for image generation. Return ONLY the prompt text without any explanations, comments, or additional text.'

    const promptGenerationPrompt = `Based on the following article, create a detailed visual prompt for image generation. The prompt should be in English, descriptive, and capture the main themes and visual elements of the article. Return only the prompt text, no explanations:\n\n${articleText}`

    const openRouterRequestBody = {
      model: translationModel,
      messages: [
        {
          role: 'system',
          content: promptGenerationSystemPrompt
        },
        {
          role: 'user',
          content: promptGenerationPrompt
        }
      ],
      temperature: 0.8,
      max_tokens: 300
    }

    const openRouterResponse = await fetch(translationProviderUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Bearer ${openRouterApiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Referent - Image Prompt Generator'
      },
      body: JSON.stringify(openRouterRequestBody)
    })

    if (!openRouterResponse.ok) {
      let errorData = ''
      try {
        errorData = await openRouterResponse.text()
      } catch (e) {
        errorData = 'Не удалось прочитать ответ'
      }
      console.error('Ошибка OpenRouter API:', {
        status: openRouterResponse.status,
        statusText: openRouterResponse.statusText,
        errorData: errorData.substring(0, 500)
      })

      let errorMessage = `Ошибка при создании промпта: ${openRouterResponse.status} ${openRouterResponse.statusText}`
      try {
        const errorJson = JSON.parse(errorData)
        const apiErrorMessage = errorJson.error?.message || ''
        if (apiErrorMessage) {
          errorMessage = apiErrorMessage
        }
      } catch {
        // Если не JSON, используем текст как есть
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: openRouterResponse.status }
      )
    }

    const openRouterData = await openRouterResponse.json()
    if (!openRouterData.choices || !openRouterData.choices[0] || !openRouterData.choices[0].message) {
      return NextResponse.json(
        { error: 'Неверный формат ответа от OpenRouter API' },
        { status: 500 }
      )
    }

    const imagePrompt = openRouterData.choices[0].message.content.trim()

    // Шаг 2: Генерация изображения через Hugging Face
    // Используем модель из переменных окружения
    console.log(`Использование модели: ${imageModel}`)
    console.log(`Промпт для генерации (первые 100 символов): ${imagePrompt.substring(0, 100)}...`)
    
    // Формируем URL для запроса к модели
    const imageApiUrl = `${imageProviderUrl}${imageModel}`
    
    let generatedImage: Blob | null = null
    
    try {
      const response = await fetch(imageApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${huggingFaceApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: imagePrompt
        })
      })
      
      console.log(`Ответ от ${imageModel}: статус ${response.status}, ok: ${response.ok}`)
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Не удалось прочитать ответ')
        console.log(`Ошибка от ${imageModel} (${response.status}): ${errorText.substring(0, 300)}`)
        
        let errorMessage = `Ошибка при генерации изображения: ${response.status} ${response.statusText}`
        
        if (response.status === 401 || response.status === 403) {
          errorMessage = `Ошибка авторизации (${response.status}). Проверьте правильность API ключа Hugging Face.`
        } else {
          try {
            const errorJson = JSON.parse(errorText)
            if (errorJson.error) {
              errorMessage = errorJson.error
            }
          } catch {
            errorMessage = errorText.substring(0, 200) || errorMessage
          }
        }
        
        return NextResponse.json(
          { 
            error: 'Не удалось сгенерировать изображение',
            details: errorMessage
          },
          { status: response.status }
        )
      }
      
      // Получаем ответ - может быть JSON с данными изображения или blob
      const contentType = response.headers.get('content-type') || ''
      
      if (contentType.includes('application/json')) {
        // Если ответ JSON, возможно изображение в base64
        const jsonData = await response.json()
        if (jsonData.data && jsonData.data[0] && jsonData.data[0].b64_json) {
          // Изображение в base64 формате
          const base64Image = jsonData.data[0].b64_json
          const dataUrl = `data:image/png;base64,${base64Image}`
          // Создаем blob из base64 для единообразия
          const binaryString = Buffer.from(base64Image, 'base64').toString('binary')
          const bytes = new Uint8Array(binaryString.length)
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }
          generatedImage = new Blob([bytes], { type: 'image/png' })
        } else if (jsonData.url) {
          // Если есть URL изображения, загружаем его
          const imageResponse = await fetch(jsonData.url)
          generatedImage = await imageResponse.blob()
        } else {
          throw new Error('Неожиданный формат ответа от API')
        }
      } else {
        // Прямой blob ответ
        generatedImage = await response.blob()
      }
      
      console.log(`Успешно использована модель: ${imageModel}`)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
      console.error(`Ошибка при использовании модели ${imageModel}:`, errorMessage)
      
      return NextResponse.json(
        { 
          error: 'Ошибка при генерации изображения',
          details: errorMessage
        },
        { status: 500 }
      )
    }
    
    // Если не удалось сгенерировать изображение
    if (!generatedImage) {
      console.error('Не удалось получить изображение от модели')
      return NextResponse.json(
        { 
          error: 'Не удалось сгенерировать изображение',
          details: 'Попробуйте позже или проверьте настройки API ключа Hugging Face. Возможно, требуется настроить Inference Providers в настройках Hugging Face.'
        },
        { status: 503 }
      )
    }

    // Конвертируем blob в base64
    const arrayBuffer = await generatedImage.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64Image = buffer.toString('base64')
    const mimeType = generatedImage.type || 'image/png'
    const dataUrl = `data:${mimeType};base64,${base64Image}`

    return NextResponse.json(
      {
        image: dataUrl,
        prompt: imagePrompt
      },
      {
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        }
      }
    )

  } catch (error) {
    console.error('Ошибка генерации изображения:', {
      message: error instanceof Error ? error.message : 'Неизвестная ошибка',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    })
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
    
    return NextResponse.json(
      { 
        error: `Ошибка при генерации изображения: ${errorMessage}` 
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

