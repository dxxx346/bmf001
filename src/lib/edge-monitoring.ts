// Edge Runtime compatible monitoring
// This module is safe to use in Edge Runtime contexts like middleware

export class EdgeMonitoring {
  // Simple in-memory metrics storage for Edge Runtime
  // In production, these should be sent to an external monitoring service
  private static responseTimeBuffer: number[] = [];
  private static errorCount = 0;
  private static readonly MAX_BUFFER_SIZE = 100;

  static recordResponseTime(duration: number): void {
    // Keep only the last MAX_BUFFER_SIZE entries
    if (this.responseTimeBuffer.length >= this.MAX_BUFFER_SIZE) {
      this.responseTimeBuffer.shift();
    }
    this.responseTimeBuffer.push(duration);
    
    // Log slow requests
    if (duration > 1000) {
      console.warn(`Slow request detected: ${duration}ms`);
    }
  }

  static recordError(error: Error, context: any): void {
    this.errorCount++;
    
    // Log error details for debugging
    console.error('Edge Runtime Error:', {
      message: error.message,
      stack: error.stack,
      context,
      errorCount: this.errorCount
    });

    // In production, send to external monitoring service
    // Example: Send to Sentry, Datadog, etc.
    if (process.env.NODE_ENV === 'production') {
      // TODO: Implement external monitoring service integration
      // that's compatible with Edge Runtime
    }
  }

  static getMetrics() {
    const avgResponseTime = this.responseTimeBuffer.length > 0
      ? this.responseTimeBuffer.reduce((a, b) => a + b, 0) / this.responseTimeBuffer.length
      : 0;

    return {
      avgResponseTime,
      errorCount: this.errorCount,
      sampleSize: this.responseTimeBuffer.length
    };
  }
}

// Export a simplified interface for middleware
export const edgeMonitoring = {
  recordResponseTime: (duration: number) => EdgeMonitoring.recordResponseTime(duration),
  recordError: (error: Error, context: any) => EdgeMonitoring.recordError(error, context),
  getMetrics: () => EdgeMonitoring.getMetrics()
};
