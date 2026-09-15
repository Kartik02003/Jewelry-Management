import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lock, Delete, KeyRound, LogOut, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

export const PinLockScreen: React.FC = () => {
  const { unlockWithPin, unlockWithPassword, user, signOut } = useAuth();
  const [pin, setPin] = useState<string>('');
  const [isShaking, setIsShaking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Forgot PIN / Master Password fallback state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [verifyingPassword, setVerifyingPassword] = useState(false);

  const handleDigit = async (digit: string) => {
    if (pin.length >= 4 || isShaking) return;
    const nextPin = pin + digit;
    setPin(nextPin);
    setErrorMsg(null);

    if (nextPin.length === 4) {
      // Auto verify on 4th digit
      const success = await unlockWithPin(nextPin);
      if (!success) {
        setIsShaking(true);
        setErrorMsg('Incorrect PIN. Please try again.');
        setTimeout(() => {
          setPin('');
          setIsShaking(false);
        }, 500);
      } else {
        setPin('');
      }
    }
  };

  const handleBackspace = () => {
    if (pin.length > 0 && !isShaking) {
      setPin(prev => prev.slice(0, -1));
      setErrorMsg(null);
    }
  };

  // Support physical keyboard 0-9 and Backspace
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPasswordModalOpen) return;
      if (/^[0-9]$/.test(e.key)) {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, isShaking, isPasswordModalOpen]);

  const handleUnlockWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterPassword) return;

    setVerifyingPassword(true);
    setPasswordError(null);
    try {
      const ok = await unlockWithPassword(masterPassword);
      if (ok) {
        setIsPasswordModalOpen(false);
        setMasterPassword('');
      } else {
        setPasswordError('Invalid master password.');
      }
    } catch (err: any) {
      setPasswordError(err.message || 'Verification failed.');
    } finally {
      setVerifyingPassword(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col justify-between items-center px-4 py-8 select-none font-sans overflow-hidden">
      {/* Background Accent Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-72 h-72 bg-primary-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="text-center space-y-2 pt-4 relative z-10">
        <div className="w-14 h-14 rounded-3xl bg-slate-900 border border-slate-800 text-primary-400 flex items-center justify-center mx-auto shadow-lg shadow-black/40">
          <Lock className="w-6 h-6 stroke-[2.2]" />
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tight text-white">
            Jewelry Manager
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            {user?.email ? `Signed in as ${user.email}` : 'Counter Lock Screen'}
          </p>
        </div>
      </div>

      {/* Center: PIN Dots & Keypad */}
      <div className="w-full max-w-xs space-y-6 text-center relative z-10">
        {/* Error message */}
        <div className="h-5 flex items-center justify-center">
          {errorMsg ? (
            <p className="text-xs font-semibold text-rose-400 animate-fade-in">
              {errorMsg}
            </p>
          ) : (
            <p className="text-xs font-medium text-slate-400">
              Enter 4-digit PIN to unlock
            </p>
          )}
        </div>

        {/* 4-Dot Indicators with Shake Animation */}
        <div
          className={`flex justify-center items-center gap-5 py-2 transition-transform ${
            isShaking ? 'animate-bounce text-rose-500' : ''
          }`}
        >
          {[0, 1, 2, 3].map((index) => {
            const isFilled = index < pin.length;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isShaking
                    ? 'bg-rose-500 scale-110 shadow-lg shadow-rose-500/50'
                    : isFilled
                    ? 'bg-primary-400 scale-125 shadow-lg shadow-primary-400/50'
                    : 'bg-slate-800 border border-slate-700'
                }`}
              />
            );
          })}
        </div>

        {/* Numeric Tactile Keypad */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(num)}
              className="h-14 rounded-2xl bg-slate-900/90 hover:bg-slate-800 active:bg-slate-700 text-2xl font-bold text-white transition-all shadow-md active:scale-95 flex items-center justify-center border border-slate-800"
            >
              {num}
            </button>
          ))}

          {/* Empty Space or Forgot PIN trigger */}
          <div className="flex items-center justify-center">
            {pin.length > 0 && (
              <button
                type="button"
                onClick={() => setPin('')}
                className="text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-14 rounded-2xl bg-slate-900/90 hover:bg-slate-800 active:bg-slate-700 text-2xl font-bold text-white transition-all shadow-md active:scale-95 flex items-center justify-center border border-slate-800"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleBackspace}
            className="h-14 rounded-2xl bg-slate-900/60 hover:bg-slate-800 active:bg-slate-700 text-slate-400 hover:text-white transition-all shadow-md active:scale-95 flex items-center justify-center border border-slate-800"
            aria-label="Backspace"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Bottom Footer Options */}
      <div className="w-full max-w-xs flex items-center justify-between text-xs text-slate-400 pt-4 relative z-10">
        <button
          type="button"
          onClick={() => {
            setPasswordError(null);
            setMasterPassword('');
            setIsPasswordModalOpen(true);
          }}
          className="hover:text-primary-400 transition-colors flex items-center gap-1 py-1 font-medium"
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>Forgot PIN?</span>
        </button>

        <button
          type="button"
          onClick={() => signOut()}
          className="hover:text-rose-400 transition-colors flex items-center gap-1 py-1 font-medium text-slate-500"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Master Password Fallback Modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Unlock with Master Password"
        description="Enter your account password to unlock and reset your PIN."
      >
        <form onSubmit={handleUnlockWithPassword} className="space-y-4">
          {passwordError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
              {passwordError}
            </div>
          )}

          <Input
            label="Master Password"
            type="password"
            required
            autoFocus
            placeholder="••••••••"
            value={masterPassword}
            onChange={(e) => {
              setMasterPassword(e.target.value);
              setPasswordError(null);
            }}
          />

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsPasswordModalOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={verifyingPassword}
              className="flex-1"
            >
              Unlock App
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
