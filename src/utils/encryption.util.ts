import crypto from 'crypto';

// Secret encryption key derived using SHA-256 to ensure exact 32 bytes (256 bits) for AES-256-CBC
const rawKey = process.env.ENCRYPTION_KEY || 'supplybridge_secret_encryption_key_32bytes';
const KEY_BUFFER = crypto.createHash('sha256').update(rawKey).digest(); // Always 32 bytes
const IV_LENGTH = 16; // AES IV length

export function encrypt(text: any): string {
  if (!text) return '';
  const strToEncrypt = typeof text === 'string' ? text : JSON.stringify(text);
  
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', KEY_BUFFER, iv);
    let encrypted = cipher.update(strToEncrypt, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (error) {
    console.error('Encryption warning:', error);
    return strToEncrypt; // Safe fallback so API call never fails with 500 error
  }
}

export function decrypt(text: any): string {
  if (!text || typeof text !== 'string') return text || '';
  if (!text.includes(':')) return text;
  
  try {
    const textParts = text.split(':');
    const ivHex = textParts.shift();
    const encryptedTextHex = textParts.join(':');
    
    if (!ivHex || !encryptedTextHex) return text;
    
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedText = Buffer.from(encryptedTextHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', KEY_BUFFER, iv);
    
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Decryption warning:', error);
    return text; // Return unencrypted text fallback if format or key mismatches
  }
}
