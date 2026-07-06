import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, Key, Lock, Unlock, Clock, Radio, User as UserIcon, Cpu, AlertCircle, HelpCircle, 
  Settings, Terminal as ConsoleIcon
} from 'lucide-react';
import { Transaction, UserRole, User } from './types';
import { RelationalDatabase } from './db';
import LockScreenOperator from './components/LockScreenOperator';
import LockScreenManagement from './components/LockScreenManagement';
import OperatorPOS from './components/OperatorPOS';
import AdminDashboard from './components/AdminDashboard';
import ReceiptPrinter from './components/ReceiptPrinter';
import MainWebsiteLock from './components/MainWebsiteLock';

const INACTIVITY_LIMIT_SECONDS = 300; // 5 minutes

export default function App() {
  const [isWebsiteUnlocked, setIsWebsiteUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('rd_website_unlocked') === 'true';
  });
  const [role, setRole] = useState<UserRole>('OPERATOR');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(true); // start locked for secure terminal feel
  const [activeReceipt, setActiveReceipt] = useState<Transaction | null>(null);

  // Time & Inactivity Timer
  const [systemTime, setSystemTime] = useState<Date>(new Date());
  const [secondsRemaining, setSecondsRemaining] = useState<number>(INACTIVITY_LIMIT_SECONDS);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize DB on mount
  useEffect(() => {
    RelationalDatabase.init();
  }, []);

  // System Live Clock
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setSystemTime(new Date());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Inactivity Auto-Lock system
  useEffect(() => {
    if (isLocked) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    setSecondsRemaining(INACTIVITY_LIMIT_SECONDS);

    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          setIsLocked(true);
          setCurrentUser(null);
          if (timerRef.current) clearInterval(timerRef.current);
          return INACTIVITY_LIMIT_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isLocked]);

  // Reset inactivity countdown on user actions
  const resetInactivityTimer = () => {
    if (!isLocked) {
      setSecondsRemaining(INACTIVITY_LIMIT_SECONDS);
    }
  };

  useEffect(() => {
    const handleActivity = () => {
      resetInactivityTimer();
    };

    window.addEventListener('mousedown', handleActivity);
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    return () => {
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [isLocked]);

  const handleUnlock = (unlockedRole: UserRole, user: User) => {
    setRole(unlockedRole);
    setCurrentUser(user);
    setIsLocked(false);
    setSecondsRemaining(INACTIVITY_LIMIT_SECONDS);
  };

  const handleManualLock = () => {
    setIsLocked(true);
    setCurrentUser(null);
  };

  const handleRoleChange = (newRole: UserRole) => {
    if (newRole === 'MANAGEMENT') {
      // Prompt login elevation by locking the terminal and targeting the administrator role
      setIsLocked(true);
      setCurrentUser(null);
      setRole('MANAGEMENT');
    } else {
      setIsLocked(true);
      setCurrentUser(null);
      setRole('OPERATOR');
    }
  };

  // Format Auto-Lock countdown
  const formatTimeRemaining = () => {
    const minutes = Math.floor(secondsRemaining / 60);
    const seconds = secondsRemaining % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!isWebsiteUnlocked) {
    return (
      <MainWebsiteLock 
        onUnlock={() => {
          setIsWebsiteUnlocked(true);
          sessionStorage.setItem('rd_website_unlocked', 'true');
        }} 
      />
    );
  }

  return (
    <div 
      className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950 relative overflow-hidden"
      id="main-applet-root"
    >
      {/* Background radial atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.03)_0%,transparent_60%)] pointer-events-none" />

      {/* Render Locked Screen Pad if locked */}
      {isLocked && (
        role === 'OPERATOR' ? (
          <LockScreenOperator 
            onUnlock={handleUnlock} 
            onSwitchToManagement={() => setRole('MANAGEMENT')}
          />
        ) : (
          <LockScreenManagement 
            onUnlock={handleUnlock} 
            onSwitchToOperator={() => setRole('OPERATOR')}
          />
        )
      )}

      {/* RENDER ACTIVE WORKSTATION TERMINAL INTERFACE */}
      
      {/* 1. Terminal Top Status Bar / Header (Workstation Mode) */}
      <header className="bg-slate-900 border-b border-slate-950 py-3.5 px-6 z-10 relative shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Main Title branding - Professional Polish Amber Box Logo */}
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 text-slate-950 p-2 rounded-lg font-black tracking-tight shadow flex items-center justify-center">
              <Cpu size={18} className="stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2 font-heading">
                <span>RAM DARSHAN POS & MANAGEMENT TERMINAL</span>
                <span className="text-[9px] bg-slate-800 text-amber-500 border border-slate-700/50 rounded-sm px-1.5 py-0.5 font-mono font-medium">
                  NODE #{currentUser?.terminal_id || (role === 'OPERATOR' ? 'RD-01' : 'RD-ADM')}
                </span>
              </h1>
              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mt-0.5">
                Ayodhya Sector 4 • Ticket Registry & Operations Control
              </p>
            </div>
          </div>

          {/* Node telemetry indicators */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
            
            {/* Live Clock with elegant grey background */}
            <div className="flex items-center gap-1.5 text-slate-300 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <Clock size={13} className="text-amber-500" />
              <span>
                {systemTime.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')}
              </span>
              <span className="text-slate-700">|</span>
              <span className="text-slate-200">
                {systemTime.toLocaleTimeString('en-IN', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' }).toUpperCase()}
              </span>
            </div>

            {/* Inactivity Monitor status */}
            <div className="flex items-center gap-1.5 text-slate-400 bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-lg">
              <span>Auto-Lock:</span>
              <span className={`font-bold font-mono ${secondsRemaining < 60 ? 'text-rose-400 animate-pulse' : 'text-slate-200'}`}>
                {formatTimeRemaining()}
              </span>
              <button 
                onClick={handleManualLock}
                className="p-0.5 text-slate-500 hover:text-amber-500 rounded transition cursor-pointer ml-1 pr-1 border-r border-slate-800"
                title="Lock Terminal Now"
              >
                <Lock size={12} />
              </button>
              <button 
                onClick={() => {
                  setIsWebsiteUnlocked(false);
                  sessionStorage.removeItem('rd_website_unlocked');
                  handleManualLock();
                }}
                className="p-0.5 text-slate-500 hover:text-rose-400 rounded transition cursor-pointer pl-0.5"
                title="Lock Main Website Portal"
              >
                <Shield size={12} />
              </button>
            </div>

            {/* Resiliency Offline status Badge */}
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-1.5 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>ONLINE / RESPONSIVE</span>
            </div>
          </div>

        </div>
      </header>

      {/* 2. Sub-Header: Persona & Navigation Switcher */}
      <section className="bg-slate-950 border-b border-slate-800 py-2.5 px-6 z-10 relative shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          
          <div className="flex items-center gap-2">
            <span className="text-slate-400 uppercase font-mono text-[10px] tracking-wider">Workspace Mode:</span>
            <div className="flex gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => handleRoleChange('OPERATOR')}
                className={`px-3.5 py-1 rounded-md font-medium tracking-wide flex items-center gap-1.5 transition cursor-pointer ${
                  role === 'OPERATOR'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <UserIcon size={12} />
                <span>Ticket Sales POS</span>
              </button>
              
              <button
                onClick={() => handleRoleChange('MANAGEMENT')}
                className={`px-3.5 py-1 rounded-md font-medium tracking-wide flex items-center gap-1.5 transition cursor-pointer ${
                  role === 'MANAGEMENT'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Key size={12} />
                <span>Accounting & Rate Engine</span>
              </button>
            </div>
          </div>

          <div className="text-slate-400 font-mono text-[10px] uppercase tracking-wide flex items-center gap-2">
            <span>ROLE:</span> <strong className="text-amber-500">{role}</strong>
            <span className="text-slate-700">•</span>
            <span>USER:</span> <strong className="text-slate-200">{currentUser ? currentUser.username.toUpperCase() : 'NOT AUTHENTICATED'}</strong> 
            <span className="text-slate-700">•</span> 
            <span>SESSION CODE:</span> <strong className="text-slate-200">RD-JUL-05</strong>
          </div>

        </div>
      </section>

      {/* 3. Main Operational Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 z-10 relative">
        {role === 'OPERATOR' ? (
          <OperatorPOS 
            onTransactionCompleted={(tx) => setActiveReceipt(tx)}
            currentUser={currentUser}
          />
        ) : (
          <AdminDashboard 
            onLogoutToPOS={() => {
              setRole('OPERATOR');
              setIsLocked(true); // locks instantly for safety
              setCurrentUser(null);
            }}
            currentUser={currentUser}
          />
        )}
      </main>

      {/* 4. Thermal Printer Simulator Portal Modal */}
      {activeReceipt && (
        <ReceiptPrinter 
          transaction={activeReceipt}
          onClose={() => setActiveReceipt(null)}
        />
      )}

      {/* 5. Humble Human Page Footer */}
      <footer className="py-4 border-t border-slate-250 text-center text-[10px] font-mono text-slate-500 relative z-10 bg-slate-50">
        RAM DARSHAN SYSTEM • LOCAL DATABASE MEMORY CONSOLE • SECURE TICKETING POINT-OF-SALE
      </footer>
    </div>
  );
}
