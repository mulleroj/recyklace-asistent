/**
 * Exponential Backoff Retry Logic
 * For handling API failures gracefully
 */

export interface RetryOptions {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    onRetry?: (attempt: number, error: Error) => void;
}

const defaultOptions: Required<RetryOptions> = {
    maxRetries: 3,
    initialDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    backoffMultiplier: 2,
    onRetry: () => { },
};

/**
 * Execute a function with exponential backoff retry
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const opts = { ...defaultOptions, ...options };
    let lastError: Error;

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;

            // Don't retry on last attempt
            if (attempt === opts.maxRetries) {
                break;
            }

            // Calculate delay with exponential backoff
            const delay = Math.min(
                opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt),
                opts.maxDelay
            );

            console.warn(
                `Attempt ${attempt + 1}/${opts.maxRetries + 1} failed. Retrying in ${delay}ms...`,
                error
            );

            opts.onRetry(attempt + 1, error as Error);

            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError!;
}

/**
 * Check if an error is retryable (network errors, timeouts, 5xx errors)
 */
export function isRetryableError(error: any): boolean {
    // Network errors
    if (error.message?.includes('fetch') || error.message?.includes('network')) {
        return true;
    }

    // HTTP 5xx errors (server errors)
    if (error.status >= 500 && error.status < 600) {
        return true;
    }

    // Timeout errors
    if (error.message?.includes('timeout')) {
        return true;
    }

    // Rate limiting (429)
    if (error.status === 429) {
        return true;
    }

    return false;
}

/**
 * Retry wrapper specifically for API calls
 */
export async function retryApiCall<T>(
    apiCall: () => Promise<T>,
    context: string = 'API call'
): Promise<T> {
    return withRetry(apiCall, {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 5000,
        onRetry: (attempt, error) => {
            console.log(`🔄 Retrying ${context} (attempt ${attempt}/3)`, error.message);
        },
    });
}
