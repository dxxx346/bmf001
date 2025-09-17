// On-Call Rotation and Alerting System
// Manages on-call schedules, escalations, and notifications

interface OnCallPerson {
  id: string;
  name: string;
  email: string;
  phone: string;
  timezone: string;
  role: 'engineer' | 'manager' | 'executive';
  skills: string[];
  availability: {
    days: number[]; // 0-6, Sunday-Saturday
    hours: {
      start: string; // HH:MM format
      end: string;   // HH:MM format
    };
  };
}

interface OnCallSchedule {
  id: string;
  name: string;
  timezone: string;
  rotation: {
    type: 'weekly' | 'daily' | 'monthly';
    duration: number; // in hours
    handoffTime: string; // HH:MM format
  };
  members: string[]; // OnCallPerson IDs
  escalation: {
    levels: Array<{
      level: number;
      timeout: number; // minutes
      members: string[];
    }>;
  };
}

interface Alert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  source: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  escalationLevel: number;
  notifications: Array<{
    method: 'email' | 'sms' | 'phone' | 'slack' | 'push';
    recipient: string;
    sentAt: Date;
    status: 'sent' | 'delivered' | 'failed';
  }>;
}

// On-Call Team Configuration
export const onCallTeam: OnCallPerson[] = [
  {
    id: 'engineer-1',
    name: 'Alex Johnson',
    email: 'alex.johnson@bmf001.com',
    phone: '+1-555-0101',
    timezone: 'America/New_York',
    role: 'engineer',
    skills: ['backend', 'database', 'devops'],
    availability: {
      days: [1, 2, 3, 4, 5], // Monday-Friday
      hours: { start: '09:00', end: '18:00' },
    },
  },
  {
    id: 'engineer-2',
    name: 'Sarah Chen',
    email: 'sarah.chen@bmf001.com',
    phone: '+1-555-0102',
    timezone: 'America/Los_Angeles',
    role: 'engineer',
    skills: ['frontend', 'api', 'security'],
    availability: {
      days: [0, 1, 2, 3, 4, 5, 6], // All days
      hours: { start: '08:00', end: '20:00' },
    },
  },
  {
    id: 'manager-1',
    name: 'Mike Rodriguez',
    email: 'mike.rodriguez@bmf001.com',
    phone: '+1-555-0103',
    timezone: 'America/Chicago',
    role: 'manager',
    skills: ['management', 'escalation', 'customer'],
    availability: {
      days: [0, 1, 2, 3, 4, 5, 6], // All days
      hours: { start: '00:00', end: '23:59' },
    },
  },
  {
    id: 'executive-1',
    name: 'Jennifer Kim',
    email: 'jennifer.kim@bmf001.com',
    phone: '+1-555-0104',
    timezone: 'America/New_York',
    role: 'executive',
    skills: ['executive', 'decision-making', 'external'],
    availability: {
      days: [0, 1, 2, 3, 4, 5, 6], // All days
      hours: { start: '00:00', end: '23:59' },
    },
  },
];

// On-Call Schedules Configuration
export const onCallSchedules: OnCallSchedule[] = [
  {
    id: 'primary-schedule',
    name: 'Primary Engineering',
    timezone: 'UTC',
    rotation: {
      type: 'weekly',
      duration: 168, // 1 week in hours
      handoffTime: '09:00',
    },
    members: ['engineer-1', 'engineer-2'],
    escalation: {
      levels: [
        {
          level: 1,
          timeout: 5, // 5 minutes
          members: ['engineer-1', 'engineer-2'],
        },
        {
          level: 2,
          timeout: 15, // 15 minutes
          members: ['manager-1'],
        },
        {
          level: 3,
          timeout: 30, // 30 minutes
          members: ['executive-1'],
        },
      ],
    },
  },
  {
    id: 'weekend-schedule',
    name: 'Weekend Coverage',
    timezone: 'UTC',
    rotation: {
      type: 'weekly',
      duration: 48, // Weekend only
      handoffTime: '00:00',
    },
    members: ['engineer-2', 'manager-1'],
    escalation: {
      levels: [
        {
          level: 1,
          timeout: 10, // Longer timeout on weekends
          members: ['engineer-2'],
        },
        {
          level: 2,
          timeout: 20,
          members: ['manager-1'],
        },
        {
          level: 3,
          timeout: 60,
          members: ['executive-1'],
        },
      ],
    },
  },
];

// On-Call Manager
export class OnCallManager {
  private static instance: OnCallManager;
  private schedules: Map<string, OnCallSchedule> = new Map();
  private team: Map<string, OnCallPerson> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  
  private constructor() {
    this.initializeData();
  }
  
  static getInstance(): OnCallManager {
    if (!OnCallManager.instance) {
      OnCallManager.instance = new OnCallManager();
    }
    return OnCallManager.instance;
  }
  
  // Initialize team and schedule data
  private initializeData(): void {
    onCallTeam.forEach(person => {
      this.team.set(person.id, person);
    });
    
    onCallSchedules.forEach(schedule => {
      this.schedules.set(schedule.id, schedule);
    });
  }
  
  // Get current on-call person for a schedule
  getCurrentOnCall(scheduleId: string): OnCallPerson | null {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) {
      console.error(`[OnCall] Schedule not found: ${scheduleId}`);
      return null;
    }
    
    const now = new Date();
    const currentPersonId = this.calculateCurrentOnCall(schedule, now);
    
    if (!currentPersonId) {
      console.error(`[OnCall] No on-call person calculated for schedule: ${scheduleId}`);
      return null;
    }
    
    const person = this.team.get(currentPersonId);
    if (!person) {
      console.error(`[OnCall] Person not found: ${currentPersonId}`);
      return null;
    }
    
    return person;
  }
  
  // Calculate who is currently on-call
  private calculateCurrentOnCall(schedule: OnCallSchedule, time: Date): string | null {
    const { rotation, members } = schedule;
    
    // Calculate weeks since epoch for weekly rotation
    if (rotation.type === 'weekly') {
      const epochWeeks = Math.floor(time.getTime() / (1000 * 60 * 60 * 24 * 7));
      const memberIndex = epochWeeks % members.length;
      return members[memberIndex];
    }
    
    // Calculate days since epoch for daily rotation
    if (rotation.type === 'daily') {
      const epochDays = Math.floor(time.getTime() / (1000 * 60 * 60 * 24));
      const memberIndex = epochDays % members.length;
      return members[memberIndex];
    }
    
    // Default to first member
    return members[0] || null;
  }
  
  // Get next on-call rotation
  getNextRotation(scheduleId: string): {
    current: OnCallPerson | null;
    next: OnCallPerson | null;
    handoffTime: Date;
  } | null {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) return null;
    
    const now = new Date();
    const current = this.getCurrentOnCall(scheduleId);
    
    // Calculate next handoff time
    const handoffTime = this.calculateNextHandoff(schedule, now);
    
    // Calculate next on-call person
    const nextPersonId = this.calculateCurrentOnCall(schedule, handoffTime);
    const next = (nextPersonId ? this.team.get(nextPersonId) : null) || null;
    
    return { current, next, handoffTime };
  }
  
  // Calculate next handoff time
  private calculateNextHandoff(schedule: OnCallSchedule, from: Date): Date {
    const { rotation } = schedule;
    const [hours, minutes] = schedule.rotation.handoffTime.split(':').map(Number);
    
    const next = new Date(from);
    
    if (rotation.type === 'weekly') {
      // Next Monday at handoff time
      const daysUntilMonday = (8 - next.getDay()) % 7;
      next.setDate(next.getDate() + (daysUntilMonday || 7));
    } else if (rotation.type === 'daily') {
      // Tomorrow at handoff time
      next.setDate(next.getDate() + 1);
    }
    
    next.setHours(hours, minutes, 0, 0);
    return next;
  }
  
  // Create and send alert
  async createAlert(
    severity: Alert['severity'],
    title: string,
    description: string,
    source: string
  ): Promise<string> {
    const alertId = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const alert: Alert = {
      id: alertId,
      severity,
      title,
      description,
      source,
      timestamp: new Date(),
      acknowledged: false,
      resolved: false,
      escalationLevel: 1,
      notifications: [],
    };
    
    this.activeAlerts.set(alertId, alert);
    
    console.log(`[OnCall] Created alert: ${alertId} (${severity}) - ${title}`);
    
    // Start alert processing
    await this.processAlert(alert);
    
    return alertId;
  }
  
  // Process alert and handle escalations
  private async processAlert(alert: Alert): Promise<void> {
    const scheduleId = this.determineSchedule(alert);
    const schedule = this.schedules.get(scheduleId);
    
    if (!schedule) {
      console.error(`[OnCall] No schedule found for alert: ${alert.id}`);
      return;
    }
    
    // Send to first escalation level
    await this.sendToEscalationLevel(alert, schedule, 1);
    
    // Start escalation timer
    this.startEscalationTimer(alert, schedule);
  }
  
  // Determine which schedule to use for an alert
  private determineSchedule(alert: Alert): string {
    const now = new Date();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    
    // Use weekend schedule on weekends for non-critical alerts
    if (isWeekend && alert.severity !== 'critical') {
      return 'weekend-schedule';
    }
    
    return 'primary-schedule';
  }
  
  // Send alert to specific escalation level
  private async sendToEscalationLevel(
    alert: Alert,
    schedule: OnCallSchedule,
    level: number
  ): Promise<void> {
    const escalationLevel = schedule.escalation.levels.find(l => l.level === level);
    if (!escalationLevel) {
      console.error(`[OnCall] Escalation level ${level} not found for schedule: ${schedule.id}`);
      return;
    }
    
    console.log(`[OnCall] Escalating alert ${alert.id} to level ${level}`);
    
    // Send notifications to all members at this level
    for (const memberId of escalationLevel.members) {
      const person = this.team.get(memberId);
      if (person) {
        await this.sendNotifications(alert, person);
      }
    }
    
    alert.escalationLevel = level;
    this.activeAlerts.set(alert.id, alert);
  }
  
  // Start escalation timer
  private startEscalationTimer(alert: Alert, schedule: OnCallSchedule): void {
    const checkEscalation = () => {
      const currentAlert = this.activeAlerts.get(alert.id);
      if (!currentAlert || currentAlert.acknowledged || currentAlert.resolved) {
        return; // Alert is handled, stop escalation
      }
      
      const nextLevel = currentAlert.escalationLevel + 1;
      const nextEscalationLevel = schedule.escalation.levels.find(l => l.level === nextLevel);
      
      if (nextEscalationLevel) {
        console.log(`[OnCall] Auto-escalating alert ${alert.id} to level ${nextLevel}`);
        this.sendToEscalationLevel(currentAlert, schedule, nextLevel);
        
        // Schedule next escalation
        setTimeout(checkEscalation, nextEscalationLevel.timeout * 60 * 1000);
      } else {
        console.warn(`[OnCall] Alert ${alert.id} reached maximum escalation level`);
      }
    };
    
    // Start timer for first escalation
    const firstLevel = schedule.escalation.levels[0];
    if (firstLevel) {
      setTimeout(checkEscalation, firstLevel.timeout * 60 * 1000);
    }
  }
  
  // Send notifications to a person
  private async sendNotifications(alert: Alert, person: OnCallPerson): Promise<void> {
    const methods = this.determineNotificationMethods(alert.severity);
    
    for (const method of methods) {
      try {
        await this.sendNotification(alert, person, method);
        
        alert.notifications.push({
          method,
          recipient: person.id,
          sentAt: new Date(),
          status: 'sent',
        });
      } catch (error) {
        console.error(`[OnCall] Failed to send ${method} notification to ${person.name}:`, error);
        
        alert.notifications.push({
          method,
          recipient: person.id,
          sentAt: new Date(),
          status: 'failed',
        });
      }
    }
  }
  
  // Determine notification methods based on severity
  private determineNotificationMethods(severity: Alert['severity']): Array<'email' | 'sms' | 'phone' | 'slack' | 'push'> {
    switch (severity) {
      case 'critical':
        return ['phone', 'sms', 'email', 'slack', 'push'];
      case 'high':
        return ['sms', 'email', 'slack', 'push'];
      case 'medium':
        return ['email', 'slack', 'push'];
      case 'low':
        return ['email', 'slack'];
      default:
        return ['email'];
    }
  }
  
  // Send individual notification
  private async sendNotification(
    alert: Alert,
    person: OnCallPerson,
    method: 'email' | 'sms' | 'phone' | 'slack' | 'push'
  ): Promise<void> {
    const message = this.formatAlertMessage(alert, person);
    
    switch (method) {
      case 'email':
        await this.sendEmail(person.email, `Alert: ${alert.title}`, message);
        break;
      case 'sms':
        await this.sendSMS(person.phone, message);
        break;
      case 'phone':
        await this.makePhoneCall(person.phone, message);
        break;
      case 'slack':
        await this.sendSlackDM(person.email, message);
        break;
      case 'push':
        await this.sendPushNotification(person.id, alert.title, message);
        break;
    }
  }
  
  // Format alert message
  private formatAlertMessage(alert: Alert, person: OnCallPerson): string {
    return `🚨 ALERT (${alert.severity.toUpperCase()})

Title: ${alert.title}
Description: ${alert.description}
Source: ${alert.source}
Time: ${alert.timestamp.toISOString()}
Alert ID: ${alert.id}

To acknowledge: Reply ACK ${alert.id}
To resolve: Reply RESOLVE ${alert.id}

Hi ${person.name}, you are the current on-call engineer for this alert.`;
  }
  
  // Notification method implementations
  private async sendEmail(to: string, subject: string, body: string): Promise<void> {
    // Integration with email service (SendGrid, etc.)
    console.log(`[OnCall] Email sent to ${to}: ${subject}`);
  }
  
  private async sendSMS(to: string, message: string): Promise<void> {
    // Integration with SMS service (Twilio, etc.)
    console.log(`[OnCall] SMS sent to ${to}: ${message.substring(0, 50)}...`);
  }
  
  private async makePhoneCall(to: string, message: string): Promise<void> {
    // Integration with voice service (Twilio, etc.)
    console.log(`[OnCall] Phone call initiated to ${to}`);
  }
  
  private async sendSlackDM(email: string, message: string): Promise<void> {
    // Integration with Slack API
    console.log(`[OnCall] Slack DM sent to ${email}: ${message.substring(0, 50)}...`);
  }
  
  private async sendPushNotification(userId: string, title: string, body: string): Promise<void> {
    // Integration with push notification service
    console.log(`[OnCall] Push notification sent to ${userId}: ${title}`);
  }
  
  // Acknowledge alert
  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      console.error(`[OnCall] Alert not found: ${alertId}`);
      return false;
    }
    
    if (alert.acknowledged) {
      console.log(`[OnCall] Alert ${alertId} already acknowledged`);
      return true;
    }
    
    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();
    
    this.activeAlerts.set(alertId, alert);
    
    console.log(`[OnCall] Alert ${alertId} acknowledged by ${acknowledgedBy}`);
    
    // Send acknowledgment notification
    await this.sendAcknowledgmentNotification(alert);
    
    return true;
  }
  
  // Resolve alert
  async resolveAlert(alertId: string, resolvedBy: string): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      console.error(`[OnCall] Alert not found: ${alertId}`);
      return false;
    }
    
    if (alert.resolved) {
      console.log(`[OnCall] Alert ${alertId} already resolved`);
      return true;
    }
    
    // Auto-acknowledge if not already acknowledged
    if (!alert.acknowledged) {
      alert.acknowledged = true;
      alert.acknowledgedBy = resolvedBy;
      alert.acknowledgedAt = new Date();
    }
    
    alert.resolved = true;
    alert.resolvedBy = resolvedBy;
    alert.resolvedAt = new Date();
    
    this.activeAlerts.set(alertId, alert);
    
    console.log(`[OnCall] Alert ${alertId} resolved by ${resolvedBy}`);
    
    // Send resolution notification
    await this.sendResolutionNotification(alert);
    
    return true;
  }
  
  // Send acknowledgment notification
  private async sendAcknowledgmentNotification(alert: Alert): Promise<void> {
    if (process.env.SLACK_WEBHOOK_URL) {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `✅ Alert Acknowledged`,
          attachments: [{
            color: 'warning',
            fields: [
              { title: 'Alert ID', value: alert.id, short: true },
              { title: 'Title', value: alert.title, short: true },
              { title: 'Acknowledged By', value: alert.acknowledgedBy, short: true },
              { title: 'Time', value: alert.acknowledgedAt?.toISOString(), short: true },
            ],
          }],
        }),
      });
    }
  }
  
  // Send resolution notification
  private async sendResolutionNotification(alert: Alert): Promise<void> {
    if (process.env.SLACK_WEBHOOK_URL) {
      const duration = alert.resolvedAt && alert.timestamp
        ? Math.round((alert.resolvedAt.getTime() - alert.timestamp.getTime()) / 1000 / 60)
        : 0;
      
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `✅ Alert Resolved`,
          attachments: [{
            color: 'good',
            fields: [
              { title: 'Alert ID', value: alert.id, short: true },
              { title: 'Title', value: alert.title, short: true },
              { title: 'Resolved By', value: alert.resolvedBy, short: true },
              { title: 'Duration', value: `${duration} minutes`, short: true },
            ],
          }],
        }),
      });
    }
  }
  
  // Get active alerts
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values()).filter(alert => !alert.resolved);
  }
  
  // Get on-call schedule
  getSchedule(scheduleId: string): OnCallSchedule | undefined {
    return this.schedules.get(scheduleId);
  }
  
  // Get team member
  getTeamMember(memberId: string): OnCallPerson | undefined {
    return this.team.get(memberId);
  }
  
  // Get all schedules
  getAllSchedules(): OnCallSchedule[] {
    return Array.from(this.schedules.values());
  }
  
  // Get all team members
  getAllTeamMembers(): OnCallPerson[] {
    return Array.from(this.team.values());
  }
}

// Alert Severity Helper
export class AlertSeverity {
  static fromHealthCheck(criticalFailures: number): Alert['severity'] {
    if (criticalFailures >= 3) return 'critical';
    if (criticalFailures >= 2) return 'high';
    if (criticalFailures >= 1) return 'medium';
    return 'low';
  }
  
  static fromError(error: any): Alert['severity'] {
    if (error.code === 'DATABASE_DOWN') return 'critical';
    if (error.code === 'API_ERROR') return 'high';
    if (error.code === 'CACHE_ERROR') return 'medium';
    return 'low';
  }
}

// Integration with Disaster Recovery System
export class OnCallIntegration {
  private onCallManager: OnCallManager;
  
  constructor() {
    this.onCallManager = OnCallManager.getInstance();
  }
  
  // Create alert from health check
  async createHealthCheckAlert(healthStatus: any): Promise<string> {
    const severity = AlertSeverity.fromHealthCheck(healthStatus.criticalFailures);
    
    const description = `Health check detected ${healthStatus.criticalFailures} critical failures.\n\n` +
      Object.entries(healthStatus.results)
        .filter(([_, result]: [string, any]) => !result.healthy)
        .map(([service, result]: [string, any]) => `❌ ${service}: ${result.error || 'Failed'}`)
        .join('\n');
    
    return this.onCallManager.createAlert(
      severity,
      'Health Check Failures Detected',
      description,
      'health-monitor'
    );
  }
  
  // Create alert from disaster recovery event
  async createDRAlert(event: string, details: any): Promise<string> {
    return this.onCallManager.createAlert(
      'critical',
      `Disaster Recovery: ${event}`,
      JSON.stringify(details, null, 2),
      'disaster-recovery'
    );
  }
}

// Export main instances
export const onCallManager = OnCallManager.getInstance();
export const onCallIntegration = new OnCallIntegration();

// Auto-start on-call monitoring in production
if (process.env.NODE_ENV === 'production') {
  console.log('[OnCall] On-call system initialized');
}
