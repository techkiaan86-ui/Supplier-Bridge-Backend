/**
 * Security Credential Masking Sanitizer
 * Ensures passwords, secret keys, and API tokens are never exposed in plain text in logs or API responses.
 */

const SENSITIVE_KEYS = [
  'password',
  'secret',
  'secretkey',
  'apikey',
  'encryptedsecret',
  'encryptedapikey',
  'encryptedaccesstoken',
  'ftppassword',
  'accesstoken',
  'token',
];

export function maskCredential(val: string): string {
  if (!val) return '••••••••••••';
  if (val.startsWith('sb_live_') || val.startsWith('shpat_')) {
    return `${val.substring(0, 10)}••••••••${val.substring(val.length - 4)}`;
  }
  return '••••••••••••';
}

export function sanitizeObject<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject) as unknown as T;
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some((k) => lowerKey.includes(k))) {
      if (typeof value === 'string' && value.trim() !== '') {
        sanitized[key] = maskCredential(value);
      } else {
        sanitized[key] = '••••••••••••';
      }
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}
