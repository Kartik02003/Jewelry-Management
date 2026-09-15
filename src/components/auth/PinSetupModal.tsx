import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { KeyRound, Check, Delete, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';

export const PinSetupModal: React.FC = () => {
  const { setupPin, user } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [firstPin, setFirstPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const currentPin = step === 1 ? firstPin : confirmPin;

  const handleKeyPress = async (num: string) => {
    if (currentPin.length >= 4) return;
    const nextVal = currentPin + num;

    if (step === 1) {
      setFirstPin(nextVal);
      if (nextVal.length === 4) {
        setTimeout(() => {
          setStep(2);
          setError(null);
        }, 250);
      }
    } else {
      setConfirmPin(nextVal);
      if (nextVal.length === 4) {
        if (nextVal !== firstPin) {
          setError('PINs do not match. Please try again.');
          setTimeout(() => {
            setStep(1);
            setFirstPin('');
            setConfirmPin('');
          }, 1000);
        } else {
          setLoading(true);
          try {
            await setupPin(nextVal);
          } catch (err: any) {
            setError(err.message || 'Failed to save PIN.');
            setLoading(false);
          }
        }
      }
    }
  };

  const handleBackspace = () => {
    if (step === 1) {
      setFirstPin(prev => prev.slice(0, -1));
    } else {
      setConfirmPin(prev => prev.slice(0, -1));
    }
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 font-sans animate-fade-in">
      <div className="max-w-sm w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 text-center text-slate-100">
        <div className="space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-primary-500/20 text-primary-400 flex items-center justify-center mx-auto border border-primary-500/30">
            <KeyRound className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            {step === 1 ? 'Set a 4-Digit Quick PIN' : 'Confirm your 4-Digit PIN'}
          </h2>
          <p className="text-xs text-slate-400">
            {step === 1
              ? 'Choose a 4-digit code for instant daily unlocks at the shop counter.'
              : 'Re-enter your 4-digit PIN to confirm.'}
          </p>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-950/80 border border-rose-800 text-xs text-rose-300 font-medium rounded-xl">
            {error}
          </div>
        )}

        {/* 4-Dot PIN Indicator */}
        <div className="flex justify-center items-center gap-4 py-2">
          {[0, 1, 2, 3].map((index) => {
            const isFilled = index < currentPin.length;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? 'bg-primary-500 scale-125 shadow-lg shadow-primary-500/50'
                    : 'bg-slate-700 border border-slate-600'
                }`}
              />
            );
          })}
        </div>

        {/* Tactile Keypad */}
        <div className="grid grid-cols-3 gap-3 max-w-[260px] mx-auto pt-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              disabled={loading}
              className="h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-xl font-bold text-white transition-all shadow-md active:scale-95 flex items-center justify-center border border-slate-700/60"
            >
              {num}
            </button>
          ))}

          {/* Bottom Row */}
          <div className="flex items-center justify-center">
            {step === 2 && (
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setFirstPin('');
                  setConfirmPin('');
                  setError(null);
                }}
                className="text-[11px] font-semibold text-slate-400 hover:text-slate-200"
              >
                Reset
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            disabled={loading}
            className="h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-xl font-bold text-white transition-all shadow-md active:scale-95 flex items-center justify-center border border-slate-700/60"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleBackspace}
            disabled={loading}
            className="h-14 rounded-2xl bg-slate-800/60 hover:bg-slate-700 active:bg-slate-600 text-slate-400 hover:text-white transition-all shadow-md active:scale-95 flex items-center justify-center border border-slate-700/60"
            aria-label="Backspace"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
