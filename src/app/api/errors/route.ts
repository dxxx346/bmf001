import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

interface ErrorReport {
  message: string
  stack?: string
  componentStack?: string
  errorId: string
  timestamp: string
  userAgent?: string
  url: string
  level: 'page' | 'section' | 'component'
  userId?: string
}

export async function POST(request: NextRequest) {
  try {
    const errorReport: ErrorReport = await request.json()

    // Log the error
    logger.error('Client-side error reported', {
      errorId: errorReport.errorId,
      message: errorReport.message,
      stack: errorReport.stack,
      componentStack: errorReport.componentStack,
      level: errorReport.level,
      url: errorReport.url,
      userAgent: errorReport.userAgent,
      timestamp: errorReport.timestamp
    })

    // In production, you might want to:
    // 1. Send to error monitoring service (Sentry, LogRocket, etc.)
    // 2. Store in database for analysis
    // 3. Send alerts for critical errors
    // 4. Rate limit error reports per user/IP

    // Example: Send to external monitoring service
    if (process.env.NODE_ENV === 'production' && process.env.ERROR_REPORTING_WEBHOOK) {
      try {
        await fetch(process.env.ERROR_REPORTING_WEBHOOK, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: `🚨 Client Error Report`,
            attachments: [{
              color: 'danger',
              fields: [
                { title: 'Error ID', value: errorReport.errorId, short: true },
                { title: 'Level', value: errorReport.level, short: true },
                { title: 'Message', value: errorReport.message, short: false },
                { title: 'URL', value: errorReport.url, short: false },
                { title: 'Timestamp', value: errorReport.timestamp, short: true }
              ]
            }]
          })
        })
      } catch (webhookError) {
        logger.error('Failed to send error to webhook', { error: webhookError })
      }
    }

    return NextResponse.json(
      { message: 'Error reported successfully', errorId: errorReport.errorId },
      { status: 200 }
    )
  } catch (error) {
    logger.error('Failed to process error report', { error })
    return NextResponse.json(
      { error: 'Failed to process error report' },
      { status: 500 }
    )
  }
}
