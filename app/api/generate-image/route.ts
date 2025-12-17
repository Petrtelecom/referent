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

    // Проверка API ключа для генерации промпта
    const translationApiKey = process.env.TRANSLATION_API_KEY
    if (!translationApiKey) {
      console.error('TRANSLATION_API_KEY не найден в переменных окружения')
      return NextResponse.json(
        { 
          error: 'TRANSLATION_API_KEY не настроен',
          details: 'Убедитесь, что переменная TRANSLATION_API_KEY задана в .env.local'
        },
        { status: 500 }
      )
    }

    // Получаем конфигурацию провайдера и модели из переменных окружения
    const imageProviderUrl = process.env.IMAGE_PROVIDER_URL
    const imageModel = process.env.IMAGE_MODEL
    
    if (!imageProviderUrl) {
      console.error('IMAGE_PROVIDER_URL не найден в переменных окружения')
      return NextResponse.json(
        { 
          error: 'IMAGE_PROVIDER_URL не настроен',
          details: 'Убедитесь, что переменная IMAGE_PROVIDER_URL задана в .env.local'
        },
        { status: 500 }
      )
    }
    
    if (!imageModel) {
      console.error('IMAGE_MODEL не найден в переменных окружения')
      return NextResponse.json(
        { 
          error: 'IMAGE_MODEL не настроен',
          details: 'Убедитесь, что переменная IMAGE_MODEL задана в .env.local'
        },
        { status: 500 }
      )
    }

    // Проверка API ключа для генерации изображений
    const imageApiKey = process.env.IMAGE_API_KEY || process.env.GEMINI_API_KEY
    if (!imageApiKey) {
      console.error('IMAGE_API_KEY не найден в переменных окружения')
      return NextResponse.json(
        { 
          error: 'IMAGE_API_KEY не настроен',
          details: 'Убедитесь, что переменная IMAGE_API_KEY задана в .env.local'
        },
        { status: 500 }
      )
    }
    
    // Получаем конфигурацию для генерации промпта (используем те же переменные, что и для переводов)
    const translationProviderUrl = process.env.TRANSLATION_PROVIDER_URL || 'https://openrouter.ai/api/v1/chat/completions'
    const translationModel = process.env.TRANSLATION_MODEL || 'deepseek/deepseek-chat'
    
    // Определяем, используется ли Gemini через ProxyAPI
    // ProxyAPI использует /google для Gemini API
    const isGemini = imageProviderUrl.includes('gemini') || 
                     imageProviderUrl.includes('proxyapi.ru/google') ||
                     imageProviderUrl.includes('proxyapi.ru/gemini')
    
    // Конфигурация для Gemini (если используется)
    const aspectRatio = process.env.GEMINI_ASPECT_RATIO || '16:9'
    const imageSize = process.env.GEMINI_IMAGE_SIZE || '2K'
    
    console.log(`Начало генерации изображения через провайдер: ${imageProviderUrl}, модель: ${imageModel}`)

    // Шаг 1: Создание промпта через ProxyAPI (OpenRouter)
    const articleText = `Заголовок: ${title}\n\nДата: ${date || 'Не указана'}\n\nСодержание:\n${contentToProcess}`

    const promptGenerationSystemPrompt = 'You are an expert at creating detailed, vivid prompts for image generation. Your task is to create a concise, descriptive prompt in English (max 200 words) that captures the main themes, mood, and visual elements of an article for image generation. IMPORTANT: The prompt must specify that any text visible in the generated image should be in Russian language, except for proper names, brand names, and technical terms that are typically written in English. Return ONLY the prompt text without any explanations, comments, or additional text.'

    const promptGenerationPrompt = `Based on the following article, create a detailed visual prompt for image generation. The prompt should be in English, descriptive, and capture the main themes and visual elements of the article. IMPORTANT: Include in the prompt that any text visible in the image must be in Russian language, except for proper names, brand names, and technical terms. Return only the prompt text, no explanations:\n\n${articleText}`

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
        'Authorization': `Bearer ${translationApiKey}`,
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
      console.error('Ошибка при создании промпта:', {
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
        { error: 'Неверный формат ответа от API при создании промпта' },
        { status: 500 }
      )
    }

    const imagePrompt = openRouterData.choices[0].message.content.trim()
    const promptGenerationTime = Date.now() - promptGenerationStartTime
    console.log(`Промпт для генерации создан (время: ${promptGenerationTime}ms, первые 100 символов): ${imagePrompt.substring(0, 100)}...`)

    // Шаг 2: Генерация изображения через настроенный провайдер
    const imageGenerationStartTime = Date.now()
    // Если используется Gemini через ProxyAPI
    if (isGemini) {
      // Используем только прямой HTTP запрос, так как SDK не поддерживает ProxyAPI baseURL корректно
      try {
        // Прямой HTTP запрос к ProxyAPI endpoint для Gemini
        // ProxyAPI использует формат: https://api.proxyapi.ru/google/v1beta/models/{model}:generateContent
        let proxyApiUrl: string
        if (imageProviderUrl.includes('/google')) {
          proxyApiUrl = `${imageProviderUrl}/v1beta/models/${imageModel}:generateContent`
        } else if (imageProviderUrl.includes('/gemini')) {
          proxyApiUrl = `${imageProviderUrl}/models/${imageModel}:generateContent`
        } else {
          // Пробуем стандартный формат
          proxyApiUrl = `${imageProviderUrl}/v1beta/models/${imageModel}:generateContent`
        }
        
        // Модели, которые не поддерживают imageConfig параметры
        const modelsWithoutImageConfig = [
          'gemini-2.5-flash-image',
          'gemini-2.0-flash-image',
          'gemini-1.5-flash-image'
        ]
        
        const supportsImageConfig = !modelsWithoutImageConfig.includes(imageModel)
        
        console.log(`Использование модели Gemini: ${imageModel}`)
        console.log(`ProxyAPI endpoint: ${imageProviderUrl}`)
        console.log(`Прямой HTTP запрос к: ${proxyApiUrl}`)
        if (supportsImageConfig) {
          console.log(`Параметры: aspectRatio=${aspectRatio}, imageSize=${imageSize}`)
        } else {
          console.log(`Модель не поддерживает imageConfig параметры, используются настройки по умолчанию`)
        }
        
        // Добавляем инструкцию о русском языке для текста на изображении
        const imagePromptWithLanguage = `${imagePrompt}\n\nIMPORTANT: Any text visible in the generated image must be in Russian language, except for proper names, brand names, and technical terms that are typically written in English or Latin script.`
        
        // Формируем тело запроса в зависимости от поддержки imageConfig
        let requestBody: any = {
          contents: [{
            parts: [{
              text: imagePromptWithLanguage
            }]
          }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE']
          }
        }
        
        // Добавляем imageConfig только если модель поддерживает
        if (supportsImageConfig) {
          requestBody.generationConfig.imageConfig = {
            aspectRatio: aspectRatio,
            imageSize: imageSize
          }
        }
        
        let response = await fetch(proxyApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${imageApiKey}`
          },
          body: JSON.stringify(requestBody)
        })
        
        // Если ошибка 400 и модель должна поддерживать imageConfig, пробуем без него
        if (!response.ok && response.status === 400 && supportsImageConfig) {
          const errorTextFirst = await response.text().catch(() => '')
          let shouldRetry = false
          
          try {
            const errorJson = JSON.parse(errorTextFirst)
            // Если ошибка связана с неверными аргументами, пробуем без imageConfig
            if (errorJson.error?.status === 'INVALID_ARGUMENT' || 
                errorJson.error?.message?.includes('invalid argument') ||
                errorTextFirst.includes('INVALID_ARGUMENT')) {
              shouldRetry = true
            }
          } catch {
            // Если не удалось распарсить, все равно пробуем
            shouldRetry = true
          }
          
          if (shouldRetry) {
            console.log('Попытка без imageConfig параметров (модель может не поддерживать эти параметры)...')
            requestBody = {
              contents: [{
                parts: [{
                  text: imagePromptWithLanguage
                }]
              }],
              generationConfig: {
                responseModalities: ['TEXT', 'IMAGE']
              }
            }
            
            response = await fetch(proxyApiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${imageApiKey}`
              },
              body: JSON.stringify(requestBody)
            })
          }
        }

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Не удалось прочитать ответ')
          let errorMessage = `HTTP ${response.status}: ${errorText}`
          
          // Улучшенная обработка ошибок
          try {
            const errorJson = JSON.parse(errorText)
            if (errorJson.detail) {
              errorMessage = errorJson.detail
            }
            
            // Специальная обработка для недостаточного баланса
            if (response.status === 402 || errorMessage.includes('Insufficient balance')) {
              return NextResponse.json(
                { 
                  error: 'Недостаточно средств на счету ProxyAPI',
                  details: 'Пополните баланс на https://proxyapi.ru для продолжения работы'
                },
                { status: 402 }
              )
            }
            
            // Специальная обработка для невалидного ключа
            if (response.status === 401 || response.status === 403 || errorMessage.includes('API key')) {
              return NextResponse.json(
                { 
                  error: 'Неверный API ключ ProxyAPI',
                  details: 'Проверьте правильность IMAGE_API_KEY в .env.local'
                },
                { status: response.status }
              )
            }
            
            // Специальная обработка для неверных параметров (только если это уже вторая попытка)
            if (response.status === 400 && (errorMessage.includes('INVALID_ARGUMENT') || errorMessage.includes('invalid argument'))) {
              return NextResponse.json(
                { 
                  error: 'Неверные параметры запроса к Gemini API',
                  details: `Модель ${imageModel} может не поддерживать генерацию изображений или требует других параметров. Проверьте документацию ProxyAPI для модели ${imageModel}.`
                },
                { status: 400 }
              )
            }
          } catch {
            // Если не JSON, используем текст как есть
          }
          
          throw new Error(errorMessage)
        }

        const data = await response.json()
        
        // Извлечение изображения из ответа (формат может отличаться)
        const imagePart = data.candidates?.[0]?.content?.parts?.find((part: any) => part.inlineData)
        const base64Image = imagePart?.inlineData?.data

        if (!base64Image) {
          console.error('Изображение не найдено в ответе Gemini')
          return NextResponse.json(
            { 
              error: 'Не удалось получить изображение от Gemini',
              details: 'Ответ от API не содержит изображения. Попробуйте еще раз.'
            },
            { status: 500 }
          )
        }

        const mimeType = imagePart?.inlineData?.mimeType || 'image/png'
        const dataUrl = `data:${mimeType};base64,${base64Image}`

        // Получаем текстовую часть ответа (если есть)
        const textPart = data.candidates?.[0]?.content?.parts?.find((part: any) => part.text)
        const textResponse = textPart?.text || ''

        const imageGenerationTime = Date.now() - imageGenerationStartTime
        console.log(`Успешно сгенерировано изображение через ProxyAPI для Gemini (время: ${imageGenerationTime}ms)`)

        return NextResponse.json(
          {
            image: dataUrl,
            prompt: imagePrompt,
            text: textResponse || undefined
          },
          {
            headers: {
              'Content-Type': 'application/json; charset=utf-8'
            }
          }
        )

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
        console.error('Ошибка при генерации изображения через Gemini (ProxyAPI):', {
          message: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString()
        })
        
        return NextResponse.json(
          { 
            error: 'Ошибка при генерации изображения через Gemini',
            details: errorMessage
          },
          { status: 500 }
        )
      }
    } else {
      // Если используется другой провайдер (не Gemini), используем прямой HTTP запрос
      console.log(`Использование провайдера: ${imageProviderUrl}, модель: ${imageModel}`)
      
      try {
        // Формируем URL для запроса к провайдеру
        const apiUrl = imageProviderUrl.endsWith('/') 
          ? `${imageProviderUrl}${imageModel}`
          : `${imageProviderUrl}/${imageModel}`
        
        const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${imageApiKey}`,
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
          errorMessage = `Ошибка авторизации (${response.status}). Проверьте правильность API ключа.`
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
        
        let generatedImage: Blob | null = null
      
      if (contentType.includes('application/json')) {
        // Если ответ JSON, возможно изображение в base64
        const jsonData = await response.json()
        if (jsonData.data && jsonData.data[0] && jsonData.data[0].b64_json) {
          // Изображение в base64 формате
          const base64Image = jsonData.data[0].b64_json
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
      
    if (!generatedImage) {
      console.error('Не удалось получить изображение от модели')
      return NextResponse.json(
        { 
          error: 'Не удалось сгенерировать изображение',
              details: 'Попробуйте позже или проверьте настройки API ключа.'
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

        console.log(`Успешно использована модель: ${imageModel}`)

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
    }

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
