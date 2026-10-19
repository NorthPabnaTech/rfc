import dayjs, { Dayjs } from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

import { logger } from './logger';

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);
dayjs.extend(customParseFormat);
dayjs.extend(duration);

// Re-export the configured singleton so consumers get one with all plugins loaded.
export { dayjs };

// Common date format presets
export const DATE_FORMATS = {
  // Date formats
  SHORT_DATE: 'MM/DD/YYYY', // 12/24/2025
  MEDIUM_DATE: 'MMM DD, YYYY', // Dec 24, 2025
  LONG_DATE: 'MMMM DD, YYYY', // December 24, 2025
  ISO_DATE: 'YYYY-MM-DD', // 2025-12-24
  FULL_DATE: 'dddd, MMMM DD, YYYY', // Wednesday, December 24, 2025
  DISPLAY_DATE: 'DD MMM, YYYY', // 24 Dec, 2025

  // Time formats
  TIME_12H: 'hh:mm A', // 02:30 PM
  TIME_24H: 'HH:mm', // 14:30
  TIME_12H_SECONDS: 'hh:mm:ss A', // 02:30:45 PM
  TIME_24H_SECONDS: 'HH:mm:ss', // 14:30:45

  // Combined date and time formats
  SHORT_DATETIME: 'MM/DD/YYYY hh:mm A', // 12/24/2025 02:30 PM
  MEDIUM_DATETIME: 'MMM DD, YYYY hh:mm A', // Dec 24, 2025 02:30 PM
  LONG_DATETIME: 'MMMM DD, YYYY hh:mm A', // December 24, 2025 02:30 PM
  FULL_DATETIME: 'dddd, MMMM DD, YYYY hh:mm A', // Wednesday, December 24, 2025 02:30 PM
  ISO_DATETIME: 'YYYY-MM-DD HH:mm:ss', // 2025-12-24 14:30:45

  // Special formats
  RELATIVE: 'relative', // 2 hours ago, in 3 days
  TIMESTAMP: 'timestamp', // Unix timestamp
} as const;

type DateInput = string | Date | number | null | undefined;
type FormatType = (typeof DATE_FORMATS)[keyof typeof DATE_FORMATS] | string;

/**
 * Format a date with the specified format
 * @param date - Date input (string, Date object, timestamp, or null/undefined for current date)
 * @param format - Format string or preset from DATE_FORMATS
 * @param timezone - Optional timezone (e.g., 'America/New_York', 'Asia/Tokyo')
 * @returns Formatted date string
 */
export const formatDate = (
  date?: DateInput | Dayjs,
  format: FormatType = DATE_FORMATS.MEDIUM_DATE,
  timezone?: string,
): string => {
  try {
    const d = dayjs(date || new Date());

    // Handle special formats
    if (format === DATE_FORMATS.RELATIVE) {
      return d.fromNow();
    }

    if (format === DATE_FORMATS.TIMESTAMP) {
      return d.valueOf().toString();
    }

    // Apply timezone if specified
    if (timezone) {
      return d.tz(timezone).format(format);
    }

    return d.format(format);
  } catch (error) {
    logger.error('Error formatting date:', error);
    return '--';
  }
};

/**
 * Format time only
 * @param date - Date input
 * @param format - Time format (12h or 24h)
 * @param timezone - Optional timezone
 * @returns Formatted time string
 */
export const formatTime = (
  date?: DateInput,
  format: 'TIME_12H' | 'TIME_24H' | 'TIME_12H_SECONDS' | 'TIME_24H_SECONDS' = 'TIME_12H',
  timezone?: string,
): string => {
  return formatDate(date, DATE_FORMATS[format], timezone);
};

/**
 * Format datetime with date and time
 * @param date - Date input
 * @param style - Style preset ('short', 'medium', 'long', 'full', 'iso')
 * @param timezone - Optional timezone
 * @returns Formatted datetime string
 */
export const formatDateTime = (
  date?: DateInput,
  style: 'short' | 'medium' | 'long' | 'full' | 'iso' = 'medium',
  timezone?: string,
): string => {
  const formatMap = {
    short: DATE_FORMATS.SHORT_DATETIME,
    medium: DATE_FORMATS.MEDIUM_DATETIME,
    long: DATE_FORMATS.LONG_DATETIME,
    full: DATE_FORMATS.FULL_DATETIME,
    iso: DATE_FORMATS.ISO_DATETIME,
  };

  return formatDate(date, formatMap[style], timezone);
};

/**
 * Get relative time (e.g., "2 hours ago", "in 3 days")
 * @param date - Date input
 * @returns Relative time string
 */
export const formatRelative = (date?: DateInput): string => {
  return formatDate(date, DATE_FORMATS.RELATIVE);
};

/**
 * Get Unix timestamp
 * @param date - Date input
 * @returns Unix timestamp as string
 */
export const getTimestamp = (date?: DateInput): string => {
  return formatDate(date, DATE_FORMATS.TIMESTAMP);
};

/**
 * Check if a date is valid
 * @param date - Date input to validate
 * @returns Boolean indicating if date is valid
 */
export const isValidDate = (date: DateInput): boolean => {
  return dayjs(date).isValid();
};

/**
 * Get current date/time in specified format
 * @param format - Format string or preset
 * @param timezone - Optional timezone
 * @returns Formatted current date/time
 */
export const getCurrentDateTime = (
  format: FormatType = DATE_FORMATS.MEDIUM_DATETIME,
  timezone?: string,
): string => {
  return formatDate(new Date(), format, timezone);
};

/**
 * Format date range with smart year/month handling
 * @param startDate - Start date
 * @param endDate - End date
 * @param options - Formatting options
 * @returns Formatted date range string
 */
export const formatDateRange = (
  startDate?: DateInput,
  endDate?: DateInput,
  options?: { showYearIfSame?: boolean; separator?: string },
): string => {
  if (!startDate || !endDate) return '';
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  const showYearIfSame = options?.showYearIfSame ?? true;
  const separator = options?.separator ?? ' - ';

  if (start.year() !== end.year()) {
    return `${start.format('MMM D, YYYY')}${separator}${end.format('MMM D, YYYY')}`;
  }

  if (showYearIfSame) {
    return `${start.format('MMM D')}${separator}${end.format('MMM D, YYYY')}`;
  }

  if (start.month() === end.month()) {
    return `${start.format('MMM D')}${separator}${end.format('D')}`;
  }
  return `${start.format('MMM D')}${separator}${end.format('MMM D')}`;
};

/**
 * Format duration in minutes to human readable string (e.g., "2h 30m")
 * @param minutes - Duration in minutes
 * @returns Formatted duration string
 */
export function formatDuration(minutes: number): string {
  const d = dayjs.duration(minutes, 'minutes');
  const hours = Math.floor(d.asHours());
  const mins = d.minutes();

  if (hours && mins) return `${hours}h ${mins}m`;
  if (hours) return `${hours}h`;
  if (mins) return `${mins}m`;
  return '0m';
}

/**
 * Format 24h time string to 12h format
 * @param time24 - Time string in 24h format (e.g., "14:30")
 * @returns Formatted 12h time string
 */
export const formatTo12Hour = (time24: string): string =>
  dayjs(`2000-01-01 ${time24}`).format('h:mm A');

/**
 * Format seconds to time string (e.g., "5:03")
 * @param seconds - Seconds to format
 * @returns Formatted time string
 */
export const formatSecToTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Disable all past dates (before today)
 * @param current - Current date being evaluated
 * @returns true if date should be disabled
 */
export const disablePastDates = (current: Dayjs): boolean => {
  return current && current < dayjs().startOf('day');
};

/**
 * Disable dates before a specific date
 * @param current - Current date being evaluated
 * @param fromDate - Minimum allowed date
 * @returns true if date should be disabled
 */
export const disableBeforeDate = (current: Dayjs, fromDate: Dayjs): boolean => {
  return current && current < fromDate.startOf('day');
};

/**
 * Disable past times for the current day only
 * @param date - Selected date
 * @returns Object with disabled hours and minutes functions
 */
export const disablePastTimes = (date: Dayjs | null) => {
  if (!date) return {};

  const now = dayjs();

  // Only disable times if the selected date is today
  if (!date.isSame(now, 'day')) return {};

  const hours = Array.from({ length: now.hour() }, (_, i) => i);
  const minutes = Array.from({ length: now.minute() }, (_, i) => i);

  return {
    disabledHours: () => hours,
    disabledMinutes: (selectedHour: number) => (selectedHour === now.hour() ? minutes : []),
  };
};

/** The store's timezone — all customer/admin-facing dates render in Dhaka time. */
export const STORE_TZ = 'Asia/Dhaka';

/** e.g. "02 Oct 2026" in Dhaka time (safe on the server, which runs in UTC). */
export const formatStoreDate = (date?: DateInput, format = 'DD MMM YYYY'): string =>
  formatDate(date, format as FormatType, STORE_TZ);

/** e.g. "02 Oct 2026, 4:35 PM" in Dhaka time. */
export const formatStoreDateTime = (date?: DateInput, format = 'DD MMM YYYY, h:mm A'): string =>
  formatDate(date, format as FormatType, STORE_TZ);
