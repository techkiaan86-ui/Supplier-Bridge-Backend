import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'supplybridge_secret_encryption_key_32bytes!'; // 32 characters
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

export function encryptSecret(text: string): string {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    // Ensure key is 32 bytes
    const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption failed:', error);
    return text;
  }
}

export function decryptSecret(text: string): string {
  try {
    if (!text.includes(':')) return text;
    const [ivHex, encryptedHex] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    return '••••••••';
  }
}

export function generateRandomKey(prefix = 'sb_live_'): { keyPrefix: string; secret: string; fullKey: string } {
  const randomBytes = crypto.randomBytes(24).toString('hex');
  const fullKey = `${prefix}${randomBytes}`;
  const keyPrefix = `${prefix}${randomBytes.substring(0, 8)}...${randomBytes.substring(randomBytes.length - 4)}`;
  return {
    keyPrefix,
    secret: randomBytes,
    fullKey,
  };
}
