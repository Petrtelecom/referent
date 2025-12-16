/**
 * Типы ошибок
 */
export type ErrorType = 
  | 'parse_error'           // Ошибка парсинга/загрузки статьи
  | 'translate_error'       // Ошибка перевода
  | 'ai_process_error'      // Ошибка AI-обработки
  | 'network_error'         // Ошибка сети
  | 'validation_error'      // Ошибка валидации
  | 'unknown_error'         // Неизвестная ошибка

/**
 * Интерфейс для структурированной ошибки
 */
export interface AppError {
  type: ErrorType
  message: string
  originalError?: string
}

/**
 * Обработка ошибок парсинга/загрузки статьи
 */
export function handleParseError(response: Response, errorData?: any): AppError {
  // Ошибки загрузки статьи (404, 500, таймаут и т.п.)
  if (response.status === 404 || response.status === 500 || response.status >= 500) {
    return {
      type: 'parse_error',
      message: 'Не удалось загрузить статью по этой ссылке.',
      originalError: errorData?.error || errorData?.details
    }
  }

  // Таймаут
  if (response.status === 408 || errorData?.error?.includes('timeout') || errorData?.error?.includes('Timeout')) {
    return {
      type: 'parse_error',
      message: 'Не удалось загрузить статью по этой ссылке.',
      originalError: errorData?.error
    }
  }

  // Ошибка сети
  if (response.status === 0 || errorData?.error?.includes('fetch failed') || errorData?.error?.includes('network')) {
    return {
      type: 'network_error',
      message: 'Ошибка сети. Проверьте подключение к интернету и попробуйте снова.',
      originalError: errorData?.error
    }
  }

  // Общая ошибка парсинга
  return {
    type: 'parse_error',
    message: 'Не удалось загрузить статью по этой ссылке.',
    originalError: errorData?.error || errorData?.details
  }
}

/**
 * Обработка ошибок перевода
 */
export function handleTranslateError(response: Response, errorData?: any): AppError {
  if (response.status === 401 || response.status === 403) {
    return {
      type: 'translate_error',
      message: 'Ошибка авторизации. Проверьте настройки API ключа.',
      originalError: errorData?.error
    }
  }

  if (response.status === 429) {
    return {
      type: 'translate_error',
      message: 'Превышен лимит запросов. Попробуйте позже.',
      originalError: errorData?.error
    }
  }

  if (response.status === 402 || errorData?.error?.includes('insufficient') || errorData?.error?.includes('баланс')) {
    return {
      type: 'translate_error',
      message: 'Недостаточно средств на балансе API. Пополните баланс и попробуйте снова.',
      originalError: errorData?.error
    }
  }

  if (errorData?.error?.includes('context length') || errorData?.error?.includes('токен')) {
    return {
      type: 'translate_error',
      message: 'Статья слишком длинная для перевода. Попробуйте более короткую статью.',
      originalError: errorData?.error
    }
  }

  return {
    type: 'translate_error',
    message: 'Ошибка при переводе статьи. Попробуйте снова.',
    originalError: errorData?.error || errorData?.details
  }
}

/**
 * Обработка ошибок AI-обработки
 */
export function handleAIProcessError(response: Response, errorData?: any): AppError {
  if (response.status === 401 || response.status === 403) {
    return {
      type: 'ai_process_error',
      message: 'Ошибка авторизации. Проверьте настройки API ключа.',
      originalError: errorData?.error
    }
  }

  if (response.status === 429) {
    return {
      type: 'ai_process_error',
      message: 'Превышен лимит запросов. Попробуйте позже.',
      originalError: errorData?.error
    }
  }

  if (response.status === 402 || errorData?.error?.includes('insufficient') || errorData?.error?.includes('баланс')) {
    return {
      type: 'ai_process_error',
      message: 'Недостаточно средств на балансе API. Пополните баланс и попробуйте снова.',
      originalError: errorData?.error
    }
  }

  if (errorData?.error?.includes('context length') || errorData?.error?.includes('токен')) {
    return {
      type: 'ai_process_error',
      message: 'Статья слишком длинная для обработки. Попробуйте более короткую статью.',
      originalError: errorData?.error
    }
  }

  return {
    type: 'ai_process_error',
    message: 'Ошибка при обработке статьи. Попробуйте снова.',
    originalError: errorData?.error || errorData?.details
  }
}

/**
 * Обработка сетевых ошибок (когда fetch выбрасывает исключение)
 */
export function handleNetworkError(error: unknown): AppError {
  const errorMessage = error instanceof Error ? error.message : String(error)
  
  if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
    return {
      type: 'network_error',
      message: 'Превышено время ожидания. Попробуйте позже.',
      originalError: errorMessage
    }
  }

  if (errorMessage.includes('fetch failed') || errorMessage.includes('network') || errorMessage.includes('Failed to fetch')) {
    return {
      type: 'network_error',
      message: 'Ошибка сети. Проверьте подключение к интернету и попробуйте снова.',
      originalError: errorMessage
    }
  }

  return {
    type: 'network_error',
    message: 'Ошибка сети. Попробуйте снова.',
    originalError: errorMessage
  }
}

/**
 * Обработка ошибок валидации
 */
export function handleValidationError(message: string): AppError {
  return {
    type: 'validation_error',
    message: message,
  }
}

/**
 * Универсальная обработка ошибок
 */
export function handleError(error: unknown, errorType: ErrorType = 'unknown_error'): AppError {
  if (error instanceof Error) {
    // Если это уже структурированная ошибка
    if ('type' in error && 'message' in error) {
      return error as unknown as AppError
    }
    
    return {
      type: errorType,
      message: error.message || 'Произошла неизвестная ошибка',
      originalError: error.message
    }
  }

  return {
    type: errorType,
    message: 'Произошла неизвестная ошибка',
    originalError: String(error)
  }
}

