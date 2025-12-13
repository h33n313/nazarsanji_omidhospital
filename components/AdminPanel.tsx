import React, { useState } from 'react';
import { Lock, KeyRound, AlertCircle, ShieldCheck } from 'lucide-react';
import { AdminDashboard } from './AdminDashboard.tsx';
import { verifyPin } from '../services/auth.ts';

export const AdminPanel: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMasterSession, setIsMasterSession] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const { success, isMaster } = verifyPin(pin);

    if (success) {
      setIsAuthenticated(true);
      setIsMasterSession(isMaster);
      setError('');
    } else {
      setError('رمز عبور اشتباه است');
      setPin('');
    }
  };

  if (isAuthenticated) {
    return (
      <AdminDashboard 
        onLogout={() => {
          setIsAuthenticated(false);
          setIsMasterSession(false);
          setPin('');
        }} 
        isMasterSession={isMasterSession}
      />
    );
  }

  return (
    <div className="flex-grow flex items-center justify-center p-4 bg-slate-100">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-slate-800 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-full mb-4 text-white">
            <Lock size={32} />
          </div>
          <h2 className="text-xl font-bold text-white">پنل مدیریت</h2>
          <p className="text-slate-400 text-sm mt-1">لطفا رمز عبور را وارد کنید</p>
        </div>

        <form onSubmit={handleLogin} className="p-8">
          <div className="mb-6">
            <label className="block text-slate-700 text-sm font-bold mb-2">رمز عبور (PIN)</label>
            <div className="relative">
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full pl-4 pr-10 py-3 rounded-lg border-2 border-slate-200 focus:border-slate-500 focus:outline-none text-center text-2xl tracking-[0.5em] font-mono"
                placeholder="••••"
              />
              <KeyRound className="absolute right-3 top-3.5 text-slate-400" size={20} />
            </div>
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-lg">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <ShieldCheck size={20} />
            ورود به سیستم
          </button>
        </form>
      </div>
    </div>
  );
};