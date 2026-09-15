import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Lock, Timer, LogOut, ShieldCheck, KeyRound, Check } from 'lucide-react';

interface SecuritySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecuritySettingsModal: React.FC<SecuritySettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { 
    user, 
    autoLockMinutes, 
    updateAutoLockTimeout, 
    changePin, 
    unlockWithPin, 
    signOut,
    isCloudConnected 
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'timeout' | 'change_pin'>('timeout');
  
  // Change PIN state
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState(false);
  const [savingPin, setSavingPin] = useState(false);

  const timeoutOptions = [
    { value: 1, label: '1 Minute' },
    { value: 2, label: '2 Minutes' },
    { value: 5, label: '5 Minutes (Recommended)' },
    { value: 15, label: '15 Minutes' },
    { value: 30, label: '30 Minutes' },
    { value: 0, label: 'Never (Manual Lock Only)' },
  ];

  const handleTimeoutChange = (minutes: number) => {
    updateAutoLockTimeout(minutes);
  };

  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPin.length !== 4) {
      setPinError('Please enter your 4-digit current PIN.');
      return;
    }
    if (newPin.length !== 4) {
      setPinError('New PIN must be 4 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('New PIN and Confirm PIN do not match.');
      return;
    }

    setSavingPin(true);
    setPinError(null);
    try {
      const isCurrentValid = await unlockWithPin(currentPin);
      if (!isCurrentValid) {
        setPinError('Current PIN is incorrect.');
        setSavingPin(false);
        return;
      }

      await changePin(newPin);
      setPinSuccess(true);
      setTimeout(() => {
        setPinSuccess(false);
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');
        setActiveTab('timeout');
      }, 1500);
    } catch (err: any) {
      setPinError(err.message || 'Failed to change PIN');
    } finally {
      setSavingPin(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Security & Lock Settings"
      description={user?.email ? `Owner: ${user.email}` : 'App Security'}
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setActiveTab('timeout');
              setPinError(null);
            }}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'timeout'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Timer className="w-3.5 h-3.5 text-primary-600" />
            <span>Auto-Lock Timer</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('change_pin');
              setPinError(null);
            }}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'change_pin'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 text-primary-600" />
            <span>Change PIN</span>
          </button>
        </div>

        {/* TAB 1: Auto-Lock Options */}
        {activeTab === 'timeout' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Choose how long the app stays unlocked during inactivity before asking for your 4-digit PIN:
            </p>

            <div className="space-y-2">
              {timeoutOptions.map((opt) => {
                const isSelected = autoLockMinutes === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleTimeoutChange(opt.value)}
                    className={`w-full p-3 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-all border ${
                      isSelected
                        ? 'bg-primary-50 text-primary-900 border-primary-300 ring-1 ring-primary-300 shadow-sm'
                        : 'bg-slate-50 hover:bg-slate-100/80 text-slate-700 border-slate-200/80'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-primary-700" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: Change PIN */}
        {activeTab === 'change_pin' && (
          <form onSubmit={handleChangePinSubmit} className="space-y-3">
            {pinSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 rounded-xl font-bold flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>4-Digit PIN updated successfully!</span>
              </div>
            )}

            {pinError && (
              <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-600 rounded-xl font-medium">
                {pinError}
              </div>
            )}

            <Input
              label="Current 4-Digit PIN"
              type="password"
              inputMode="numeric"
              maxLength={4}
              required
              placeholder="••••"
              value={currentPin}
              onChange={(e) => {
                setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                setPinError(null);
              }}
            />

            <Input
              label="New 4-Digit PIN"
              type="password"
              inputMode="numeric"
              maxLength={4}
              required
              placeholder="••••"
              value={newPin}
              onChange={(e) => {
                setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                setPinError(null);
              }}
            />

            <Input
              label="Confirm New 4-Digit PIN"
              type="password"
              inputMode="numeric"
              maxLength={4}
              required
              placeholder="••••"
              value={confirmPin}
              onChange={(e) => {
                setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                setPinError(null);
              }}
            />

            <div className="pt-1">
              <Button type="submit" isLoading={savingPin} className="w-full">
                Update PIN
              </Button>
            </div>
          </form>
        )}

        {/* Sign Out Section */}
        <div className="pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={async () => {
              if (window.confirm('Are you sure you want to sign out of this device? You will need your master password to sign back in.')) {
                onClose();
                await signOut();
              }
            }}
            className="w-full py-2.5 px-3 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 flex items-center justify-center gap-1.5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out of this Device</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
