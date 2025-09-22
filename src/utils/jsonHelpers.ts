/**
 * Utility functions for JSON processing and comparison
 */

export const formatJsonPath = (path: string): string => {
  return path.replace(/\./g, ' → ');
};

export const truncateValue = (value: any, maxLength: number = 50): string => {
  const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
  return stringValue.length > maxLength 
    ? `${stringValue.substring(0, maxLength)}...` 
    : stringValue;
};

export const getValueType = (value: any): string => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
};

export const isValidJson = (str: string): boolean => {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
};

export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

export const flattenObject = (obj: any, prefix: string = ''): Record<string, any> => {
  const flattened: Record<string, any> = {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        Object.assign(flattened, flattenObject(obj[key], newKey));
      } else {
        flattened[newKey] = obj[key];
      }
    }
  }
  
  return flattened;
};