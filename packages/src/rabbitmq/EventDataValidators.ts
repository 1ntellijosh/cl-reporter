/**
 * Runtime validators for event data. Use these to validate envelope.data against EventDataContracts
 * before handling (interfaces are type-only and not available at runtime).
 *
 * @since app-skaffold--JP
 */
import { EventTypesEnum } from '../enums/EventTypes';
import type {
  ReportGenerateData,
  TokenUpdateRefreshTokenData,
} from '../interfaces/EventDataContracts';

export const ValidationHelpers = {
  isObject: (x: unknown): x is Record<string, unknown> => {
    return x !== null && typeof x === 'object' && !Array.isArray(x);
  },
  hasObject: (obj: Record<string, unknown>, key: string): boolean => {
    return obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key]);
  },
  hasArray: (obj: Record<string, unknown>, key: string): boolean => {
    return Array.isArray(obj[key]);
  },
  hasString: (obj: Record<string, unknown>, key: string): boolean => {
    return typeof obj[key] === 'string';
  },
  hasNumber: (obj: Record<string, unknown>, key: string): boolean => {
    return typeof obj[key] === 'number';
  },
  hasBoolean: (obj: Record<string, unknown>, key: string): boolean => {
    return typeof obj[key] === 'boolean';
  },
  /** Accepts a Date instance or a valid ISO 8601 date string (e.g. from JSON). */
  hasDate: (obj: Record<string, unknown>, key: string): boolean => {
    const value = obj[key];

    if (value instanceof Date) return !isNaN(value.getTime());

    if (typeof value !== 'string') return false;

    const parsedValue = Date.parse(value);
    return !isNaN(parsedValue);
  },
  hasEmail: (obj: Record<string, unknown>, key: string): boolean => {
    return typeof obj[key] === 'string' && obj[key].includes('@');
  },
  hasPhone: (obj: Record<string, unknown>, key: string): boolean => {
    return typeof obj[key] === 'string' && obj[key].match(/^\d{10}$/) !== null;
  },
  /** eNum: TypeScript enum object (e.g. OrderStatusEnum). Checks obj[key] is one of the enum values. */
  hasEnum: (obj: Record<string, unknown>, key: string, eNum: Record<string, string | number>): boolean => {
    const values = Object.values(eNum);
    return values.includes(obj[key] as string | number);
  },
} as const;

export function validateReportGenerateData(data: unknown): data is ReportGenerateData {
  return ValidationHelpers.isObject(data) && ValidationHelpers.hasString(data, 'reportDefinitionId');
}

export function validateTokenUpdateRefreshTokenData(data: unknown): data is TokenUpdateRefreshTokenData {
  return ValidationHelpers.isObject(data) && ValidationHelpers.hasString(data, 'merchantId') && ValidationHelpers.hasString(data, 'refreshToken');
}

export type EventDataValidator = (data: unknown) => boolean;

/**
 * Map event type → validator so incoming envelope.data can be validated before dispatch.
 */
export const EventDataValidators: Partial<Record<EventTypesEnum, EventDataValidator>> = {
  [EventTypesEnum.TOKEN_UPDATE_REFRESH_TOKEN]: validateTokenUpdateRefreshTokenData,
  [EventTypesEnum.REPORT_GENERATE]: validateReportGenerateData,
};
