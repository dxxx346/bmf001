/**
 * Date Utilities - Lightweight replacement for moment.js
 * Uses date-fns for better bundle size optimization
 */

import {
  format,
  formatDistance,
  formatDistanceToNow,
  parseISO,
  isValid,
  addDays,
  addHours,
  addMinutes,
  subDays,
  subHours,
  subMinutes,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isSameDay,
  isSameWeek,
  isSameMonth,
  isAfter,
  isBefore,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  formatRelative
} from 'date-fns'

// Common date formats
export const DATE_FORMATS = {
  SHORT: 'MMM d, yyyy',
  LONG: 'MMMM d, yyyy',
  FULL: 'EEEE, MMMM d, yyyy',
  TIME: 'h:mm a',
  DATETIME: 'MMM d, yyyy h:mm a',
  ISO: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
  API: 'yyyy-MM-dd HH:mm:ss',
  DISPLAY: 'MMM d, yyyy • h:mm a'
} as const

export class DateUtils {
  // =============================================
  // FORMATTING METHODS
  // =============================================

  /**
   * Format date with common patterns
   */
  static format(date: Date | string | number, formatStr: string = DATE_FORMATS.SHORT): string {
    try {
      const dateObj = this.parseDate(date)
      if (!dateObj) return 'Invalid date'
      
      return format(dateObj, formatStr)
    } catch (error) {
      return 'Invalid date'
    }
  }

  /**
   * Format relative time (e.g., "2 hours ago")
   */
  static formatRelative(date: Date | string | number): string {
    try {
      const dateObj = this.parseDate(date)
      if (!dateObj) return 'Invalid date'
      
      return formatDistanceToNow(dateObj, { addSuffix: true })
    } catch (error) {
      return 'Invalid date'
    }
  }

  /**
   * Format distance between two dates
   */
  static formatDistance(date1: Date | string | number, date2: Date | string | number): string {
    try {
      const dateObj1 = this.parseDate(date1)
      const dateObj2 = this.parseDate(date2)
      if (!dateObj1 || !dateObj2) return 'Invalid date'
      
      return formatDistance(dateObj1, dateObj2)
    } catch (error) {
      return 'Invalid date'
    }
  }

  /**
   * Format for display in UI
   */
  static formatForDisplay(date: Date | string | number): string {
    return this.format(date, DATE_FORMATS.DISPLAY)
  }

  /**
   * Format for API calls
   */
  static formatForAPI(date: Date | string | number): string {
    return this.format(date, DATE_FORMATS.API)
  }

  // =============================================
  // PARSING METHODS
  // =============================================

  /**
   * Parse various date formats into Date object
   */
  static parseDate(date: Date | string | number): Date | null {
    if (!date) return null

    try {
      if (date instanceof Date) {
        return isValid(date) ? date : null
      }
      
      if (typeof date === 'string') {
        // Try ISO format first
        const isoDate = parseISO(date)
        if (isValid(isoDate)) return isoDate
        
        // Try standard Date parsing
        const standardDate = new Date(date)
        return isValid(standardDate) ? standardDate : null
      }
      
      if (typeof date === 'number') {
        const numericDate = new Date(date)
        return isValid(numericDate) ? numericDate : null
      }
      
      return null
    } catch (error) {
      return null
    }
  }

  /**
   * Safe date validation
   */
  static isValidDate(date: any): boolean {
    const dateObj = this.parseDate(date)
    return dateObj !== null && isValid(dateObj)
  }

  // =============================================
  // MANIPULATION METHODS
  // =============================================

  /**
   * Add time to date
   */
  static add(date: Date | string | number, amount: number, unit: 'days' | 'hours' | 'minutes'): Date | null {
    const dateObj = this.parseDate(date)
    if (!dateObj) return null

    switch (unit) {
      case 'days':
        return addDays(dateObj, amount)
      case 'hours':
        return addHours(dateObj, amount)
      case 'minutes':
        return addMinutes(dateObj, amount)
      default:
        return dateObj
    }
  }

  /**
   * Subtract time from date
   */
  static subtract(date: Date | string | number, amount: number, unit: 'days' | 'hours' | 'minutes'): Date | null {
    const dateObj = this.parseDate(date)
    if (!dateObj) return null

    switch (unit) {
      case 'days':
        return subDays(dateObj, amount)
      case 'hours':
        return subHours(dateObj, amount)
      case 'minutes':
        return subMinutes(dateObj, amount)
      default:
        return dateObj
    }
  }

  // =============================================
  // COMPARISON METHODS
  // =============================================

  /**
   * Check if dates are the same day
   */
  static isSameDay(date1: Date | string | number, date2: Date | string | number): boolean {
    const dateObj1 = this.parseDate(date1)
    const dateObj2 = this.parseDate(date2)
    if (!dateObj1 || !dateObj2) return false
    
    return isSameDay(dateObj1, dateObj2)
  }

  /**
   * Check if date is after another date
   */
  static isAfter(date1: Date | string | number, date2: Date | string | number): boolean {
    const dateObj1 = this.parseDate(date1)
    const dateObj2 = this.parseDate(date2)
    if (!dateObj1 || !dateObj2) return false
    
    return isAfter(dateObj1, dateObj2)
  }

  /**
   * Check if date is before another date
   */
  static isBefore(date1: Date | string | number, date2: Date | string | number): boolean {
    const dateObj1 = this.parseDate(date1)
    const dateObj2 = this.parseDate(date2)
    if (!dateObj1 || !dateObj2) return false
    
    return isBefore(dateObj1, dateObj2)
  }

  // =============================================
  // RANGE METHODS
  // =============================================

  /**
   * Get start and end of day
   */
  static getDayRange(date: Date | string | number): { start: Date; end: Date } | null {
    const dateObj = this.parseDate(date)
    if (!dateObj) return null
    
    return {
      start: startOfDay(dateObj),
      end: endOfDay(dateObj)
    }
  }

  /**
   * Get start and end of week
   */
  static getWeekRange(date: Date | string | number): { start: Date; end: Date } | null {
    const dateObj = this.parseDate(date)
    if (!dateObj) return null
    
    return {
      start: startOfWeek(dateObj),
      end: endOfWeek(dateObj)
    }
  }

  /**
   * Get start and end of month
   */
  static getMonthRange(date: Date | string | number): { start: Date; end: Date } | null {
    const dateObj = this.parseDate(date)
    if (!dateObj) return null
    
    return {
      start: startOfMonth(dateObj),
      end: endOfMonth(dateObj)
    }
  }

  // =============================================
  // UTILITY METHODS
  // =============================================

  /**
   * Get current timestamp
   */
  static now(): Date {
    return new Date()
  }

  /**
   * Get current ISO string
   */
  static nowISO(): string {
    return new Date().toISOString()
  }

  /**
   * Calculate age from birthdate
   */
  static calculateAge(birthDate: Date | string | number): number | null {
    const birthDateObj = this.parseDate(birthDate)
    if (!birthDateObj) return null
    
    const today = new Date()
    const age = differenceInDays(today, birthDateObj) / 365.25
    return Math.floor(age)
  }

  /**
   * Get time difference in human readable format
   */
  static getTimeDifference(date1: Date | string | number, date2: Date | string | number): {
    days: number
    hours: number
    minutes: number
  } | null {
    const dateObj1 = this.parseDate(date1)
    const dateObj2 = this.parseDate(date2)
    if (!dateObj1 || !dateObj2) return null
    
    return {
      days: differenceInDays(dateObj1, dateObj2),
      hours: differenceInHours(dateObj1, dateObj2),
      minutes: differenceInMinutes(dateObj1, dateObj2)
    }
  }

  /**
   * Check if date is within range
   */
  static isWithinRange(
    date: Date | string | number,
    startDate: Date | string | number,
    endDate: Date | string | number
  ): boolean {
    const dateObj = this.parseDate(date)
    const startObj = this.parseDate(startDate)
    const endObj = this.parseDate(endDate)
    
    if (!dateObj || !startObj || !endObj) return false
    
    return !isBefore(dateObj, startObj) && !isAfter(dateObj, endObj)
  }

  // =============================================
  // BUSINESS LOGIC HELPERS
  // =============================================

  /**
   * Get business days between dates
   */
  static getBusinessDays(startDate: Date | string | number, endDate: Date | string | number): number {
    const startObj = this.parseDate(startDate)
    const endObj = this.parseDate(endDate)
    if (!startObj || !endObj) return 0

    let count = 0
    const current = new Date(startObj)
    
    while (current <= endObj) {
      const dayOfWeek = current.getDay()
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
        count++
      }
      current.setDate(current.getDate() + 1)
    }
    
    return count
  }

  /**
   * Get common date ranges for analytics
   */
  static getAnalyticsRanges(): {
    today: { start: Date; end: Date }
    yesterday: { start: Date; end: Date }
    thisWeek: { start: Date; end: Date }
    lastWeek: { start: Date; end: Date }
    thisMonth: { start: Date; end: Date }
    lastMonth: { start: Date; end: Date }
    last7Days: { start: Date; end: Date }
    last30Days: { start: Date; end: Date }
    last90Days: { start: Date; end: Date }
  } {
    const now = new Date()
    const yesterday = subDays(now, 1)
    const lastWeekStart = subDays(startOfWeek(now), 7)
    const lastMonthStart = subDays(startOfMonth(now), 1)

    return {
      today: this.getDayRange(now)!,
      yesterday: this.getDayRange(yesterday)!,
      thisWeek: this.getWeekRange(now)!,
      lastWeek: {
        start: lastWeekStart,
        end: endOfWeek(lastWeekStart)
      },
      thisMonth: this.getMonthRange(now)!,
      lastMonth: this.getMonthRange(lastMonthStart)!,
      last7Days: {
        start: subDays(now, 7),
        end: now
      },
      last30Days: {
        start: subDays(now, 30),
        end: now
      },
      last90Days: {
        start: subDays(now, 90),
        end: now
      }
    }
  }

  /**
   * Format date for different contexts
   */
  static formatForContext(date: Date | string | number, context: 'list' | 'detail' | 'relative' | 'short'): string {
    const dateObj = this.parseDate(date)
    if (!dateObj) return 'Invalid date'

    switch (context) {
      case 'list':
        return this.format(dateObj, DATE_FORMATS.SHORT)
      case 'detail':
        return this.format(dateObj, DATE_FORMATS.LONG)
      case 'relative':
        return this.formatRelative(dateObj)
      case 'short':
        return this.format(dateObj, 'MMM d')
      default:
        return this.format(dateObj)
    }
  }

  /**
   * Get timezone-aware date string
   */
  static getTimezoneDate(date: Date | string | number, timezone?: string): string {
    const dateObj = this.parseDate(date)
    if (!dateObj) return 'Invalid date'

    try {
      return dateObj.toLocaleString('en-US', {
        timeZone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      return this.format(dateObj, DATE_FORMATS.DATETIME)
    }
  }
}

// =============================================
// CONVENIENCE EXPORTS (TREE-SHAKEABLE)
// =============================================

// Individual functions for tree shaking
export const formatDate = DateUtils.format
export const formatRelativeDate = DateUtils.formatRelative
export const parseDate = DateUtils.parseDate
export const isValidDate = DateUtils.isValidDate
export const addTime = DateUtils.add
export const subtractTime = DateUtils.subtract
export const isSameDayDate = DateUtils.isSameDay
export const isAfterDate = DateUtils.isAfter
export const isBeforeDate = DateUtils.isBefore
export const getDayRange = DateUtils.getDayRange
export const getWeekRange = DateUtils.getWeekRange
export const getMonthRange = DateUtils.getMonthRange
export const getAnalyticsRanges = DateUtils.getAnalyticsRanges
export const formatForContext = DateUtils.formatForContext
export const getTimezoneDate = DateUtils.getTimezoneDate

// Default export
export default DateUtils
