import React, { useState } from 'react';
import { Shield, KeyRound, User as UserIcon, Lock, AlertCircle, HelpCircle, Ticket } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RelationalDatabase } from '../db';
import { User, UserRole } from '../types';

interface LockScreenOperatorProps {
  onUnlock: (role: UserRole, user: User) => void;
  onSwitchToManagement?: () => void;
}

export default function LockScreenOperator({ onUnlock, onSwitchToManagement }: LockScreenOperatorProps) {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showCredentialsHint, setShowCredentialsHint] = useState<boolean>(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError('Please enter both Username and Password.');
      return;
    }

    const authenticatedUser = RelationalDatabase.authenticate(username, password);

    if (authenticatedUser) {
      // Intuitively authorize and open to the correct role/gateway directly
      onUnlock(authenticatedUser.role, authenticatedUser);
    } else {
      setError('Invalid Username or Password. Please try again.');
    }
  };

  const prefill = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setError(null);
  };

  const operators = RelationalDatabase.getUsers().filter(u => u.role === 'OPERATOR');

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center text-slate-100 font-sans px-4 overflow-y-auto"
      id="operator-pos-lock-screen"
    >
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.06)_0%,transparent_70%)] pointer-events-none" />

      <div className="w-full max-w-md py-8 flex flex-col items-center relative z-10">
        
        {/* Terminal Header Info */}
        <div className="text-center mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="inline-flex p-3 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-500 mb-3 animate-pulse">
            <Ticket size={36} className="stroke-[2]" />
          </div>
          <h1 className="text-2xl font-black font-sans tracking-tight text-white font-mono uppercase">RAM DARSHAN POS</h1>
          <p className="text-[10px] text-amber-500 mt-1.5 font-mono tracking-widest font-bold bg-amber-500/10 border border-amber-500/20 rounded-md px-2.5 py-1 inline-block">
            OPERATOR POINT-OF-SALE GATEWAY
          </p>
        </div>

        {/* Credentials Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600" />
          
          <h2 className="text-sm font-bold font-mono tracking-wider text-slate-200 mb-4 flex items-center gap-2">
            <Lock size={15} className="text-amber-500" />
            <span>RAM DARSHAN TERMINAL SIGN-IN</span>
          </h2>

          {/* Mode Selector Tabs */}
          {onSwitchToManagement && (
            <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800/80 mb-5">
              <button
                type="button"
                className="py-2.5 px-3 rounded-lg text-[10px] uppercase tracking-widest font-extrabold font-sans transition flex items-center justify-center gap-1.5 bg-amber-500 text-slate-950 shadow-md"
              >
                <Ticket size={12} className="stroke-[2.5]" />
                <span>Operator POS</span>
              </button>
              <button
                type="button"
                onClick={onSwitchToManagement}
                className="py-2.5 px-3 rounded-lg text-[10px] uppercase tracking-widest font-extrabold font-sans transition flex items-center justify-center gap-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-900/60 cursor-pointer"
              >
                <Shield size={12} className="stroke-[2]" />
                <span>Secure Gateway</span>
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1">
                <UserIcon size={12} className="text-slate-500" />
                <span>Operator Username</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="operator1, operator2, etc."
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 text-white placeholder-slate-600 rounded-xl px-4 py-3 text-xs font-mono transition outline-none"
                id="op-username-input"
              />
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1">
                <KeyRound size={12} className="text-slate-500" />
                <span>Operator Password</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 text-white placeholder-slate-600 rounded-xl px-4 py-3 text-xs font-mono transition outline-none"
                id="op-password-input"
              />
            </div>

            {/* Error Message */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl p-3 flex items-start gap-2.5 font-mono"
                >
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <button
              type="submit"
              id="op-submit-btn"
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black font-sans tracking-wider text-xs rounded-xl shadow-lg shadow-amber-500/10 transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 uppercase"
            >
              <span>LAUNCH SALES CONSOLE</span>
            </button>
          </form>
        </div>

        {/* Seed Credentials Helper Panel */}
        {showCredentialsHint && (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 mt-4 w-full text-xs font-mono text-slate-400">
            <div className="flex items-center justify-between mb-2.5 pb-1.5 border-b border-slate-800">
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-500 flex items-center gap-1.5">
                <HelpCircle size={13} />
                <span>Available Operator Terminals</span>
              </span>
              <button 
                onClick={() => setShowCredentialsHint(false)}
                className="text-[10px] text-slate-500 hover:text-slate-300 transition"
              >
                Hide
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
              {operators.map((op) => (
                <button
                  key={op.user_id}
                  onClick={() => prefill(op.username, op.password_hash)}
                  className="bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg p-2 flex flex-col justify-between transition text-slate-300 text-left cursor-pointer"
                >
                  <div className="text-[9px] uppercase font-bold text-amber-500 flex justify-between w-full">
                    <span>Terminal</span>
                    <span>{op.terminal_id}</span>
                  </div>
                  <span className="text-slate-200 font-bold block mt-0.5 text-[10px] truncate">{op.username}</span>
                  <span className="text-slate-400 block mt-0.5 text-[9px]">PIN: {op.password_hash}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-[10px] text-slate-600 mt-6 font-mono tracking-wider text-center">
          OPERATOR SECURITY COMPLIANCE REQUIRED • LOCKOUT PROTOCOLS ACTIVE
        </p>
      </div>
    </div>
  );
}
