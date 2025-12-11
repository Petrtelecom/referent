'use client'

import { useState } from 'react'

export default function Home() {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeButton, setActiveButton] = useState<string | null>(null)
  const [parsedSuccessfully, setParsedSuccessfully] = useState(false)

  const handleParse = async () => {
    if (!url.trim()) {
      alert('Пожалуйста, введите URL статьи')
      return
    }

    setLoading(true)
    setActiveButton('Парсить статью')
    setResult('')

    try {
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
      
      // Форматируем JSON для красивого отображения
      const jsonResult = JSON.stringify(data, null, 2)
      setResult(jsonResult)
      setParsedSuccessfully(true)
    } catch (error) {
      setResult(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
      setParsedSuccessfully(false)
    } finally {
      setLoading(false)
      setActiveButton(null)
    }
  }

  const handleAction = async (action: string) => {
    if (!url.trim()) {
      alert('Пожалуйста, введите URL статьи')
      return
    }

    setLoading(true)
    setActiveButton(action)
    setResult('')

    // Здесь будет логика вызова AI API
    // Пока что просто имитация загрузки
    setTimeout(() => {
      setResult(`Результат для действия "${action}" будет здесь...`)
      setLoading(false)
      setActiveButton(null)
    }, 1000)
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
            <div className="flex gap-2">
              <input
                id="article-url"
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value)
                  setParsedSuccessfully(false)
                }}
                placeholder="https://example.com/article"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                disabled={loading}
              />
              <button
                onClick={handleParse}
                disabled={loading}
                className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
                  activeButton === 'Парсить статью'
                    ? 'bg-indigo-600 text-white shadow-lg scale-105'
                    : loading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : parsedSuccessfully
                    ? 'bg-green-500 text-white hover:bg-green-600 hover:shadow-md active:scale-95'
                    : 'bg-indigo-500 text-white hover:bg-indigo-600 hover:shadow-md active:scale-95'
                }`}
              >
                {loading && activeButton === 'Парсить статью' ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Парсинг...
                  </span>
                ) : (
                  'Парсить статью'
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Результат
          </h2>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 min-h-[200px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center min-h-[200px]">
                <svg className="animate-spin h-8 w-8 text-indigo-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-600 text-lg">
                  Генерация ответа...
                </p>
                {activeButton && (
                  <p className="text-gray-500 text-sm mt-2">
                    {activeButton}
                  </p>
                )}
              </div>
            ) : result ? (
              <pre className="text-gray-700 whitespace-pre-wrap font-mono text-sm overflow-auto">
                {result}
              </pre>
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
