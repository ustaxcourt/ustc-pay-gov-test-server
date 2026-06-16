/**
 * Retries an async operation with exponential backoff if it fails with NoSuchKey error.
 * Useful for handling transient S3 eventual consistency issues or timing windows.
 *
 * @param fn - Async function to retry
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param initialDelayMs - Initial delay in milliseconds (default: 100)
 * @returns Result of the function on success, or throws after max retries
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 100,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Only retry on NoSuchKey errors; other errors are rethrown immediately
      if (lastError.name !== "NoSuchKey") {
        throw lastError;
      }

      // If this was the last attempt, rethrow
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff: 100ms, 200ms, 400ms, etc.
      const delayMs = initialDelayMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // Should never reach here, but satisfy TypeScript
  throw lastError || new Error("withRetry failed unexpectedly");
}
