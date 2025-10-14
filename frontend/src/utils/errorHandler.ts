import toast from 'react-hot-toast';

export interface ErrorResponse {
  message: string;
  userMessage: string;
  suggestion?: string;
}

/**
 * Maps common error scenarios to user-friendly messages
 */
export function parseError(error: any): ErrorResponse {
  // Network errors
  if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
    return {
      message: error.message,
      userMessage: 'Unable to connect to the server',
      suggestion: 'Please check if the backend server is running on port 3001'
    };
  }

  // Timeout errors
  if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
    return {
      message: error.message,
      userMessage: 'The request took too long to complete',
      suggestion: 'Your code might be too complex. Try with a smaller snippet or try again'
    };
  }

  // API key errors
  if (error.response?.status === 401 ||
      error.response?.data?.error?.includes('API key') ||
      error.response?.data?.error?.includes('authentication')) {
    return {
      message: error.response?.data?.error || error.message,
      userMessage: 'API authentication failed',
      suggestion: 'Please check your API key in Settings and make sure it\'s valid'
    };
  }

  // Rate limit errors
  if (error.response?.status === 429) {
    return {
      message: error.response?.data?.error || error.message,
      userMessage: 'Too many requests',
      suggestion: 'You\'ve hit the rate limit. Please wait a moment before trying again'
    };
  }

  // Server errors (5xx)
  if (error.response?.status >= 500) {
    return {
      message: error.response?.data?.error || error.message,
      userMessage: 'Server error occurred',
      suggestion: 'The server encountered an issue. Please try again in a few moments'
    };
  }

  // Bad request errors (400)
  if (error.response?.status === 400) {
    const errorMsg = error.response?.data?.error || error.message;

    if (errorMsg.includes('code') && errorMsg.includes('required')) {
      return {
        message: errorMsg,
        userMessage: 'Please provide code to document',
        suggestion: 'Enter some code in the editor before generating documentation'
      };
    }

    if (errorMsg.includes('language')) {
      return {
        message: errorMsg,
        userMessage: 'Invalid programming language',
        suggestion: 'Please select a supported language (JavaScript, Python, TypeScript, or Java)'
      };
    }

    return {
      message: errorMsg,
      userMessage: 'Invalid request',
      suggestion: 'Please check your input and try again'
    };
  }

  // Not found errors (404)
  if (error.response?.status === 404) {
    return {
      message: error.response?.data?.error || error.message,
      userMessage: 'Resource not found',
      suggestion: 'The requested item may have been deleted or doesn\'t exist'
    };
  }

  // Claude API specific errors
  if (error.response?.data?.error?.includes('model')) {
    return {
      message: error.response.data.error,
      userMessage: 'AI model error',
      suggestion: 'The AI service is temporarily unavailable. Please try again later'
    };
  }

  // Generic error with response
  if (error.response?.data?.error) {
    return {
      message: error.response.data.error,
      userMessage: error.response.data.error,
      suggestion: 'Please try again or contact support if the issue persists'
    };
  }

  // Fallback for unknown errors
  return {
    message: error.message || 'Unknown error',
    userMessage: 'An unexpected error occurred',
    suggestion: 'Please refresh the page and try again. If the issue persists, check the console for details'
  };
}

/**
 * Shows a user-friendly error toast notification
 */
export function showErrorToast(error: any) {
  const parsedError = parseError(error);

  const message = parsedError.suggestion
    ? `${parsedError.userMessage}\n\n${parsedError.suggestion}`
    : parsedError.userMessage;

  toast.error(message, {
    duration: 6000,
    style: {
      maxWidth: '450px',
      whiteSpace: 'pre-line',
    },
  });

  // Log full error for debugging
  console.error('Error details:', parsedError.message, error);
}

/**
 * Shows a user-friendly success toast
 */
export function showSuccessToast(message: string) {
  toast.success(message, {
    duration: 3000,
  });
}

/**
 * Shows a user-friendly warning toast
 */
export function showWarningToast(message: string) {
  toast(message, {
    icon: '⚠️',
    duration: 4000,
    style: {
      background: '#1e293b',
      color: '#fbbf24',
      border: '1px solid rgba(251, 191, 36, 0.3)',
    },
  });
}

/**
 * Shows a loading toast and returns the toast ID for dismissal
 */
export function showLoadingToast(message: string): string {
  return toast.loading(message);
}

/**
 * Dismisses a specific toast by ID
 */
export function dismissToast(toastId: string) {
  toast.dismiss(toastId);
}
