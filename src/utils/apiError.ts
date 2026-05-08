export function getApiErrorMessage(err: any, defaultMessage: string = '未知錯誤'): string {
  // 1. @hey-api error payload
  if (err && typeof err === 'object' && err.error) {
    const errorBody = err.error;
    
    if (errorBody.errors && typeof errorBody.errors === 'object') {
      const errorMessages: string[] = [];
      for (const key in errorBody.errors) {
        const val = errorBody.errors[key];
        if (Array.isArray(val)) {
          errorMessages.push(...val);
        } else if (typeof val === 'string') {
          errorMessages.push(val);
        }
      }
      if (errorMessages.length > 0) return errorMessages.join('\n');
    }
    
    if (errorBody.message) return errorBody.message;
    if (errorBody.title) return errorBody.title;
    if (errorBody.detail) return errorBody.detail;
  }

  // 2. axios or similar .response.data structure
  if (err?.response?.data) {
    const data = err.response.data;
    if (data.errors && typeof data.errors === 'object') {
      const errorMessages: string[] = [];
      for (const key in data.errors) {
        const val = data.errors[key];
        if (Array.isArray(val)) {
          errorMessages.push(...val);
        } else if (typeof val === 'string') {
          errorMessages.push(val);
        }
      }
      if (errorMessages.length > 0) return errorMessages.join('\n');
    }
    if (data.message) return data.message;
    if (data.title) return data.title;
    if (data.detail) return data.detail;
  }

  // 3. Fallback to standard Error message
  if (err?.message) return err.message;
  if (typeof err === 'string') return err;

  return defaultMessage;
}
