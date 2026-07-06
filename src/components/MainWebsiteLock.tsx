import React, { useState } from 'react';
import { Shield, KeyRound, Lock, Eye, EyeOff, AlertCircle, Globe, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MainWebsiteLockProps {
  onUnlock: () => void;
}

export default function MainWebsiteLock({ onUnlock }: MainWebsiteLockProps) {
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password) {
      setError('Please enter the security password.');
      return;
    }

    setIsSubmitting(true);

    // Simulate a brief secure check
    setTimeout(() => {
      if (password === 'ramdarshan123') {
        onUnlock();
      } else {
        setError('Incorrect password. Please enter the main website passcode.');
        setIsSubmitting(false);
      }
    }, 400);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center text-slate-100 font-sans px-4 overflow-y-auto"
      id="main-website-lock-screen"
    >
      {/* Background Ambience / Cosmic Radial Light */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.08)_0%,transparent_65%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.1)_1px,transparent_1px)] bg-[size:24px_24px] opacity-20 pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md py-8 flex flex-col items-center relative z-10"
      >
        {/* Portal Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-500 mb-4 animate-pulse shadow-inner">
            <Globe size={40} className="stroke-[1.5]" />
          </div>
          <h1 className="text-2xl font-black font-sans tracking-tight text-white uppercase">
            RAM DARSHAN PORTAL
          </h1>
          <p className="text-[10px] text-amber-500 mt-2 font-mono tracking-widest font-bold bg-amber-500/10 border border-amber-500/20 rounded-md px-3 py-1 inline-block uppercase">
            Main Website Security Gateway
          </p>
        </div>

        {/* Secure Form Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-7 w-full shadow-2xl relative overflow-hidden">
          {/* Accent Line */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600" />
          
          <div className="space-y-1.5 mb-6">
            <h2 className="text-sm font-extrabold font-sans tracking-wider text-slate-200 flex items-center gap-2">
              <Lock size={15} className="text-amber-500 stroke-[2.5]" />
              <span>MAIN PORTAL LOCK</span>
            </h2>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans font-medium">
              This terminal is protected by the primary website security protocol. Please provide the authorization passcode to proceed to the Point-of-Sale workstations and administration deck.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                <KeyRound size={12} className="text-slate-500" />
                <span>Security Password</span>
              </label>
              
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter main website password"
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 text-white placeholder-slate-600 rounded-xl pl-4 pr-11 py-3.5 text-xs font-mono transition outline-none"
                  id="main-gate-password-input"
                  disabled={isSubmitting}
                />
                
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1 rounded-md transition outline-none cursor-pointer"
                  title={showPassword ? "Hide Password" : "Show Password"}
                  disabled={isSubmitting}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl p-3 flex items-start gap-2.5 font-sans"
                >
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span className="font-semibold">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <button
              type="submit"
              id="main-gate-submit-btn"
              disabled={isSubmitting}
              className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black font-sans tracking-wider text-xs rounded-xl shadow-lg shadow-amber-500/10 transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 uppercase"
            >
              <span>{isSubmitting ? 'Authenticating Gateway...' : 'Unlock Portal'}</span>
              {!isSubmitting && <ChevronRight size={14} className="stroke-[2.5]" />}
            </button>
          </form>
        </div>

        {/* Humble Hints or Compliance Info */}
        <div className="mt-6 flex flex-col items-center gap-1.5 text-center">
          <p className="text-[10px] text-slate-600 font-mono tracking-wider">
            AUTHORIZATION PROTOCOL #WS-8812 • PROTECTED CONNECTION
          </p>
          <p className="text-[9px] text-slate-700 font-mono">
            Powered by Ram Darshan Ayodhya Net-Security Core
          </p>
        </div>
      </motion.div>
    </div>
  );
}
