import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const imageApiKey = process.env.IMAGE_API_KEY
    
    if (!imageApiKey) {
      return NextResponse.json(
        { 
          success: false,
          error: 'IMAGE_API_KEY не найден в переменных окружения',
          message: 'Добавьте IMAGE_API_KEY в .env.local'
        },
        { status: 200 }
      )
    }

    // Простая проверка - запрос к API Hugging Face для получения информации о модели
    const testModel = 'runwayml/stable-diffusion-v1-5'
    // Используем новый endpoint router.huggingface.co
    const testUrl = `https://router.huggingface.co/hf-inference/models/${testModel}`
    
    console.log('Тестирование Hugging Face API с ключом:', imageApiKey.substring(0, 10) + '...')
    
    // Делаем тестовый запрос с простым промптом
    const testResponse = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${imageApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: 'test prompt'
      })
    })

    const responseStatus = testResponse.status
    const responseText = await testResponse.text()
    
    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = { raw: responseText.substring(0, 500) }
    }

    if (testResponse.ok) {
      return NextResponse.json({
        success: true,
        message: 'API ключ работает! Удалось получить ответ от Hugging Face.',
        status: responseStatus,
        model: testModel,
        details: 'Ответ получен успешно (может быть изображение или другой контент)'
      })
    } else {
      // Анализируем ошибку
      let errorMessage = `Ошибка ${responseStatus}`
      let userFriendlyMessage = ''
      
      if (responseStatus === 401 || responseStatus === 403) {
        userFriendlyMessage = 'API ключ недействителен или отсутствуют права доступа. Проверьте правильность ключа на https://huggingface.co/settings/tokens'
      } else if (responseStatus === 410 || responseStatus === 404) {
        userFriendlyMessage = `Модель ${testModel} недоступна. Попробуем другую модель.`
        // Пробуем другую модель
        const altModel = 'stabilityai/stable-diffusion-2-1'
        const altUrl = `https://router.huggingface.co/models/${altModel}`
        const altResponse = await fetch(altUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${imageApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            inputs: 'test prompt'
          })
        })
        
        if (altResponse.ok) {
          return NextResponse.json({
            success: true,
            message: 'API ключ работает! Альтернативная модель доступна.',
            status: altResponse.status,
            model: altModel,
            originalModel: testModel,
            originalStatus: responseStatus
          })
        }
      } else if (responseStatus === 503) {
        userFriendlyMessage = 'Модель загружается. Это нормально при первом запросе. Попробуйте подождать немного.'
        if (responseData.estimated_time) {
          userFriendlyMessage += ` Ожидаемое время загрузки: ${Math.ceil(responseData.estimated_time)} секунд.`
        }
      } else if (responseStatus === 429) {
        userFriendlyMessage = 'Превышен лимит запросов. Подождите немного и попробуйте снова.'
      }
      
      return NextResponse.json({
        success: false,
        error: errorMessage,
        message: userFriendlyMessage || `Получена ошибка от Hugging Face API: ${responseStatus}`,
        status: responseStatus,
        model: testModel,
        response: responseData,
        troubleshooting: {
          '401/403': 'Проверьте правильность API ключа на https://huggingface.co/settings/tokens',
          '410/404': 'Модель может быть недоступна. Это не проблема с ключом.',
          '503': 'Модель загружается, это нормально. Попробуйте еще раз через некоторое время.',
          '429': 'Превышен лимит запросов. Подождите и попробуйте снова.'
        }
      }, { status: 200 })
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
    console.error('Ошибка тестирования Hugging Face API:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Ошибка при тестировании API',
      message: errorMessage,
      details: 'Проверьте подключение к интернету и правильность API ключа'
    }, { status: 200 })
  }
}

