/**
 * Centralized logging seam. Callers may only provide a stable operation code;
 * exception, response, request, and credential data must never be logged.
 */
export type LogOperationCode = string;

const isDevelopment = import.meta.env.DEV;

export const logger = {
  debug(operation: LogOperationCode): void {
    if (isDevelopment) {
      console.debug(operation);
    }
  },
  warn(operation: LogOperationCode): void {
    console.warn(operation);
  },
  error(operation: LogOperationCode): void {
    console.error(operation);
  },
};
