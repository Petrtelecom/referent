'use client'

import { useState } from 'react'

export default function Home() {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeButton, setActiveButton] = useState<string | null>(null)
  const [parsedSuccessfully, setParsedSuccessfully] = useState(false)
  const [parsedArticle, setParsedArticle] = useState<{ title: string; content: string; date: string; language?: string } | null>(null)
  const [currentActionType, setCurrentActionType] = useState<string | null>(null)

  // Вспомогательная функция для парсинга статьи
  const parseArticle = async (): Promise<{ title: string; content: string; date: string; language?: string } | null> => {
    if (!url.trim()) {
      throw new Error('Пожалуйста, введите URL статьи')
    }

    const response = await fetch('/api/parse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Ошибка при парсинге статьи')
    }

    const data = await response.json()
    setParsedArticle(data)
    setParsedSuccessfully(true)
    return data
  }

  const handleTranslate = async () => {
    if (!url.trim()) {
      alert('Пожалуйста, введите URL статьи')
      return
    }

    // Валидация URL
    try {
      new URL(url.trim())
    } catch {
      alert('Пожалуйста, введите корректный URL')
      return
    }

    setLoading(true)
    setResult('')

    // Проверяем, распарсена ли статья, и получаем актуальные данные
    let articleData = parsedArticle

    if (!articleData || !articleData.content) {
      // Если статья не распарсена, сначала парсим её
      setActiveButton('Парсинг...')
      
      try {
        articleData = await parseArticle()
        if (!articleData) {
          throw new Error('Не удалось распарсить статью')
        }
        
        // Валидация распарсенных данных
        if (!articleData.content || articleData.content.trim().length < 50) {
          throw new Error('Не удалось получить содержимое статьи. Возможно, это PDF файл или страница без текстового контента. Попробуйте использовать HTML-версию статьи.')
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
        setResult(`Ошибка: ${errorMessage}`)
        setLoading(false)
        setActiveButton(null)
        return
      }
    }

    // Валидация данных статьи перед переводом
    if (!articleData.content || articleData.content.trim().length < 50) {
      setResult('Ошибка: Содержимое статьи слишком короткое или отсутствует. Возможно, это PDF файл. Попробуйте использовать HTML-версию статьи.')
      setLoading(false)
      setActiveButton(null)
      return
    }

    // Проверка языка: если русский, возвращаем текст без перевода
    if (articleData.language === 'ru') {
      setResult(articleData.content)
      setLoading(false)
      setActiveButton(null)
      return
    }

    // Выполняем перевод
    setActiveButton('Перевести')

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: articleData.content }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Ошибка при переводе статьи')
      }

      const data = await response.json()
      let translation = data.translation || 'Перевод не получен'
      
      // Добавляем предупреждение, если текст был обрезан
      if (data.truncated) {
        translation = `⚠️ Внимание: статья была обрезана из-за большого размера (обработано ${data.translatedLength ? Math.round(data.translatedLength / 1000) + 'k' : 'часть'} из ${Math.round(data.originalLength / 1000)}k символов). Для полного перевода используйте более короткие статьи или разделите статью на части.\n\n${translation}`
      }
      
      setResult(translation)
    } catch (error) {
      setResult(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
    } finally {
      setLoading(false)
      setActiveButton(null)
    }
  }

  // Маппинг кнопок на типы действий для API
  const getActionType = (buttonText: string): 'summary' | 'theses' | 'telegram-post' | null => {
    switch (buttonText) {
      case 'О чем статья?':
        return 'summary'
      case 'Тезисы':
        return 'theses'
      case 'Пост для Telegram':
        return 'telegram-post'
      default:
        return null
    }
  }

  const handleAction = async (action: string) => {
    if (!url.trim()) {
      alert('Пожалуйста, введите URL статьи')
      return
    }

    // Валидация URL
    try {
      new URL(url.trim())
    } catch {
      alert('Пожалуйста, введите корректный URL')
      return
    }

    // Проверяем, распарсена ли статья, и получаем актуальные данные
    let articleData = parsedArticle

    if (!articleData || !articleData.content) {
      // Если статья не распарсена, сначала парсим её
      setLoading(true)
      setActiveButton('Парсинг...')
      setResult('')

      try {
        articleData = await parseArticle()
        if (!articleData) {
          throw new Error('Не удалось распарсить статью')
        }
        
        // Валидация распарсенных данных
        if (!articleData.content || articleData.content.trim().length < 50) {
          throw new Error('Не удалось получить содержимое статьи. Статья может быть пустой или недоступной.')
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
        setResult(`Ошибка: ${errorMessage}`)
        setLoading(false)
        setActiveButton(null)
        return
      }
    }

    // Валидация данных статьи перед отправкой
    if (!articleData.content || articleData.content.trim().length < 50) {
      setResult('Ошибка: Содержимое статьи слишком короткое или отсутствует')
      setLoading(false)
      setActiveButton(null)
      return
    }

    // Получаем тип действия для API
    const actionType = getActionType(action)
    if (!actionType) {
      setResult(`Ошибка: Неизвестный тип действия "${action}"`)
      setLoading(false)
      setActiveButton(null)
      return
    }

    // Выполняем AI-обработку
    setLoading(true)
    setActiveButton(action)
    setCurrentActionType(actionType)
    setResult('')

    try {
      const response = await fetch('/api/ai-process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: actionType,
          articleData: articleData,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.details || 'Ошибка при AI-обработке')
      }

      const data = await response.json()
      setResult(data.result || 'Результат не получен')
      // Сохраняем тип действия для форматирования результата
    } catch (error) {
      setResult(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
      setCurrentActionType(null) // Сбрасываем только при ошибке
    } finally {
      setLoading(false)
      setActiveButton(null)
      // Не сбрасываем currentActionType здесь, чтобы сохранить его для форматирования результата
    }
  }

  const handleCopyResult = async () => {
    if (!result) return

    try {
      await navigator.clipboard.writeText(result)
      // Временная индикация успешного копирования
      const copyButton = document.getElementById('copy-button')
      if (copyButton) {
        const originalText = copyButton.textContent
        copyButton.textContent = 'Скопировано!'
        copyButton.classList.add('bg-green-500')
        setTimeout(() => {
          copyButton.textContent = originalText
          copyButton.classList.remove('bg-green-500')
        }, 2000)
      }
    } catch (error) {
      alert('Не удалось скопировать в буфер обмена')
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Referent
      </h1>
          <p className="text-lg text-gray-600">
            Референт - переводчик с ИИ-обработкой
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8 mb-6">
          <div className="mb-6">
            <label htmlFor="article-url" className="block text-sm font-medium text-gray-700 mb-2">
              URL англоязычной статьи
            </label>
            <input
              id="article-url"
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                setParsedSuccessfully(false)
                setParsedArticle(null)
                setResult('')
                setCurrentActionType(null)
              }}
              placeholder="https://example.com/article"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={handleTranslate}
              disabled={loading}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeButton === 'Перевести' || activeButton === 'Парсинг...'
                  ? 'bg-indigo-600 text-white shadow-lg scale-105'
                  : loading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-500 text-white hover:bg-indigo-600 hover:shadow-md active:scale-95'
              }`}
            >
              {loading && (activeButton === 'Перевести' || activeButton === 'Парсинг...') ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {activeButton === 'Парсинг...' ? 'Парсинг...' : 'Перевод...'}
                </span>
              ) : (
                'Перевести'
              )}
            </button>

            <button
              onClick={() => handleAction('О чем статья?')}
              disabled={loading}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeButton === 'О чем статья?'
                  ? 'bg-indigo-600 text-white shadow-lg scale-105'
                  : loading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-500 text-white hover:bg-indigo-600 hover:shadow-md active:scale-95'
              }`}
              title={!parsedSuccessfully ? 'Сначала распарсите статью' : ''}
            >
              {loading && activeButton === 'О чем статья?' ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Обработка...
                </span>
              ) : (
                'О чем статья?'
              )}
            </button>

            <button
              onClick={() => handleAction('Тезисы')}
              disabled={loading}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeButton === 'Тезисы'
                  ? 'bg-indigo-600 text-white shadow-lg scale-105'
                  : loading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-500 text-white hover:bg-indigo-600 hover:shadow-md active:scale-95'
              }`}
              title={!parsedSuccessfully ? 'Сначала распарсите статью' : ''}
            >
              {loading && activeButton === 'Тезисы' ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Обработка...
                </span>
              ) : (
                'Тезисы'
              )}
            </button>

            <button
              onClick={() => handleAction('Пост для Telegram')}
              disabled={loading}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeButton === 'Пост для Telegram'
                  ? 'bg-indigo-600 text-white shadow-lg scale-105'
                  : loading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-500 text-white hover:bg-indigo-600 hover:shadow-md active:scale-95'
              }`}
              title={!parsedSuccessfully ? 'Сначала распарсите статью' : ''}
            >
              {loading && activeButton === 'Пост для Telegram' ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Обработка...
                </span>
              ) : (
                'Пост для Telegram'
              )}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-gray-900">
              Результат
            </h2>
            {result && !loading && (
              <button
                id="copy-button"
                onClick={handleCopyResult}
                className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm font-medium flex items-center gap-2"
                title="Копировать результат"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Копировать
              </button>
            )}
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 min-h-[200px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center min-h-[200px]">
                <svg className="animate-spin h-8 w-8 text-indigo-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-600 text-lg">
                  {activeButton === 'Парсинг...' ? 'Парсинг статьи...' : activeButton === 'Перевести' ? 'Перевод статьи...' : 'Генерация ответа...'}
                </p>
                {activeButton && activeButton !== 'Парсинг...' && activeButton !== 'Перевести' && (
                  <p className="text-gray-500 text-sm mt-2">
                    {activeButton}
                  </p>
                )}
              </div>
            ) : result ? (
              <div className="text-gray-700 whitespace-pre-wrap text-sm overflow-auto">
                {currentActionType === 'theses' || currentActionType === 'telegram-post' ? (
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-gray-700">{result}</pre>
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap font-mono text-sm">{result}</pre>
                )}
              </div>
            ) : (
              <p className="text-gray-400 text-center">
                Результат появится здесь после нажатия на одну из кнопок
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
