/**
 * PIN Security utilities using native Web Crypto API (SHA-256)
 * Supports user-scoped PIN storage so each user has their own independent 4-digit PIN.
 */

function getPinStorageKey(userId?: string): string {
  return userId ? `jewelry_app_pin_hash_${userId}` : 'jewelry_app_pin_hash';
}

function getPinSaltKey(userId?: string): string {
  return userId ? `jewelry_app_pin_salt_${userId}` : 'jewelry_app_pin_salt';
}

function getAutoLockStorageKey(userId?: string): string {
  return userId ? `jewelry_app_autolock_minutes_${userId}` : 'jewelry_app_autolock_minutes';
}

/**
 * Generates a random cryptographic salt if none exists for this user
 */
export function getOrCreatePinSalt(userId?: string): string {
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
export async function hashPin(pin: string, salt?: string): Promise<string> {
  const effectiveSalt = salt || getOrCreatePinSalt();
  const encoder = new TextEncoder();
  const data = encoder.encode(`${pin}:${effectiveSalt}:jewelry_security_v1`);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Saves a new PIN hash to persistent storage for a specific user
 */
export async function savePin(pin: string, userId?: string): Promise<{ hash: string; salt: string }> {
  const salt = getOrCreatePinSalt(userId);
  const hash = await hashPin(pin, salt);
  localStorage.setItem(getPinStorageKey(userId), hash);
  return { hash, salt };
}

/**
 * Verifies if entered PIN matches the stored hash for this user
 */
export async function verifyPin(pin: string, userId?: string): Promise<boolean> {
  let storedHash = localStorage.getItem(getPinStorageKey(userId));
  let salt = localStorage.getItem(getPinSaltKey(userId));

  // Backward compatibility check for older single-user key
  if (!storedHash && userId) {
    storedHash = localStorage.getItem('jewelry_app_pin_hash');
    salt = localStorage.getItem('jewelry_app_pin_salt');
  }

  if (!storedHash) return false;
  const effectiveSalt = salt || getOrCreatePinSalt(userId);
  const computedHash = await hashPin(pin, effectiveSalt);
  return computedHash === storedHash;
}

/**
 * Checks if a PIN has been set for this user
 */
export function isPinSet(userId?: string): boolean {
  if (userId && localStorage.getItem(getPinStorageKey(userId))) {
    return true;
  }
  // Check default/legacy key
  return Boolean(localStorage.getItem('jewelry_app_pin_hash'));
}

/**
 * Sets raw PIN hash and salt from cloud into local storage for this user
 */
export function setCachedPinCredentials(userId: string, hash: string, salt: string): void {
  localStorage.setItem(getPinStorageKey(userId), hash);
  localStorage.setItem(getPinSaltKey(userId), salt);
}

/**
 * Clears stored PIN for this user
 */
export function clearPin(userId?: string): void {
  if (userId) {
    localStorage.removeItem(getPinStorageKey(userId));
    localStorage.removeItem(getPinSaltKey(userId));
  } else {
    localStorage.removeItem('jewelry_app_pin_hash');
    localStorage.removeItem('jewelry_app_pin_salt');
  }
}

/**
 * Gets configured auto-lock timeout in minutes (default 5 minutes)
 */
export function getAutoLockMinutes(userId?: string): number {
  const val = localStorage.getItem(getAutoLockStorageKey(userId));
  if (val === null) {
    const legacyVal = localStorage.getItem('jewelry_app_autolock_minutes');
    if (legacyVal !== null) {
      const num = Number(legacyVal);
      return isNaN(num) ? 5 : num;
    }
    return 5;
  }
  const num = Number(val);
  return isNaN(num) ? 5 : num;
}

/**
 * Saves auto-lock timeout in minutes (0 means never)
 */
export function setAutoLockMinutes(minutes: number, userId?: string): void {
  localStorage.setItem(getAutoLockStorageKey(userId), minutes.toString());
}
