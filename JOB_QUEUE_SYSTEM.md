# Job Queue System Documentation

## Overview

This project implements a comprehensive job queue system using BullMQ and Redis for handling background tasks in the digital marketplace. The system includes multiple specialized queues for different types of operations and provides monitoring, retry mechanisms, and dead letter queue handling.

## Architecture

### Queues

1. **Email Sending Queue** (`email-sending`)
   - Handles email notifications and marketing campaigns
   - Supports templates, attachments, and bulk sending
   - Priority-based processing (high, normal, low)

2. **File Processing Queue** (`file-processing`)
   - Virus scanning for uploaded files
   - Image optimization and thumbnail generation
   - Format conversion and file validation
   - High priority for user-facing operations

3. **Analytics Aggregation Queue** (`analytics-aggregation`)
   - Hourly, daily, weekly, and monthly analytics processing
   - Performance metrics calculation
   - Low priority background processing

4. **Payment Retry Queue** (`payment-retry`)
   - Handles failed payment retries
   - Supports multiple payment providers (Stripe, YooKassa, Crypto)
   - Exponential backoff with configurable retry limits

5. **Referral Commission Queue** (`referral-commission`)
   - Calculates and distributes referral commissions
   - Updates referral statistics
   - Manages commission transactions

6. **Daily Reports Queue** (`daily-reports`)
   - Generates daily business reports
   - Supports multiple formats (PDF, CSV, JSON)
   - Automated scheduling at 6 AM UTC

7. **Weekly Reports Queue** (`weekly-reports`)
   - Generates weekly business reports
   - Includes comparison data and charts
   - Automated scheduling on Mondays at 8 AM UTC

8. **Dead Letter Queue** (`dead-letter`)
   - Handles jobs that have failed after maximum retries
   - Logs failed jobs for manual review
   - Sends alerts to administrators

## Features

### Job Monitoring Dashboard

- Real-time queue statistics
- Job details and status tracking
- Manual job retry and deletion
- Queue management operations
- Dead letter queue inspection

### Retry Mechanisms

- Configurable retry attempts per queue
- Exponential backoff strategies
- Dead letter queue for permanently failed jobs
- Manual retry capabilities

### Cron Job Scheduling

- Automated recurring job scheduling
- Custom analytics aggregation
- Flexible report generation
- Timezone-aware scheduling

### File Processing

- Virus scanning integration
- Image optimization with Sharp
- Thumbnail generation
- Format conversion
- File validation and size limits

### Email System

- Template-based email sending
- Bulk email capabilities
- Attachment support
- Priority-based processing
- Multiple email templates

## Usage

### Starting Workers

```bash
# Development
npm run workers:dev

# Production
npm run workers:prod

# General
npm run workers:start
```

### Adding Jobs

```typescript
import { 
  addEmailJob, 
  addFileProcessingJob, 
  addAnalyticsJob 
} from '@/jobs/queue';

// Add email job
await addEmailJob({
  to: 'user@example.com',
  template: 'welcome',
  data: { name: 'John Doe' },
  priority: 'high'
});

// Add file processing job
await addFileProcessingJob({
  fileId: 'file-123',
  fileUrl: 'https://storage.example.com/file.pdf',
  fileName: 'document.pdf',
  fileType: 'application/pdf',
  fileSize: 1024000,
  userId: 'user-123',
  processingType: 'virus_scan'
});

// Add analytics job
await addAnalyticsJob({
  type: 'daily',
  dateRange: {
    start: '2024-01-01T00:00:00Z',
    end: '2024-01-01T23:59:59Z'
  },
  metrics: ['page_views', 'purchases']
});
```

### Using Services

```typescript
import { emailService } from '@/services/email.service';
import { fileProcessingService } from '@/services/file-processing.service';
import { cronService } from '@/services/cron.service';

// Send welcome email
await emailService.sendWelcomeEmail(
  'user@example.com',
  'John Doe',
  'https://marketplace.example.com'
);

// Process uploaded file
await fileProcessingService.processFile(
  'file-123',
  'https://storage.example.com/file.jpg',
  'image.jpg',
  'image/jpeg',
  1024000,
  'user-123',
  'product-123',
  {
    generateThumbnail: true,
    optimizeImage: true,
    scanForViruses: true
  }
);

// Schedule custom analytics
await cronService.scheduleCustomAnalyticsAggregation(
  'daily',
  '2024-01-01',
  '2024-01-31',
  ['page_views', 'conversion_rate']
);
```

## API Endpoints

### Queue Statistics
- `GET /api/jobs/stats` - Get overall queue statistics

### Queue Management
- `GET /api/jobs/queues/[queueName]` - Get detailed queue information
- `DELETE /api/jobs/queues/[queueName]` - Clear jobs from queue

### Job Operations
- `POST /api/jobs/retry` - Retry a failed job
- `POST /api/jobs/schedule` - Schedule recurring jobs

## Configuration

### Environment Variables

```env
# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_redis_password

# Worker Configuration
START_WORKERS=true
NODE_ENV=production

# Email Configuration (for email service)
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_sendgrid_key

# File Processing
MAX_FILE_SIZE=104857600  # 100MB
ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf
```

### Queue Configuration

Each queue can be configured with:
- `attempts`: Maximum retry attempts
- `backoff`: Retry delay strategy
- `removeOnComplete`: Number of completed jobs to keep
- `removeOnFail`: Number of failed jobs to keep
- `priority`: Job priority levels

## Monitoring

### Dashboard Access

Visit `/jobs` to access the job monitoring dashboard.

### Key Metrics

- Queue sizes (waiting, active, completed, failed, delayed)
- Job processing times
- Error rates
- Dead letter queue size
- Worker health status

### Alerts

The system automatically sends alerts for:
- Jobs moved to dead letter queue
- High error rates
- Queue size thresholds
- Worker failures

## Error Handling

### Retry Strategy

1. **Exponential Backoff**: Delays increase exponentially between retries
2. **Max Attempts**: Configurable per queue type
3. **Dead Letter Queue**: Failed jobs after max attempts
4. **Manual Retry**: Admin can retry failed jobs

### Logging

All job operations are logged with:
- Job ID and type
- Processing time
- Error details
- Retry attempts
- Success/failure status

## Performance Considerations

### Queue Optimization

- Separate queues for different job types
- Priority-based processing
- Batch processing for bulk operations
- Connection pooling for Redis

### Resource Management

- Worker process limits
- Memory usage monitoring
- CPU usage optimization
- Database connection management

## Security

### File Processing

- Virus scanning for all uploaded files
- File type validation
- Size limits enforcement
- Secure file storage

### Job Data

- Sensitive data encryption
- Access control for job management
- Audit logging for all operations

## Troubleshooting

### Common Issues

1. **Workers not starting**
   - Check Redis connection
   - Verify environment variables
   - Check worker logs

2. **Jobs stuck in queue**
   - Check worker health
   - Verify job data validity
   - Check Redis memory usage

3. **High error rates**
   - Review error logs
   - Check external service availability
   - Verify job data format

### Debug Commands

```bash
# Check Redis connection
redis-cli ping

# View queue contents
redis-cli keys "bull:*"

# Monitor Redis activity
redis-cli monitor
```

## Development

### Adding New Job Types

1. Define job data interface
2. Add queue configuration
3. Implement worker processor
4. Add queue management functions
5. Update monitoring dashboard

### Testing

```bash
# Run workers in test mode
NODE_ENV=test npm run workers:dev

# Test specific job types
npm run test:jobs
```

## Production Deployment

### Docker

```dockerfile
# Worker container
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
CMD ["npm", "run", "workers:prod"]
```

### PM2

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'job-workers',
    script: 'src/scripts/start-workers.ts',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
```

## Contributing

1. Follow the existing code structure
2. Add proper error handling
3. Include comprehensive logging
4. Write tests for new features
5. Update documentation

## License

This job queue system is part of the digital marketplace project and follows the same licensing terms.
