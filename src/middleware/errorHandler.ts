/**
 * Error handling middleware
 */

export function errorHandler(error: unknown): Response {
  console.error('API Error:', error)

  const errorMessage = error instanceof Error ? error.message : 'Internal Server Error'
  const statusCode = error instanceof Error && 'status' in error ? 
    (error as any).status : 500

  return new Response(JSON.stringify({
    success: false,
    error: errorMessage,
    timestamp: new Date().toISOString(),
  }), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

export class ApiError extends Error {
  constructor(message: string, public status: number = 500) {
    super(message)
    this.name = 'ApiError'
  }
}