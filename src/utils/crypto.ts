// End-to-End Encryption utility using Web Crypto API (AES-GCM 256-bit with PBKDF2)

const ENCRYPTION_PREFIX = 'e2e:v1:';

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function encryptText(plaintext: string, secretKey: string): Promise<string> {
  if (!secretKey) return plaintext;
  try {
    const enc = new TextEncoder();
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(secretKey, salt);

    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      enc.encode(plaintext)
    );

    const saltB64 = bufferToBase64(salt);
    const ivB64 = bufferToBase64(iv);
    const cipherB64 = bufferToBase64(encrypted);

    return `${ENCRYPTION_PREFIX}${saltB64}:${ivB64}:${cipherB64}`;
  } catch (err) {
    console.error('Encryption failed:', err);
    return plaintext;
  }
}

export async function decryptText(encryptedText: string, secretKey: string): Promise<{ text: string; decrypted: boolean }> {
  if (!encryptedText.startsWith(ENCRYPTION_PREFIX)) {
    return { text: encryptedText, decrypted: false };
  }

  if (!secretKey) {
    return { text: '[🔒 End-to-End Encrypted Message - Enter Secret Key to Decrypt]', decrypted: false };
  }

  try {
    const raw = encryptedText.substring(ENCRYPTION_PREFIX.length);
    const [saltB64, ivB64, cipherB64] = raw.split(':');

    if (!saltB64 || !ivB64 || !cipherB64) {
      return { text: '[Encrypted Message: Malformed payload]', decrypted: false };
    }

    const salt = base64ToBuffer(saltB64);
    const iv = base64ToBuffer(ivB64);
    const cipher = base64ToBuffer(cipherB64);

    const key = await deriveKey(secretKey, salt);

    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as BufferSource,
      },
      key,
      cipher as BufferSource
    );

    const dec = new TextDecoder();
    return { text: dec.decode(decrypted), decrypted: true };
  } catch (err) {
    return { text: '[🔒 Encrypted Message - Invalid Key]', decrypted: false };
  }
}

export function isEncryptedFormat(text: string): boolean {
  return text.startsWith(ENCRYPTION_PREFIX);
}
