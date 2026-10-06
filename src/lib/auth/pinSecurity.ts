/**
 * PIN Security utilities using native Web Crypto API (SHA-256)
 * Strictly user-scoped PIN storage so each user has their own independent 4-digit PIN.
 */

function getPinStorageKey(userId: string): string {
  return `jewelry_app_pin_hash_${userId}`;
}

function getPinSaltKey(userId: string): string {
  return `jewelry_app_pin_salt_${userId}`;
}

function getAutoLockStorageKey(userId: string): string {
  return `jewelry_app_autolock_minutes_${userId}`;
}

/**
 * Generates a random cryptographic salt if none exists for this user
 */
export function getOrCreatePinSalt(userId: string): string {
  const saltKey = getPinSaltKey(userId);
  let salt = localStorage.getItem(saltKey);
  if (!salt) {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    salt = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(saltKey, salt);
  }
  return salt;
}

/**
 * Hashes a 4-digit PIN with salt using SHA-256
 */
export async function hashPin(pin: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${pin}:${salt}:jewelry_security_v1`);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Saves a new PIN hash to persistent storage for a specific user
 */
export async function savePin(pin: string, userId: string): Promise<{ hash: string; salt: string }> {
  const salt = getOrCreatePinSalt(userId);
  const hash = await hashPin(pin, salt);
  localStorage.setItem(getPinStorageKey(userId), hash);
  // Clean up any legacy un-scoped key
  localStorage.removeItem('jewelry_app_pin_hash');
  localStorage.removeItem('jewelry_app_pin_salt');
  return { hash, salt };
}

/**
 * Verifies if entered PIN matches the stored hash for this specific user
 */
export async function verifyPin(pin: string, userId?: string): Promise<boolean> {
  if (!userId) return false;
  const storedHash = localStorage.getItem(getPinStorageKey(userId));
  const salt = localStorage.getItem(getPinSaltKey(userId));

  if (!storedHash || !salt) return false;
  const computedHash = await hashPin(pin, salt);
  return computedHash === storedHash;
}

/**
 * Checks if a PIN has been set for this specific user
 */
export function isPinSet(userId?: string): boolean {
  if (!userId) return false;
  return Boolean(localStorage.getItem(getPinStorageKey(userId)));
}

/**
 * Sets raw PIN hash and salt from cloud into local storage for this user
 */
export function setCachedPinCredentials(userId: string, hash: string, salt: string): void {
  localStorage.setItem(getPinStorageKey(userId), hash);
  localStorage.setItem(getPinSaltKey(userId), salt);
  // Clean up legacy keys
  localStorage.removeItem('jewelry_app_pin_hash');
  localStorage.removeItem('jewelry_app_pin_salt');
}

/**
 * Clears stored PIN for this user
 */
export function clearPin(userId?: string): void {
  if (userId) {
    localStorage.removeItem(getPinStorageKey(userId));
    localStorage.removeItem(getPinSaltKey(userId));
  }
  localStorage.removeItem('jewelry_app_pin_hash');
  localStorage.removeItem('jewelry_app_pin_salt');
}

/**
 * Gets configured auto-lock timeout in minutes (default 5 minutes)
 */
export function getAutoLockMinutes(userId?: string): number {
  if (!userId) return 5;
  const val = localStorage.getItem(getAutoLockStorageKey(userId));
  if (val === null) return 5;
  const num = Number(val);
  return isNaN(num) ? 5 : num;
}

/**
 * Saves auto-lock timeout in minutes (0 means never)
 */
export function setAutoLockMinutes(minutes: number, userId?: string): void {
  if (userId) {
    localStorage.setItem(getAutoLockStorageKey(userId), minutes.toString());
  }
}
