import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { 
  verifyPin, 
  savePin, 
  isPinSet, 
  clearPin, 
  setCachedPinCredentials,
  getAutoLockMinutes, 
  setAutoLockMinutes as persistAutoLockMinutes 
} from '../lib/auth/pinSecurity';

interface AuthUser {
  email: string;
  id?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLocked: boolean;
  hasPin: boolean;
  autoLockMinutes: number;
  isLoading: boolean;
  isCloudConnected: boolean;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  setupPin: (pin: string) => Promise<void>;
  unlockWithPin: (pin: string) => Promise<boolean>;
  unlockWithPassword: (password: string) => Promise<boolean>;
  lockNow: () => void;
  changePin: (newPin: string) => Promise<void>;
  updateAutoLockTimeout: (minutes: number) => void;
  signOut: () => Promise<void>;
}

const LOCAL_MASTER_AUTH_KEY = 'jewelry_local_master_auth';
const LOCAL_MASTER_PASS_KEY = 'jewelry_local_master_password';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isCloud = isSupabaseConfigured() && Boolean(supabase);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [hasPin, setHasPin] = useState<boolean>(false);
  const [autoLockMinutes, setAutoLockMinutesState] = useState<number>(5);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to get identifier for the active user
  const getUserKey = (u?: AuthUser | null): string | undefined => {
    return u?.id || u?.email;
  };

  // Lock the screen
  const lockNow = useCallback(() => {
    const userKey = getUserKey(user);
    if (isPinSet(userKey)) {
      setIsLocked(true);
    }
  }, [user]);

  // Reset inactivity timer
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }

    const minutes = autoLockMinutes;
    if (minutes > 0 && isAuthenticated && !isLocked && hasPin) {
      idleTimerRef.current = setTimeout(() => {
        setIsLocked(true);
      }, minutes * 60 * 1000);
    }
  }, [autoLockMinutes, isAuthenticated, isLocked, hasPin]);

  // Sync PIN configuration from Supabase user_security table if not yet cached locally
  const checkAndSyncUserPin = async (userObj: AuthUser): Promise<boolean> => {
    const userKey = getUserKey(userObj);
    if (!userKey) return false;

    // 1. Check local storage for this specific user
    if (isPinSet(userKey)) {
      setAutoLockMinutesState(getAutoLockMinutes(userKey));
      return true;
    }

    // 2. If cloud is connected, check user_security table for this user_id
    if (isCloud && supabase && userObj.id) {
      try {
        const { data: secData, error } = await supabase
          .from('user_security')
          .select('pin_hash, pin_salt, auto_lock_minutes')
          .eq('user_id', userObj.id)
          .maybeSingle();

        if (!error && secData?.pin_hash && secData?.pin_salt) {
          setCachedPinCredentials(userKey, secData.pin_hash, secData.pin_salt);
          if (secData.auto_lock_minutes !== undefined && secData.auto_lock_minutes !== null) {
            persistAutoLockMinutes(secData.auto_lock_minutes, userKey);
            setAutoLockMinutesState(secData.auto_lock_minutes);
          }
          return true;
        }
      } catch (err) {
        console.warn('Could not sync user_security from cloud:', err);
      }
    }

    // 3. New user without a PIN!
    return false;
  };

  // Initial Auth Check
  useEffect(() => {
    const initAuth = async () => {
      try {
        setIsLoading(true);

        // Clean any old legacy un-scoped PIN keys to avoid leaking between users
        localStorage.removeItem('jewelry_app_pin_hash');
        localStorage.removeItem('jewelry_app_pin_salt');

        if (isCloud && supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const authUser: AuthUser = { email: session.user.email || '', id: session.user.id };
            setUser(authUser);
            setIsAuthenticated(true);
            const pinConfigured = await checkAndSyncUserPin(authUser);
            setHasPin(pinConfigured);
            setIsLocked(pinConfigured); // Lock if PIN exists, otherwise leave unlocked for PIN setup!
          } else {
            setIsAuthenticated(false);
            setUser(null);
            setHasPin(false);
            setIsLocked(false);
          }
        } else {
          // Local/offline mode check
          const localAuth = localStorage.getItem(LOCAL_MASTER_AUTH_KEY);
          if (localAuth) {
            const authUser: AuthUser = { email: localAuth };
            setUser(authUser);
            setIsAuthenticated(true);
            const pinConfigured = isPinSet(getUserKey(authUser));
            setHasPin(pinConfigured);
            setIsLocked(pinConfigured);
          } else {
            setIsAuthenticated(false);
            setUser(null);
            setHasPin(false);
            setIsLocked(false);
          }
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Supabase auth state listener
    if (isCloud && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          const authUser: AuthUser = { email: session.user.email || '', id: session.user.id };
          setUser(authUser);
          setIsAuthenticated(true);
          const pinConfigured = await checkAndSyncUserPin(authUser);
          setHasPin(pinConfigured);
          setIsLocked(pinConfigured);
        } else {
          setUser(null);
          setIsAuthenticated(false);
          setHasPin(false);
          setIsLocked(false);
        }
      });
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [isCloud]);

  // Idle tracking event listeners
  useEffect(() => {
    if (!isAuthenticated || isLocked || !hasPin) return;

    const activityEvents = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
    const handleActivity = () => resetIdleTimer();

    activityEvents.forEach(evt => window.addEventListener(evt, handleActivity, { passive: true }));
    resetIdleTimer();

    // Lock on page visibility change (e.g. switching browser tab or locking phone)
    const handleVisibilityChange = () => {
      if (document.hidden && autoLockMinutes > 0) {
        setIsLocked(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      activityEvents.forEach(evt => window.removeEventListener(evt, handleActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [isAuthenticated, isLocked, hasPin, autoLockMinutes, resetIdleTimer]);

  // 1. Sign In with Email and Password
  const signInWithPassword = async (email: string, pass: string) => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) throw new Error('Email is required');
    if (!pass) throw new Error('Password is required');

    // Clean legacy global keys
    localStorage.removeItem('jewelry_app_pin_hash');
    localStorage.removeItem('jewelry_app_pin_salt');

    if (isCloud && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: pass,
      });
      if (error) throw error;
      const authUser: AuthUser = { email: data.user.email || trimmedEmail, id: data.user.id };
      setUser(authUser);
      setIsAuthenticated(true);
      const pinConfigured = await checkAndSyncUserPin(authUser);
      setHasPin(pinConfigured);
      setIsLocked(pinConfigured); // false if new user -> immediately shows PIN setup!
    } else {
      // Local Mode
      const storedPass = localStorage.getItem(LOCAL_MASTER_PASS_KEY);
      if (storedPass && storedPass !== pass) {
        throw new Error('Invalid master password.');
      }
      if (!storedPass) {
        localStorage.setItem(LOCAL_MASTER_PASS_KEY, pass);
      }
      localStorage.setItem(LOCAL_MASTER_AUTH_KEY, trimmedEmail);
      const authUser: AuthUser = { email: trimmedEmail };
      setUser(authUser);
      setIsAuthenticated(true);
      const pinConfigured = isPinSet(getUserKey(authUser));
      setHasPin(pinConfigured);
      setIsLocked(pinConfigured);
    }
  };

  // 2. Setup 4-Digit PIN (First time setup for active user)
  const setupPin = async (pin: string) => {
    if (!/^\d{4}$/.test(pin)) {
      throw new Error('PIN must be exactly 4 digits');
    }
    const userKey = getUserKey(user);
    if (!userKey) throw new Error('No active user found');

    const { hash, salt } = await savePin(pin, userKey);

    // Sync to Supabase user_security table if connected
    if (isCloud && supabase && user?.id) {
      try {
        await supabase.from('user_security').upsert({
          user_id: user.id,
          pin_hash: hash,
          pin_salt: salt,
          auto_lock_minutes: autoLockMinutes,
          updated_at: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Could not persist PIN to cloud user_security:', err);
      }
    }

    setHasPin(true);
    setIsLocked(false); // Unlocks into dashboard!
  };

  // 3. Unlock with 4-Digit PIN
  const unlockWithPin = async (pin: string): Promise<boolean> => {
    const userKey = getUserKey(user);
    const valid = await verifyPin(pin, userKey);
    if (valid) {
      setIsLocked(false);
      resetIdleTimer();
      return true;
    }
    return false;
  };

  // 4. Unlock with Master Password (fallback if PIN is forgotten)
  const unlockWithPassword = async (pass: string): Promise<boolean> => {
    if (!user?.email) return false;

    if (isCloud && supabase) {
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: pass,
      });
      if (!error) {
        setIsLocked(false);
        resetIdleTimer();
        return true;
      }
      return false;
    } else {
      const storedPass = localStorage.getItem(LOCAL_MASTER_PASS_KEY);
      if (storedPass === pass) {
        setIsLocked(false);
        resetIdleTimer();
        return true;
      }
      return false;
    }
  };

  // 5. Change PIN
  const changePin = async (newPin: string) => {
    if (!/^\d{4}$/.test(newPin)) {
      throw new Error('New PIN must be exactly 4 digits');
    }
    const userKey = getUserKey(user);
    if (!userKey) throw new Error('No active user found');

    const { hash, salt } = await savePin(newPin, userKey);

    if (isCloud && supabase && user?.id) {
      try {
        await supabase.from('user_security').upsert({
          user_id: user.id,
          pin_hash: hash,
          pin_salt: salt,
          auto_lock_minutes: autoLockMinutes,
          updated_at: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Could not persist updated PIN to cloud user_security:', err);
      }
    }

    setHasPin(true);
  };

  // 6. Update Auto-Lock timeout
  const updateAutoLockTimeout = async (minutes: number) => {
    const userKey = getUserKey(user);
    persistAutoLockMinutes(minutes, userKey);
    setAutoLockMinutesState(minutes);

    if (isCloud && supabase && user?.id) {
      try {
        await supabase.from('user_security').update({
          auto_lock_minutes: minutes,
          updated_at: new Date().toISOString(),
        }).eq('user_id', user.id);
      } catch (err) {
        console.warn('Could not update auto_lock_minutes in cloud:', err);
      }
    }
  };

  // 7. Sign Out (Full device logout)
  const signOut = async () => {
    try {
      if (isCloud && supabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error('Error signing out:', err);
    } finally {
      localStorage.removeItem(LOCAL_MASTER_AUTH_KEY);
      localStorage.removeItem('jewelry_app_pin_hash');
      localStorage.removeItem('jewelry_app_pin_salt');
      setUser(null);
      setIsAuthenticated(false);
      setIsLocked(false);
      setHasPin(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLocked,
        hasPin,
        autoLockMinutes,
        isLoading,
        isCloudConnected: isCloud,
        signInWithPassword,
        setupPin,
        unlockWithPin,
        unlockWithPassword,
        lockNow,
        changePin,
        updateAutoLockTimeout,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
