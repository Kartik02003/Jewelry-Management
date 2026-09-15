import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { 
  verifyPin, 
  savePin, 
  isPinSet, 
  clearPin, 
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
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [hasPin, setHasPin] = useState<boolean>(false);
  const [autoLockMinutes, setAutoLockMinutesState] = useState<number>(getAutoLockMinutes());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Lock the screen
  const lockNow = useCallback(() => {
    if (isPinSet()) {
      setIsLocked(true);
    }
  }, []);

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

  // Initial Auth Check
  useEffect(() => {
    const initAuth = async () => {
      try {
        setIsLoading(true);
        const pinConfigured = isPinSet();
        setHasPin(pinConfigured);

        if (isCloud && supabase) {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (session?.user) {
            setUser({ email: session.user.email || '', id: session.user.id });
            setIsAuthenticated(true);
            setIsLocked(pinConfigured); // Lock behind PIN if PIN is set
          } else {
            setIsAuthenticated(false);
            setUser(null);
          }
        } else {
          // Local/offline mode check
          const localAuth = localStorage.getItem(LOCAL_MASTER_AUTH_KEY);
          if (localAuth) {
            setUser({ email: localAuth });
            setIsAuthenticated(true);
            setIsLocked(pinConfigured);
          } else {
            setIsAuthenticated(false);
            setUser(null);
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
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setUser({ email: session.user.email || '', id: session.user.id });
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
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

  // 1. Sign In with Email and Password (One-Time Master Setup per device)
  const signInWithPassword = async (email: string, pass: string) => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) throw new Error('Email is required');
    if (!pass) throw new Error('Password is required');

    if (isCloud && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: pass,
      });
      if (error) throw error;
      setUser({ email: data.user.email || trimmedEmail, id: data.user.id });
      setIsAuthenticated(true);
      const pinConfigured = isPinSet();
      setHasPin(pinConfigured);
      setIsLocked(pinConfigured);
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
      setUser({ email: trimmedEmail });
      setIsAuthenticated(true);
      const pinConfigured = isPinSet();
      setHasPin(pinConfigured);
      setIsLocked(pinConfigured);
    }
  };

  // 2. Setup 4-Digit PIN
  const setupPin = async (pin: string) => {
    if (!/^\d{4}$/.test(pin)) {
      throw new Error('PIN must be exactly 4 digits');
    }
    await savePin(pin);
    setHasPin(true);
    setIsLocked(false);
  };

  // 3. Unlock with 4-Digit PIN
  const unlockWithPin = async (pin: string): Promise<boolean> => {
    const valid = await verifyPin(pin);
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
    await savePin(newPin);
    setHasPin(true);
  };

  // 6. Update Auto-Lock timeout
  const updateAutoLockTimeout = (minutes: number) => {
    persistAutoLockMinutes(minutes);
    setAutoLockMinutesState(minutes);
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
      clearPin();
      localStorage.removeItem(LOCAL_MASTER_AUTH_KEY);
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
