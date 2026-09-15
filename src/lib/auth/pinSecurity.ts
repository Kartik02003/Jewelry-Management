/**
 * PIN Security utilities using native Web Crypto API (SHA-256)
 */

const PIN_STORAGE_KEY = 'jewelry_app_pin_hash';
const PIN_SALT_KEY = 'jewelry_app_pin_salt';
const AUTO_LOCK_STORAGE_KEY = 'jewelry_app_autolock_minutes';

/**
 * Generates a random cryptographic salt if none exists
 */
export function getOrCreatePinSalt(): string {
  let salt = localStorage.getItem(PIN_SALT_KEY);
  if (!salt) {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    salt = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(PIN_SALT_KEY, salt);
  }
  return salt;
}

/**
 * Hashes a 4-digit PIN with salt using SHA-256
 */
export async function hashPin(pin: string, salt?: string): Promise<string> {
  const effectiveSalt = salt || getOrCreatePinSalt();
  const encoder = new TextEncoder();
  const data = encoder.encode(`${pin}:${effectiveSalt}:jewelry_security_v1`);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Saves a new PIN hash to persistent storage
 */
export async function savePin(pin: string): Promise<void> {
  const salt = getOrCreatePinSalt();
  const hash = await hashPin(pin, salt);
  localStorage.setItem(PIN_STORAGE_KEY, hash);
}

/**
 * Verifies if entered PIN matches the stored hash
 */
export async function verifyPin(pin: string): Promise<boolean> {
  const storedHash = localStorage.getItem(PIN_STORAGE_KEY);
  if (!storedHash) return false;
  const salt = getOrCreatePinSalt();
  const computedHash = await hashPin(pin, salt);
  return computedHash === storedHash;
}

/**
 * Checks if a PIN has been set
 */
export function isPinSet(): boolean {
  return Boolean(localStorage.getItem(PIN_STORAGE_KEY));
}

/**
 * Clears stored PIN (used during full logout/reset)
 */
export function clearPin(): void {
  localStorage.removeItem(PIN_STORAGE_KEY);
  localStorage.removeItem(PIN_SALT_KEY);
}

/**
 * Gets configured auto-lock timeout in minutes (default 5 minutes)
 */
export function getAutoLockMinutes(): number {
  const val = localStorage.getItem(AUTO_LOCK_STORAGE_KEY);
  if (val === null) return 5;
  const num = Number(val);
  return isNaN(num) ? 5 : num;
}

/**
 * Saves auto-lock timeout in minutes (0 means never)
 */
export function setAutoLockMinutes(minutes: number): void {
  localStorage.setItem(AUTO_LOCK_STORAGE_KEY, minutes.toString());
}
