'use client'

import { useState, useRef, useEffect } from 'react'
import { Alert, AlertDescription } from '@/app/components/ui/alert'
import { 
  AppError, 
  handleParseError, 
  handleTranslateError, 
  handleAIProcessError, 
  handleNetworkError,
  handleValidationError,
  handleError
} from '@/app/utils/error-handler'

export default function Home() {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeButton, setActiveButton] = useState<string | null>(null)
  const [parsedSuccessfully, setParsedSuccessfully] = useState(false)
  const [parsedArticle, setParsedArticle] = useState<{ title: string; content: string; date: string; language?: string } | null>(null)
  const [currentActionType, setCurrentActionType] = useState<string | null>(null)
  const [error, setError] = useState<AppError | null>(null)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const resultRef = useRef<HTMLDivElement>(null)
  const shareMenuRef = useRef<HTMLDivElement>(null)

  // Проверка существования и доступности статьи по URL
  const checkArticleExists = async (articleUrl: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/check-article', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: articleUrl }),
      })

      if (!response.ok) {
        return false
      }

      const data = await response.json()
      return data.exists === true
    } catch (error) {
      console.error('Ошибка проверки статьи:', error)
      return false
    }
  }

  // Вспомогательная функция для парсинга статьи
  const parseArticle = async (): Promise<{ title: string; content: string; date: string; language?: string } | null> => {
    if (!url.trim()) {
      throw handleValidationError('Пожалуйста, введите URL статьи')
    }

    let response: Response
    try {
      response = await fetch('/api/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      })
    } catch (fetchError) {
      throw handleNetworkError(fetchError)
    }

    if (!response.ok) {
      let errorData
      try {
        errorData = await response.json()
      } catch {
        errorData = {}
      }
      throw handleParseError(response, errorData)
    }

    const data = await response.json()
    setParsedArticle(data)
    setParsedSuccessfully(true)
    setError(null) // Очищаем ошибки при успешном парсинге
    return data
  }

  const handleTranslate = async () => {
    setError(null)
    
    if (!url.trim()) {
      setError(handleValidationError('Пожалуйста, введите URL статьи'))
      return
    }

    // Валидация URL
    try {
      new URL(url.trim())
    } catch {
      setError(handleValidationError('Пожалуйста, введите корректный URL'))
      return
    }

    setLoading(true)
    setResult('')

    // Проверяем существование статьи перед выполнением действий
    setActiveButton('Проверка...')
    try {
      const articleExists = await checkArticleExists(url.trim())
      if (!articleExists) {
        setError(handleError(new Error('Не удалось загрузить статью по этой ссылке.'), 'parse_error'))
        setLoading(false)
        setActiveButton(null)
        return
      }
    } catch (error) {
      const appError = error instanceof Error && 'type' in error ? error as AppError : handleNetworkError(error)
      setError(appError)
      setLoading(false)
      setActiveButton(null)
      return
    }

    // Проверяем, распарсена ли статья, и получаем актуальные данные
    let articleData = parsedArticle

    if (!articleData || !articleData.content) {
      // Если статья не распарсена, сначала парсим её
      setActiveButton('Парсинг...')
      
      try {
        articleData = await parseArticle()
        if (!articleData) {
          throw handleError(new Error('Не удалось распарсить статью'), 'parse_error')
        }
        
        // Валидация распарсенных данных
        if (!articleData.content || articleData.content.trim().length < 50) {
          throw handleError(new Error('Не удалось получить содержимое статьи. Возможно, это PDF файл или страница без текстового контента. Попробуйте использовать HTML-версию статьи.'), 'parse_error')
        }
      } catch (error) {
        const appError = error instanceof Error && 'type' in error ? error as AppError : handleError(error, 'parse_error')
        setError(appError)
        setLoading(false)
        setActiveButton(null)
        return
      }
    }

    // Валидация данных статьи перед переводом
    if (!articleData.content || articleData.content.trim().length < 50) {
      setError(handleError(new Error('Содержимое статьи слишком короткое или отсутствует. Возможно, это PDF файл. Попробуйте использовать HTML-версию статьи.'), 'validation_error'))
      setLoading(false)
      setActiveButton(null)
      return
    }

    // Проверка языка: если русский, возвращаем текст без перевода
    if (articleData.language === 'ru') {
      setResult(articleData.content)
      setLoading(false)
      setActiveButton(null)
      setError(null)
      return
    }

    // Выполняем перевод
    setActiveButton('Перевести')

    try {
      let response: Response
      try {
        response = await fetch('/api/translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: articleData.content }),
        })
      } catch (fetchError) {
        throw handleNetworkError(fetchError)
      }

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = {}
        }
        throw handleTranslateError(response, errorData)
      }

      const data = await response.json()
      let translation = data.translation || 'Перевод не получен'
      
      // Добавляем предупреждение, если текст был обрезан
      if (data.truncated) {
        translation = `⚠️ Внимание: статья была обрезана из-за большого размера (обработано ${data.translatedLength ? Math.round(data.translatedLength / 1000) + 'k' : 'часть'} из ${Math.round(data.originalLength / 1000)}k символов). Для полного перевода используйте более короткие статьи или разделите статью на части.\n\n${translation}`
      }
      
      setResult(translation)
      setError(null)
    } catch (error) {
      const appError = error instanceof Error && 'type' in error ? error as AppError : handleError(error, 'translate_error')
      setError(appError)
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
    setError(null)
    
    if (!url.trim()) {
      setError(handleValidationError('Пожалуйста, введите URL статьи'))
      return
    }

    // Валидация URL
    try {
      new URL(url.trim())
    } catch {
      setError(handleValidationError('Пожалуйста, введите корректный URL'))
      return
    }

    setLoading(true)
    setResult('')

    // Проверяем существование статьи перед выполнением действий
    setActiveButton('Проверка...')
    try {
      const articleExists = await checkArticleExists(url.trim())
      if (!articleExists) {
        setError(handleError(new Error('Не удалось загрузить статью по этой ссылке.'), 'parse_error'))
        setLoading(false)
        setActiveButton(null)
        return
      }
    } catch (error) {
      const appError = error instanceof Error && 'type' in error ? error as AppError : handleNetworkError(error)
      setError(appError)
      setLoading(false)
      setActiveButton(null)
      return
    }

    // Проверяем, распарсена ли статья, и получаем актуальные данные
    let articleData = parsedArticle

    if (!articleData || !articleData.content) {
      // Если статья не распарсена, сначала парсим её
      setActiveButton('Парсинг...')

      try {
        articleData = await parseArticle()
        if (!articleData) {
          throw handleError(new Error('Не удалось распарсить статью'), 'parse_error')
        }
        
        // Валидация распарсенных данных
        if (!articleData.content || articleData.content.trim().length < 50) {
          throw handleError(new Error('Не удалось получить содержимое статьи. Статья может быть пустой или недоступной.'), 'parse_error')
        }
      } catch (error) {
        const appError = error instanceof Error && 'type' in error ? error as AppError : handleError(error, 'parse_error')
        setError(appError)
        setLoading(false)
        setActiveButton(null)
        return
      }
    }

    // Валидация данных статьи перед отправкой
    if (!articleData.content || articleData.content.trim().length < 50) {
      setError(handleError(new Error('Содержимое статьи слишком короткое или отсутствует'), 'validation_error'))
      setLoading(false)
      setActiveButton(null)
      return
    }

    // Получаем тип действия для API
    const actionType = getActionType(action)
    if (!actionType) {
      setError(handleError(new Error(`Неизвестный тип действия "${action}"`), 'validation_error'))
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
      let response: Response
      try {
        response = await fetch('/api/ai-process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: actionType,
            articleData: {
              ...articleData,
              url: url // Добавляем URL статьи для использования в промпте
            },
          }),
        })
      } catch (fetchError) {
        throw handleNetworkError(fetchError)
      }

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = {}
        }
        throw handleAIProcessError(response, errorData)
      }

      const data = await response.json()
      setResult(data.result || 'Результат не получен')
      setError(null)
      // Сохраняем тип действия для форматирования результата
    } catch (error) {
      const appError = error instanceof Error && 'type' in error ? error as AppError : handleError(error, 'ai_process_error')
      setError(appError)
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

  // Функция очистки всех состояний
  const handleClear = () => {
    setUrl('')
    setResult('')
    setError(null)
    setParsedSuccessfully(false)
    setParsedArticle(null)
    setCurrentActionType(null)
    setActiveButton(null)
    setLoading(false)
  }

  // Функция для отправки в мессенджеры
  const handleShare = (messenger: string) => {
    if (!result) return

    const encodedText = encodeURIComponent(result)
    const encodedTitle = parsedArticle?.title ? encodeURIComponent(parsedArticle.title) : 'Результат'
    
    let shareUrl = ''
    
    switch (messenger) {
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodedText.substring(0, 2000)}`
        break
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodedText.substring(0, 2000)}`
        break
      case 'vk':
        shareUrl = `https://vk.com/share.php?url=${encodeURIComponent(window.location.href)}&title=${encodedTitle}&description=${encodedText.substring(0, 500)}`
        break
      case 'native':
        // Используем Web Share API, если доступен
        if (typeof navigator !== 'undefined' && 'share' in navigator && typeof navigator.share === 'function') {
          navigator.share({
            title: parsedArticle?.title || 'Результат',
            text: result.substring(0, 10000),
            url: window.location.href
          }).catch((error) => {
            console.error('Ошибка при использовании Web Share API:', error)
          })
          setShowShareMenu(false)
          return
        }
        break
      default:
        return
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400')
      setShowShareMenu(false)
    }
  }

  // Закрытие меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setShowShareMenu(false)
      }
    }

    if (showShareMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showShareMenu])

  // Автоматическая прокрутка к результатам после успешной генерации
  useEffect(() => {
    if (result && !loading && resultRef.current) {
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [result, loading])

  const handleSaveResult = async () => {
    if (!result) return

    try {
      // Генерируем имя файла из названия статьи или используем "Referent" с датой и временем
      let fileName: string
      if (parsedArticle?.title && parsedArticle.title.trim()) {
        let titleToUse = parsedArticle.title.trim()
        
        // Переводим название на русский, если статья не на русском языке
        if (parsedArticle.language !== 'ru') {
          try {
            const translateResponse = await fetch('/api/translate', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ text: titleToUse }),
            })

            if (translateResponse.ok) {
              const translateData = await translateResponse.json()
              if (translateData.translation) {
                titleToUse = translateData.translation.trim()
              }
            }
          } catch (error) {
            // Если перевод не удался, используем оригинальное название
            console.error('Ошибка при переводе названия:', error)
          }
        }
        
        // Очищаем название от недопустимых символов для имени файла
        fileName = titleToUse
          .replace(/[<>:"/\\|?*]/g, '') // Удаляем недопустимые символы
          .replace(/\s+/g, ' ') // Заменяем множественные пробелы на один
          .trim()
          .substring(0, 100) // Ограничиваем длину до 100 символов
      } else {
        // Если названия нет, используем "Referent" с датой и временем
        const now = new Date()
        const dateStr = now.toISOString().slice(0, 19).replace(/:/g, '-')
        fileName = `Referent-${dateStr}`
      }

      // Создаем Blob с текстом в формате TXT
      const blob = new Blob([result], { type: 'text/plain;charset=utf-8' })
      
      // Создаем временную ссылку для скачивания
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${fileName}.txt`
      
      // Добавляем ссылку в DOM, кликаем и удаляем
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Освобождаем память
      URL.revokeObjectURL(url)
    } catch (error) {
      alert('Не удалось сохранить файл')
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-6 sm:mb-8 px-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            Referent
          </h1>
          <p className="text-base sm:text-lg text-gray-600">
            Референт - переводчик с ИИ-обработкой
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 lg:p-8 mb-6">
          <div className="mb-6">
            <label htmlFor="article-url" className="block text-sm font-medium text-gray-700 mb-2">
              URL англоязычной статьи
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
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
                  setError(null)
                }}
                placeholder="Введите URL статьи, например: https://example.com/article"
                className="flex-1 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                disabled={loading}
              />
              <button
                onClick={handleClear}
                disabled={loading}
                className="px-3 sm:px-4 py-2 sm:py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap"
                title="Очистить все поля и результаты"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="hidden sm:inline">Очистить</span>
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500 px-1">
              Укажите ссылку на англоязычную статью
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <button
              onClick={handleTranslate}
              disabled={loading}
              title="Перевести статью на русский язык"
              className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium transition-all text-sm sm:text-base ${
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
              className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium transition-all text-sm sm:text-base ${
                activeButton === 'О чем статья?'
                  ? 'bg-indigo-600 text-white shadow-lg scale-105'
                  : loading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-500 text-white hover:bg-indigo-600 hover:shadow-md active:scale-95'
              }`}
              title="Получить краткое описание содержания статьи"
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
              className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium transition-all text-sm sm:text-base ${
                activeButton === 'Тезисы'
                  ? 'bg-indigo-600 text-white shadow-lg scale-105'
                  : loading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-500 text-white hover:bg-indigo-600 hover:shadow-md active:scale-95'
              }`}
              title="Получить структурированные тезисы статьи"
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
              className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium transition-all text-sm sm:text-base ${
                activeButton === 'Пост для Telegram'
                  ? 'bg-indigo-600 text-white shadow-lg scale-105'
                  : loading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-500 text-white hover:bg-indigo-600 hover:shadow-md active:scale-95'
              }`}
              title="Создать пост для публикации в Telegram"
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

        {error && (
          <Alert variant="destructive" className="mb-4 sm:mb-6">
            <AlertDescription className="text-sm break-words px-1">{error.message}</AlertDescription>
          </Alert>
        )}

        {(loading || activeButton) && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="flex items-center gap-2 sm:gap-3">
              {loading && (
                <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 text-indigo-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <p className="text-indigo-700 text-xs sm:text-sm font-medium break-words">
                {activeButton === 'Проверка...'
                  ? 'Проверяю доступность статьи...'
                  : activeButton === 'Парсинг...' 
                  ? 'Загружаю статью...' 
                  : activeButton === 'Перевести' 
                  ? 'Перевожу статью...' 
                  : activeButton === 'О чем статья?'
                  ? 'Анализирую статью...'
                  : activeButton === 'Тезисы'
                  ? 'Формирую тезисы...'
                  : activeButton === 'Пост для Telegram'
                  ? 'Создаю пост для Telegram...'
                  : 'Обрабатываю...'}
              </p>
            </div>
          </div>
        )}

        <div ref={resultRef} className="bg-white rounded-lg shadow-xl p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">
              Результат
            </h2>
            {result && !loading && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <div className="relative" ref={shareMenuRef}>
                  <button
                    onClick={() => setShowShareMenu(!showShareMenu)}
                    className="px-3 sm:px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                    title="Поделиться результатом"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Поделиться
                  </button>
                  {showShareMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                      <div className="py-1">
                        {typeof navigator !== 'undefined' && 'share' in navigator && (
                          <button
                            onClick={() => handleShare('native')}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            Поделиться...
                          </button>
                        )}
                        <button
                          onClick={() => handleShare('telegram')}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                          </svg>
                          Telegram
                        </button>
                        <button
                          onClick={() => handleShare('whatsapp')}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                          </svg>
                          WhatsApp
                        </button>
                        <button
                          onClick={() => handleShare('vk')}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.496-1.58-2.221-.221-2.221.221v1.506c0 .607-.493 1.1-1.1 1.1H8.316c-4.479 0-5.316-.836-5.316-5.316V8.316C3 3.837 3.837 3 8.316 3h7.368C20.163 3 21 3.837 21 8.316v7.368c0 .609-.493 1.102-1.1 1.102h-1.524zm-2.22-5.48c.1-.1.1-.26 0-.36l-1.1-1.1c-.1-.1-.26-.1-.36 0l-1.1 1.1c-.1.1-.1.26 0 .36l1.1 1.1c.1.1.26.1.36 0l1.1-1.1zm-2.22-2.22c.1-.1.1-.26 0-.36l-1.1-1.1c-.1-.1-.26-.1-.36 0l-1.1 1.1c-.1.1-.1.26 0 .36l1.1 1.1c.1.1.26.1.36 0l1.1-1.1z"/>
                          </svg>
                          ВКонтакте
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleSaveResult}
                  className="px-3 sm:px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  title="Сохранить в файл"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Сохранить
                </button>
                <button
                  id="copy-button"
                  onClick={handleCopyResult}
                  className="px-3 sm:px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  title="Копировать результат"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Копировать
                </button>
              </div>
            )}
          </div>
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200 min-h-[200px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center min-h-[200px] px-2">
                <svg className="animate-spin h-8 w-8 text-indigo-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-600 text-base sm:text-lg text-center">
                  {activeButton === 'Парсинг...' ? 'Парсинг статьи...' : activeButton === 'Перевести' ? 'Перевод статьи...' : 'Генерация ответа...'}
                </p>
                {activeButton && activeButton !== 'Парсинг...' && activeButton !== 'Перевести' && (
                  <p className="text-gray-500 text-sm mt-2 text-center">
                    {activeButton}
                  </p>
                )}
              </div>
            ) : result ? (
              <div className="text-gray-700 whitespace-pre-wrap text-xs sm:text-sm overflow-auto break-words">
                {currentActionType === 'theses' || currentActionType === 'telegram-post' ? (
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-gray-700 break-words">{result}</pre>
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap font-mono text-xs sm:text-sm break-words overflow-x-auto">{result}</pre>
                )}
              </div>
            ) : (
              <p className="text-gray-400 text-center px-2">
                Результат появится здесь после нажатия на одну из кнопок
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
