import Anthropic from '@anthropic-ai/sdk';

export type LlmErrorKind =
  | 'rate_limited'
  | 'overloaded'
  | 'auth'
  | 'invalid_request'
  | 'timeout'
  | 'network'
  | 'unknown';

let sharedClient: Anthropic | undefined;

/**
 * Single Anthropic client shared by every service that calls Claude. The SDK
 * retries transient errors internally (maxRetries below) - don't wrap calls
 * to it in a hand-rolled retry/backoff loop.
 */
export function getAnthropicClient(): Anthropic {
  if (!sharedClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }

    sharedClient = new Anthropic({
      apiKey,
      maxRetries: 3,
      timeout: 120_000,
    });
  }

  return sharedClient;
}

/**
 * Maps an error from an Anthropic call to a stable kind and whether it's
 * worth retrying. Anything that isn't a recognized SDK error classifies as
 * 'unknown' / not retryable rather than guessing.
 */
export function classifyLlmError(err: unknown): { kind: LlmErrorKind; retryable: boolean; message: string } {
  if (err instanceof Anthropic.APIConnectionTimeoutError) {
    return {
      kind: 'timeout',
      retryable: true,
      message: 'The request to Claude timed out. Please try again.',
    };
  }

  if (err instanceof Anthropic.APIConnectionError) {
    return {
      kind: 'network',
      retryable: true,
      message: 'Could not reach Claude. Please check your connection and try again.',
    };
  }

  if (err instanceof Anthropic.APIError) {
    switch (err.status) {
      case 429:
        return {
          kind: 'rate_limited',
          retryable: true,
          message: 'Claude is rate-limiting requests right now. Please try again shortly.',
        };
      case 529:
      case 503:
        return {
          kind: 'overloaded',
          retryable: true,
          message: 'Claude is temporarily overloaded. Please try again shortly.',
        };
      case 401:
      case 403:
        return {
          kind: 'auth',
          retryable: false,
          message: 'Authentication with Claude failed. Check the API key configuration.',
        };
      case 400:
      case 422:
        return {
          kind: 'invalid_request',
          retryable: false,
          message: 'Claude rejected the request as invalid.',
        };
      default:
        return {
          kind: 'unknown',
          retryable: false,
          message: 'Claude returned an unexpected error.',
        };
    }
  }

  return {
    kind: 'unknown',
    retryable: false,
    message: 'An unexpected error occurred while contacting Claude.',
  };
}
