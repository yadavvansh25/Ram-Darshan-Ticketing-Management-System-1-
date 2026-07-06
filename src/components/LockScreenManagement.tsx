import React, { useState } from 'react';
import { Shield, KeyRound, User as UserIcon, Lock, AlertCircle, HelpCircle, Key, Ticket } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RelationalDatabase } from '../db';
import { User, UserRole } from '../types';

interface LockScreenManagementProps {
  onUnlock: (role: UserRole, user: User) => void;
  onSwitchToOperator?: () => void;
}

export default function LockScreenManagement({ onUnlock, onSwitchToOperator }: LockScreenManagementProps) {
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

  const managers = RelationalDatabase.getUsers().filter(u => u.role === 'MANAGEMENT');

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center text-slate-100 font-sans px-4 overflow-y-auto"
      id="management-lock-screen"
    >
      {/* Background Ambience: Deep Emerald/Cyan */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.06)_0%,transparent_70%)] pointer-events-none" />

      <div className="w-full max-w-md py-8 flex flex-col items-center relative z-10">
        
        {/* Terminal Header Info */}
        <div className="text-center mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="inline-flex p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 mb-3 animate-pulse">
            <Key size={36} className="stroke-[2]" />
          </div>
          <h1 className="text-2xl font-black font-sans tracking-tight text-white font-mono uppercase">RAM DARSHAN SECURE GATEWAY</h1>
          <p className="text-[10px] text-emerald-400 mt-1.5 font-mono tracking-widest font-bold bg-emerald-500/10 border border-emerald-500/20 rounded-md px-2.5 py-1 inline-block">
            ACCOUNTING & RATE ENGINE SECURITY PANEL
          </p>
        </div>

        {/* Credentials Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600" />
          
          <h2 className="text-sm font-bold font-mono tracking-wider text-slate-200 mb-4 flex items-center gap-2">
            <Lock size={15} className="text-emerald-400" />
            <span>SECURE MANAGEMENT LOGIN</span>
          </h2>

          {/* Mode Selector Tabs */}
          {onSwitchToOperator && (
            <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800/80 mb-5">
              <button
                type="button"
                onClick={onSwitchToOperator}
                className="py-2.5 px-3 rounded-lg text-[10px] uppercase tracking-widest font-extrabold font-sans transition flex items-center justify-center gap-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-900/60 cursor-pointer"
              >
                <Ticket size={12} className="stroke-[2]" />
                <span>Operator POS</span>
              </button>
              <button
                type="button"
                className="py-2.5 px-3 rounded-lg text-[10px] uppercase tracking-widest font-extrabold font-sans transition flex items-center justify-center gap-1.5 bg-emerald-500 text-slate-950 shadow-md"
              >
                <Shield size={12} className="stroke-[2.5]" />
                <span>Secure Gateway</span>
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1">
                <UserIcon size={12} className="text-slate-500" />
                <span>Administrator Username</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter admin username"
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 text-white placeholder-slate-600 rounded-xl px-4 py-3 text-xs font-mono transition outline-none"
                id="mgmt-username-input"
              />
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1">
                <KeyRound size={12} className="text-slate-500" />
                <span>Management PIN Password</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 text-white placeholder-slate-600 rounded-xl px-4 py-3 text-xs font-mono transition outline-none"
                id="mgmt-password-input"
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
              id="mgmt-submit-btn"
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black font-sans tracking-wider text-xs rounded-xl shadow-lg shadow-emerald-500/10 transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 uppercase"
            >
              <span>ACCESS RATE ENGINE</span>
            </button>
          </form>
        </div>

        {/* Seed Credentials Helper Panel */}
        {showCredentialsHint && (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 mt-4 w-full text-xs font-mono text-slate-400">
            <div className="flex items-center justify-between mb-2.5 pb-1.5 border-b border-slate-800">
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1.5">
                <HelpCircle size={13} />
                <span>Authorized Management logins</span>
              </span>
              <button 
                onClick={() => setShowCredentialsHint(false)}
                className="text-[10px] text-slate-500 hover:text-slate-300 transition"
              >
                Hide
              </button>
            </div>
            <div className="space-y-2">
              {managers.map((mgmt) => (
                <button
                  key={mgmt.user_id}
                  onClick={() => prefill(mgmt.username, mgmt.password_hash)}
                  className="w-full bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg p-2.5 text-left transition text-slate-300 flex justify-between items-center"
                >
                  <div>
                    <span className="text-[9px] uppercase font-bold text-emerald-400 block">Workspace Admin</span>
                    <span className="text-slate-200 font-bold block mt-0.5 text-[11px]">{mgmt.username}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px]">PIN: {mgmt.password_hash}</span>
                    <span className="text-[8px] font-mono text-slate-500 block mt-0.5">ROLE: {mgmt.role}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-[10px] text-slate-600 mt-6 font-mono tracking-wider text-center">
          AUDITING COMPLIANCE • AUTHORIZED AUDIT LOGGING IS ENGAGED
        </p>
      </div>
    </div>
  );
}
