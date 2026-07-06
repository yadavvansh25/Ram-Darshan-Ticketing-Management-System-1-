import React, { useState, useEffect } from 'react';
import { 
  BarChart, Layers, DollarSign, ListOrdered, Edit, Database, Terminal, 
  Play, RefreshCw, Lock, Unlock, TrendingUp, HelpCircle, Coins, QrCode, Calendar, Key, Printer, Trash, Plus,
  CheckCircle, AlertCircle, X, Info, ChevronDown, ChevronUp
} from 'lucide-react';
import { Transaction, SystemMetrics, User } from '../types';
import { RelationalDatabase } from '../db';
import ReceiptPrinter from './ReceiptPrinter';

interface AdminDashboardProps {
  onLogoutToPOS: () => void;
  currentUser: User | null;
}

export default function AdminDashboard({ onLogoutToPOS, currentUser }: AdminDashboardProps) {
  // DB States
  const [ticketPrice, setTicketPrice] = useState<number>(20);
  const [editingPriceStr, setEditingPriceStr] = useState<string>('20');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  
  // Modals & UI States
  const [isUpdatingPrice, setIsUpdatingPrice] = useState<boolean>(false);
  const [newPassword, setNewPassword] = useState<string>('');
  const [passwordUpdateSuccess, setPasswordUpdateSuccess] = useState<string | null>(null);

  // Filter state for live reports
  const [dateFilter, setDateFilter] = useState<'TODAY' | '15_DAYS' | '1_MONTH' | '1_YEAR' | 'ALL' | 'CUSTOM'>('ALL');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Tab State: 'TICKETS_BILLS' | 'ACCOUNTING'
  const [activeTab, setActiveTab] = useState<'TICKETS_BILLS' | 'ACCOUNTING'>('TICKETS_BILLS');

  // Accounting Engine Lock States
  const [isAccountingUnlocked, setIsAccountingUnlocked] = useState<boolean>(false);
  const [accountingPasswordInput, setAccountingPasswordInput] = useState<string>('');
  const [accountingUnlockError, setAccountingUnlockError] = useState<string | null>(null);
  const [newAccountingPassword, setNewAccountingPassword] = useState<string>('');
  const [accountingPasswordChangeSuccess, setAccountingPasswordChangeSuccess] = useState<string | null>(null);

  // SQL console state
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM Transactions');
  const [sqlResult, setSqlResult] = useState<{ columns: string[]; rows: any[]; error?: string } | null>(null);

  // Reprint Bill State
  const [selectedReprintTx, setSelectedReprintTx] = useState<Transaction | null>(null);

  // Operator Users & Editing State
  const [dbUsers, setDbUsers] = useState<User[]>([]);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editingUsername, setEditingUsername] = useState<string>('');
  const [editingPassword, setEditingPassword] = useState<string>('');
  const [editingTerminalId, setEditingTerminalId] = useState<string>('');
  const [operatorUpdateSuccess, setOperatorUpdateSuccess] = useState<string | null>(null);

  // Add Operator Terminal Form State
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [newOpTerminalId, setNewOpTerminalId] = useState<string>('');
  const [newOpUsername, setNewOpUsername] = useState<string>('');
  const [newOpPassword, setNewOpPassword] = useState<string>('');

  // Operator Collections View State (ACTIVE or ALL)
  const [collectionsView, setCollectionsView] = useState<'ACTIVE' | 'ALL'>('ACTIVE');

  // Confirmation Modals State
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<{ id: number; terminalId: string } | null>(null);

  // Custom Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => prev && prev.message === message ? null : prev);
    }, 4000);
  };

  const loadData = () => {
    RelationalDatabase.init();
    const activePrice = RelationalDatabase.getTicketPrice();
    const tx = RelationalDatabase.getTransactions();
    const mt = RelationalDatabase.getMetrics(dateFilter, customStartDate, customEndDate);
    const usersList = RelationalDatabase.getUsers();

    setTicketPrice(activePrice);
    setTransactions(tx);
    setMetrics(mt);
    setDbUsers(usersList);
  };

  useEffect(() => {
    loadData();
  }, [dateFilter, customStartDate, customEndDate]);

  // Execute default SQL on load or tab change
  useEffect(() => {
    if (activeTab === 'ACCOUNTING' && isAccountingUnlocked) {
      handleRunSql(sqlQuery);
    }
  }, [activeTab, isAccountingUnlocked]);

  const handleUnlockAccounting = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPassword = RelationalDatabase.getAccountingPassword();
    if (accountingPasswordInput === correctPassword) {
      setIsAccountingUnlocked(true);
      setAccountingPasswordInput('');
      setAccountingUnlockError(null);
      handleRunSql(sqlQuery);
    } else {
      setAccountingUnlockError('Incorrect Accounting Password. Access Denied.');
    }
  };

  const handleChangeAccountingPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountingPassword.trim()) {
      showToast('Accounting password cannot be empty.', 'error');
      return;
    }
    RelationalDatabase.saveAccountingPassword(newAccountingPassword.trim());
    setAccountingPasswordChangeSuccess(`Accounting password successfully changed! Current session remains unlocked.`);
    setNewAccountingPassword('');
    setTimeout(() => setAccountingPasswordChangeSuccess(null), 4000);
  };

  const handleLockAccounting = () => {
    setIsAccountingUnlocked(false);
    setAccountingPasswordInput('');
    setAccountingUnlockError(null);
  };

  const handleUpdatePrice = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(editingPriceStr);
    if (isNaN(parsed) || parsed <= 0) {
      showToast('Please enter a valid ticket rate greater than ₹0.00', 'error');
      return;
    }

    setIsUpdatingPrice(true);
    setTimeout(() => {
      RelationalDatabase.saveTicketPrice(parsed);
      loadData();
      setIsUpdatingPrice(false);
      showToast(`Standard Ticket Price updated successfully to ₹${parsed.toFixed(2)}! New tickets processed at this rate.`, 'success');
    }, 400);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      showToast('Password cannot be empty.', 'error');
      return;
    }
    if (currentUser) {
      const ok = RelationalDatabase.updateManagementPassword(currentUser.user_id, newPassword);
      if (ok) {
        setPasswordUpdateSuccess('Password updated successfully! Next login requires the new password.');
        setNewPassword('');
        setTimeout(() => setPasswordUpdateSuccess(null), 4000);
      } else {
        showToast('Failed to update password.', 'error');
      }
    } else {
      showToast('No active management session found.', 'error');
    }
  };

  const handleStartEditingOperator = (user: User) => {
    setEditingUserId(user.user_id);
    setEditingUsername(user.username);
    setEditingPassword(user.password_hash);
    setEditingTerminalId(user.terminal_id || '');
  };

  const handleUpdateOperator = (e: React.FormEvent, userId: number) => {
    e.preventDefault();
    if (!editingUsername.trim()) {
      showToast('Username cannot be empty.', 'error');
      return;
    }
    if (!editingPassword.trim()) {
      showToast('Password cannot be empty.', 'error');
      return;
    }
    if (!editingTerminalId.trim()) {
      showToast('Terminal ID cannot be empty.', 'error');
      return;
    }

    const users = RelationalDatabase.getUsers();
    // Check if duplicate username or terminal_id exists for others
    const isUsernameTaken = users.some(u => u.user_id !== userId && u.username.toLowerCase() === editingUsername.toLowerCase().trim());
    const isTerminalTaken = users.some(u => u.user_id !== userId && u.terminal_id?.toLowerCase() === editingTerminalId.toLowerCase().trim());

    if (isUsernameTaken) {
      showToast('This Username is already taken by another terminal operator.', 'error');
      return;
    }
    if (isTerminalTaken) {
      showToast('This Terminal Code is already assigned to another workstation.', 'error');
      return;
    }

    const updatedList = users.map(u => {
      if (u.user_id === userId) {
        return {
          ...u,
          username: editingUsername.trim(),
          password_hash: editingPassword.trim(),
          terminal_id: editingTerminalId.trim()
        };
      }
      return u;
    });

    RelationalDatabase.saveUsers(updatedList);
    setEditingUserId(null);
    loadData();
    showToast(`Terminal ${editingTerminalId} updated successfully.`, 'success');
  };

  const handleAddOperator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOpTerminalId.trim()) {
      showToast('Terminal ID cannot be empty.', 'error');
      return;
    }
    if (!newOpUsername.trim()) {
      showToast('Username cannot be empty.', 'error');
      return;
    }
    if (!newOpPassword.trim()) {
      showToast('Password cannot be empty.', 'error');
      return;
    }

    const users = RelationalDatabase.getUsers();
    // Check if duplicate username or terminal_id exists
    const isUsernameTaken = users.some(u => u.username.toLowerCase() === newOpUsername.toLowerCase().trim());
    const isTerminalTaken = users.some(u => u.terminal_id?.toLowerCase() === newOpTerminalId.toLowerCase().trim());

    if (isUsernameTaken) {
      showToast('This Username is already taken.', 'error');
      return;
    }
    if (isTerminalTaken) {
      showToast('This Terminal Code is already assigned.', 'error');
      return;
    }

    const nextId = users.length > 0 ? Math.max(...users.map(u => u.user_id)) + 1 : 1;
    const newOp: User = {
      user_id: nextId,
      username: newOpUsername.trim(),
      password_hash: newOpPassword.trim(),
      role: 'OPERATOR',
      is_active: true,
      terminal_id: newOpTerminalId.trim().toUpperCase()
    };

    const updatedList = [...users, newOp];
    RelationalDatabase.saveUsers(updatedList);
    
    // Reset Form
    setNewOpTerminalId('');
    setNewOpUsername('');
    setNewOpPassword('');
    setShowAddForm(false);
    loadData();

    showToast(`New terminal ${newOp.terminal_id} added successfully.`, 'success');
  };

  const handleDeleteOperatorClick = (userId: number, terminalId: string) => {
    setDeleteConfirmUser({ id: userId, terminalId });
  };

  const executeDeleteOperator = () => {
    if (!deleteConfirmUser) return;
    const { id: userId, terminalId } = deleteConfirmUser;
    const users = RelationalDatabase.getUsers();
    const updatedList = users.filter(u => u.user_id !== userId);
    RelationalDatabase.saveUsers(updatedList);
    loadData();
    setDeleteConfirmUser(null);
    showToast(`Terminal ${terminalId} deleted successfully.`, 'success');
  };

  const handleResetDB = () => {
    setShowResetConfirm(true);
  };

  const executeResetDB = () => {
    RelationalDatabase.reset();
    setDateFilter('ALL');
    
    // Explicitly load metrics with 'ALL' so update is instant
    RelationalDatabase.init();
    const activePrice = RelationalDatabase.getTicketPrice();
    const tx = RelationalDatabase.getTransactions();
    const mt = RelationalDatabase.getMetrics('ALL', customStartDate, customEndDate);
    const usersList = RelationalDatabase.getUsers();

    setTicketPrice(activePrice);
    setTransactions(tx);
    setMetrics(mt);
    setDbUsers(usersList);
    
    setSqlQuery('SELECT * FROM Transactions');
    if (activeTab === 'ACCOUNTING' && isAccountingUnlocked) {
      handleRunSql('SELECT * FROM Transactions');
    }
    
    setShowResetConfirm(false);
    showToast('Database successfully wiped and restored to standard factory seeds!', 'success');
  };

  const handleRunSql = (queryStr: string) => {
    const res = RelationalDatabase.executeQuery(queryStr);
    setSqlResult(res);
  };

  const getPercentage = (value: number, total: number) => {
    if (!total) return 0;
    return Math.round((value / total) * 100);
  };

  const getOperatorCollections = () => {
    const users = RelationalDatabase.getUsers().filter(u => u.role === 'OPERATOR');
    
    let startCutoff = 0;
    let endCutoff = Infinity;
    const now = Date.now();

    if (dateFilter === 'TODAY') {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      startCutoff = startOfToday.getTime();
    } else if (dateFilter === '15_DAYS') {
      startCutoff = now - 15 * 24 * 60 * 60 * 1000;
    } else if (dateFilter === '1_MONTH') {
      startCutoff = now - 30 * 24 * 60 * 60 * 1000;
    } else if (dateFilter === '1_YEAR') {
      startCutoff = now - 365 * 24 * 60 * 60 * 1000;
    } else if (dateFilter === 'CUSTOM') {
      if (customStartDate) {
        const s = new Date(customStartDate);
        s.setHours(0, 0, 0, 0);
        startCutoff = s.getTime();
      }
      if (customEndDate) {
        const e = new Date(customEndDate);
        e.setHours(23, 59, 59, 999);
        endCutoff = e.getTime();
      }
    }

    const filteredTx = transactions.filter(tx => {
      const txTime = new Date(tx.created_at).getTime();
      return txTime >= startCutoff && txTime <= endCutoff;
    });

    return users.map(user => {
      let cash = 0;
      let online = 0;
      let total = 0;
      let tickets = 0;

      filteredTx.forEach(tx => {
        if (tx.operator_id === user.user_id) {
          total += tx.total_amount;
          tickets += tx.quantity;
          if (tx.payment_mode === 'CASH') {
            cash += tx.total_amount;
          } else {
            online += tx.total_amount;
          }
        }
      });

      return {
        ...user,
        cash,
        online,
        total,
        tickets
      };
    });
  };

  return (
    <div className="flex flex-col gap-6" id="admin-management-dashboard">
      
      {/* Tab Navigation Controls */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center border-b border-slate-200 pb-4">
        
        {/* Navigation buttons */}
        <div className="flex gap-2 bg-slate-200/60 border border-slate-250 p-1.5 rounded-xl">
          <button
            onClick={() => setActiveTab('TICKETS_BILLS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-sans text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
              activeTab === 'TICKETS_BILLS'
                ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/40'
            }`}
          >
            <Layers size={14} />
            <span>Tickets, Bills & Tasks</span>
          </button>
          
          <button
            onClick={() => setActiveTab('ACCOUNTING')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-sans text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
              activeTab === 'ACCOUNTING'
                ? 'bg-indigo-600 text-white shadow-sm font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/40'
            }`}
          >
            {isAccountingUnlocked ? (
              <BarChart size={14} className="text-emerald-400 animate-pulse" />
            ) : (
              <Lock size={14} className="text-amber-500" />
            )}
            <span>Secure Accounting PIN & Data Persistence</span>
          </button>
        </div>

        {/* Global Reset & Log out panel */}
        <div className="flex gap-2.5">
          <button
            onClick={handleResetDB}
            className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer"
            title="Wipe database and reset seed records"
          >
            <RefreshCw size={13} />
            <span>Factory Reset DB</span>
          </button>
          
          <button
            onClick={onLogoutToPOS}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-4 py-2 text-xs font-bold transition border border-slate-950 cursor-pointer"
          >
            <Lock size={13} className="text-amber-400" />
            <span>Lock & Return to POS</span>
          </button>
        </div>
      </div>

      {/* RENDER ACTIVE TAB */}

      {/* TAB 1: TICKETS, BILLS & TASKS MANAGEMENT */}
      {activeTab === 'TICKETS_BILLS' && (
        <div className="space-y-6" id="dashboard-tickets-bills-tab">
          
          {/* Section A: Standard Ticket Rate Engine */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-xs uppercase font-mono tracking-wider text-slate-500 flex items-center gap-2">
                <Layers size={16} className="text-amber-500 stroke-[2]" />
                <span className="font-bold font-heading text-slate-700 text-sm font-sans">Standard Ticket Rate Engine</span>
              </h2>
              <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 py-1 px-3 rounded-full font-mono font-bold">
                Flat Price Architecture Active
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Active Pricing State card */}
              <div className="lg:col-span-5 bg-slate-900 text-white rounded-2xl p-6 flex flex-col justify-between border border-slate-950 shadow relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.06)_0%,transparent_70%)] pointer-events-none" />
                <div>
                  <span className="text-[9px] uppercase font-mono text-amber-400 tracking-widest border border-amber-500/20 px-2 py-0.5 rounded bg-amber-500/5">
                    Live System Pricing State
                  </span>
                  <p className="text-xs text-slate-400 font-mono mt-3 leading-relaxed">
                    Every ticket printed on the local countertop POS matches this exact flat-rate standard pricing instantly.
                  </p>
                </div>

                <div className="my-8 text-center">
                  <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">STANDARD FLAT RATE</span>
                  <span className="text-5xl font-black font-mono text-amber-400">
                    ₹{ticketPrice.toFixed(2)}
                  </span>
                </div>

                <div className="border-t border-slate-800/80 pt-4 text-[10px] text-slate-400 font-mono uppercase tracking-wider leading-relaxed">
                  ● STATUS: <strong className="text-emerald-400">ACTIVE</strong> <br />
                  ● COMPATIBILITY: <strong className="text-slate-200 font-bold">HISTORICAL IMMUTABILITY PRESERVED</strong>
                </div>
              </div>

              {/* Pricing Edit Controller */}
              <div className="lg:col-span-7 bg-slate-50 rounded-2xl p-6 border border-slate-200 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs uppercase font-mono tracking-wider text-slate-700 font-black mb-1.5 flex items-center gap-1.5">
                    <Edit size={14} className="text-slate-500" />
                    <span>Update Live Ticket Price</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 font-sans leading-relaxed mb-4">
                    Modifying this rate updates the price applied to future bookings immediately. All previously created transaction registers retain their original snapshot ticket rates to maintain perfect financial reconciliation.
                  </p>

                  <form onSubmit={handleUpdatePrice} className="space-y-4 max-w-sm">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-slate-600 uppercase font-mono font-bold">New Ticket Rate amount (INR)</label>
                      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1 focus-within:border-amber-500 transition shadow-sm">
                        <span className="text-slate-500 font-bold font-mono">₹</span>
                        <input
                          type="number"
                          required
                          min="1"
                          step="0.5"
                          placeholder="20.00"
                          value={editingPriceStr}
                          onChange={(e) => setEditingPriceStr(e.target.value)}
                          className="bg-transparent text-slate-800 font-black font-mono text-sm py-2 outline-none w-full"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isUpdatingPrice}
                      className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 px-4 rounded-xl transition text-xs uppercase tracking-wider cursor-pointer active:scale-98 shadow flex items-center justify-center gap-1.5"
                    >
                      {isUpdatingPrice ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          <span>Compiling to local POS...</span>
                        </>
                      ) : (
                        <span>Compile New Ticket price</span>
                      )}
                    </button>
                  </form>
                </div>

                <div className="text-[10px] text-amber-800 bg-amber-50/50 border border-amber-200/50 rounded-xl p-3 leading-normal font-sans mt-4">
                  <strong>Operational Rule:</strong> Demographics selections are completely bypassed. All countertop entries are quantity-only, multiplying strictly by the standard pricing state defined above.
                </div>
              </div>
            </div>
          </div>

          {/* Section B: Transaction Journal Logs / Bills List */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-3 border-b border-slate-100">
              <div className="flex flex-col">
                <h3 className="text-sm font-bold text-slate-800 font-heading flex items-center gap-2 font-sans">
                  <ListOrdered size={16} className="text-amber-500" />
                  <span>Transaction Journal Logs & Bills List</span>
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">Filter and reprint printed countertop invoices</span>
              </div>
              
              {/* Date Filters Selector */}
              <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-end">
                {[
                  { label: 'Today', value: 'TODAY' },
                  { label: '15 Days', value: '15_DAYS' },
                  { label: '1 Month', value: '1_MONTH' },
                  { label: 'All', value: 'ALL' },
                  { label: 'Custom', value: 'CUSTOM' },
                ].map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setDateFilter(filter.value as any)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      dateFilter === filter.value
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Conditional Custom Date Inputs */}
            {dateFilter === 'CUSTOM' && (
              <div className="bg-amber-500/5 border border-amber-200/50 rounded-2xl p-4 flex flex-col md:flex-row items-end gap-4 shadow-sm">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">From Date (YYYY-MM-DD)</label>
                    <div className="relative">
                      <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">To Date (YYYY-MM-DD)</label>
                    <div className="relative">
                      <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {transactions.length === 0 ? (
              <p className="text-xs text-slate-400 font-mono text-center py-12">
                No transaction records found in the database.
              </p>
            ) : (
              <div className="overflow-y-auto max-h-[350px] border border-slate-150 rounded-xl">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 uppercase text-[9px] tracking-wider font-bold">
                      <th className="py-2.5 px-3">TX ID</th>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Operator</th>
                      <th className="py-2.5 px-3 text-center">Payment Mode</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Rate</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                      <th className="py-2.5 px-3 text-center">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {transactions.map((tx) => {
                      const txTime = new Date(tx.created_at).getTime();
                      let isMatched = true;
                      let startCutoff = 0;
                      let endCutoff = Infinity;
                      
                      if (dateFilter === 'TODAY') {
                        const start = new Date(); start.setHours(0,0,0,0); startCutoff = start.getTime();
                      } else if (dateFilter === '15_DAYS') {
                        startCutoff = Date.now() - 15 * 24 * 60 * 60 * 1000;
                      } else if (dateFilter === '1_MONTH') {
                        startCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
                      } else if (dateFilter === 'CUSTOM') {
                        if (customStartDate) {
                          const s = new Date(customStartDate);
                          s.setHours(0, 0, 0, 0);
                          startCutoff = s.getTime();
                        }
                        if (customEndDate) {
                          const e = new Date(customEndDate);
                          e.setHours(23, 59, 59, 999);
                          endCutoff = e.getTime();
                        }
                      }
                      
                      if (startCutoff > 0 && txTime < startCutoff) isMatched = false;
                      if (txTime > endCutoff) isMatched = false;

                      const opName = tx.operator_id === 1 ? 'operator1' : tx.operator_id === 2 ? 'operator2' : 'admin';

                      return (
                        <tr 
                          key={tx.transaction_id} 
                          className={`transition ${isMatched ? 'bg-white hover:bg-slate-50/70' : 'bg-slate-50/50 text-slate-400 opacity-60'}`}
                        >
                          <td className="py-2 px-3 font-bold font-mono text-slate-900">#RD-{tx.transaction_id}</td>
                          <td className="py-2 px-3 text-[10px]">
                            {new Date(tx.created_at).toLocaleString('en-IN', {
                              day: '2-digit', month: '2-digit', year: 'numeric',
                              hour: '2-digit', minute: '2-digit', hour12: true
                            }).replace(/\//g, '-')}
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-600 uppercase text-[10px]">{opName}</td>
                          <td className="py-2 px-3 text-center">
                            <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded ${
                              tx.payment_mode === 'CASH' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' 
                                : 'bg-indigo-50 text-indigo-700 border border-indigo-150'
                            }`}>
                              {tx.payment_mode}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-slate-900">{tx.quantity}</td>
                          <td className="py-2 px-3 text-right text-slate-500">₹{tx.ticket_price.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">₹{tx.total_amount.toFixed(2)}</td>
                          <td className="py-2 px-3 text-center">
                            <button
                              onClick={() => setSelectedReprintTx(tx)}
                              className="bg-amber-500 hover:bg-amber-400 text-slate-950 p-1.5 rounded-lg transition cursor-pointer active:scale-90"
                              title="Reprint Bill Receipt"
                            >
                              <Printer size={12} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section C: Simple Task Utilities */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Change Management Password */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
              <h3 className="text-xs uppercase font-mono tracking-wider text-slate-700 font-black mb-1.5 flex items-center gap-1.5">
                <Key size={14} className="text-amber-500" />
                <span>Change Management Password</span>
              </h3>
              <p className="text-[11px] text-slate-500 font-sans leading-relaxed mb-4">
                To preserve security of the main Management session, you can dynamically update your active password. The username remains <strong className="font-bold">admin</strong>.
              </p>

              <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-600 uppercase font-mono font-bold">New Management Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter New Secure Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono outline-none focus:border-amber-500 transition shadow-sm text-slate-800"
                  />
                </div>

                {passwordUpdateSuccess && (
                  <div className="text-emerald-600 font-mono text-[10px] bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                    {passwordUpdateSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-xl transition text-xs uppercase tracking-wider cursor-pointer active:scale-98 shadow flex items-center justify-center gap-1.5"
                >
                  <span>Save New Password</span>
                </button>
              </form>
            </div>

            {/* Quick Factory Reset */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-xs uppercase font-mono tracking-wider text-slate-700 font-black mb-1.5 flex items-center gap-1.5">
                  <RefreshCw size={14} className="text-rose-500" />
                  <span>Database Operations</span>
                </h3>
                <p className="text-[11px] text-slate-500 font-sans leading-relaxed mb-4">
                  Restore the terminal memory database to factory standards. Wipes all counter logs, sets the flat rate back to ₹20.00, and restores default users. This task is irreversible.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleResetDB}
                  className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-2.5 px-4 rounded-xl transition text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2 shadow"
                >
                  <RefreshCw size={13} />
                  <span>Factory Reset Database Log</span>
                </button>
                <div className="text-[9px] text-slate-400 font-mono leading-tight">
                  Wipes raw registers and seeds default historical logs.
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: SECURE ACCOUNTING PIN & DATA PERSISTENCE */}
      {activeTab === 'ACCOUNTING' && (
        <div id="dashboard-accounting-secure-tab">
          
          {/* A. If Locked, Render Access Security Screen */}
          {!isAccountingUnlocked ? (
            <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-3xl shadow-lg p-8 my-12 text-center space-y-6">
              
              <div className="flex justify-center">
                <div className="bg-indigo-50 text-indigo-600 p-4 rounded-full border border-indigo-100 relative animate-pulse">
                  <Lock size={32} />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full border-2 border-white" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-bold text-slate-800 font-sans">Secure Accounting PIN & Data Persistence Lock</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-sans px-2">
                  This terminal section contains financial profit indicators, operator sales collections, and relational query tools. Enter the dynamic accounting password to authorize access.
                </p>
              </div>

              <form onSubmit={handleUnlockAccounting} className="space-y-4">
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-[10px] text-slate-600 uppercase font-mono font-bold">Accounting Password PIN</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter Accounting Password"
                    value={accountingPasswordInput}
                    onChange={(e) => setAccountingPasswordInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono outline-none focus:border-indigo-600 focus:bg-white transition text-slate-800 shadow-sm"
                  />
                </div>

                {accountingUnlockError && (
                  <p className="text-rose-600 text-[10px] font-mono bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-center animate-shake">
                    {accountingUnlockError}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl transition text-xs uppercase tracking-wider cursor-pointer active:scale-98 shadow flex items-center justify-center gap-1.5"
                >
                  <Unlock size={13} />
                  <span>Authorize Accounting Panel</span>
                </button>
              </form>

              <div className="border-t border-slate-100 pt-4 flex flex-col items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-mono">
                  Initial Pin Code: <strong className="font-bold text-slate-600 font-mono">acc123</strong>
                </span>
                <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono">
                  System: AES-256 Memory Emulation
                </span>
              </div>

            </div>
          ) : (
            
            // B. If Unlocked, Render Secure Accounting PIN & Data Persistence
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Authorized Header bar */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500 text-white p-2 rounded-xl">
                    <Unlock size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wide font-sans">Secure Accounting PIN & Data Persistence Session Authorized</h4>
                    <p className="text-[10px] text-emerald-600 font-mono">All metrics are reading live from internal table instances</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Lock session button */}
                  <button
                    onClick={handleLockAccounting}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] uppercase tracking-wider font-bold py-2 px-4 rounded-xl border border-slate-950 transition cursor-pointer shadow flex items-center gap-1.5"
                  >
                    <Lock size={12} className="text-amber-400" />
                    <span>Lock Session</span>
                  </button>
                </div>
              </div>

              {/* PRD Accounting Timeframe Filters Row */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-700 font-sans">Accounting Timeframe Scope</span>
                  <span className="text-[10px] text-slate-400 font-mono">Select a scope below to filter analytics and charts live</span>
                </div>
                
                <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  {[
                    { label: 'Today', value: 'TODAY' },
                    { label: 'Last 15 Days', value: '15_DAYS' },
                    { label: 'Last 1 Month', value: '1_MONTH' },
                    { label: 'Last 1 Year', value: '1_YEAR' },
                    { label: 'All Time', value: 'ALL' },
                    { label: 'Custom Range', value: 'CUSTOM' },
                  ].map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => setDateFilter(filter.value as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        dateFilter === filter.value
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional Custom Date Inputs */}
              {dateFilter === 'CUSTOM' && (
                <div className="bg-indigo-500/5 border border-indigo-200/50 rounded-2xl p-4 flex flex-col md:flex-row items-end gap-4 shadow-sm">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">From Date (YYYY-MM-DD)</label>
                      <div className="relative">
                        <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          className="w-full pl-10 pr-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">To Date (YYYY-MM-DD)</label>
                      <div className="relative">
                        <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className="w-full pl-10 pr-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Key Metrics Grid */}
              {metrics && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Gross Profit */}
                  <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between shadow-sm">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">Gross profit</span>
                      <span className="text-2xl font-black font-mono text-slate-900 mt-1">₹{metrics.totalRevenue.toFixed(2)}</span>
                      <span className="text-[9px] text-emerald-600 font-mono mt-1.5 flex items-center gap-1">
                        <TrendingUp size={12} />
                        <span>Financial audit log synced</span>
                      </span>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 text-amber-600 p-3 rounded-xl">
                      <DollarSign size={24} />
                    </div>
                  </div>

                  {/* Total Tickets Sold */}
                  <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between shadow-sm">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">Total tickets sold</span>
                      <span className="text-2xl font-black font-mono text-slate-900 mt-1">{metrics.totalTicketsSold}</span>
                      <span className="text-[9px] text-slate-500 font-mono mt-1.5">Counter print ledger volume</span>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 text-amber-600 p-3 rounded-xl">
                      <ListOrdered size={24} />
                    </div>
                  </div>

                  {/* Cash Revenue */}
                  <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between shadow-sm">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">Cash Revenue Split</span>
                      <span className="text-2xl font-black font-mono text-emerald-600 mt-1">₹{metrics.cashRevenue.toFixed(2)}</span>
                      <span className="text-[9px] text-slate-500 font-mono mt-1.5">
                        {getPercentage(metrics.cashRevenue, metrics.totalRevenue)}% of gross profit
                      </span>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 p-3 rounded-xl">
                      <span className="font-mono font-black text-xs">CASH</span>
                    </div>
                  </div>

                  {/* Online QR */}
                  <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between shadow-sm">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">Online QR Split</span>
                      <span className="text-2xl font-black font-mono text-indigo-600 mt-1">₹{metrics.onlineRevenue.toFixed(2)}</span>
                      <span className="text-[9px] text-slate-500 font-mono mt-1.5">
                        {getPercentage(metrics.onlineRevenue, metrics.totalRevenue)}% of gross profit
                      </span>
                    </div>
                    <div className="bg-indigo-50 border border-indigo-200 text-indigo-600 p-3 rounded-xl">
                      <span className="font-mono font-black text-xs">ONLINE</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Graphic Split & operator Performance Row */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Revenue donut split */}
                {metrics && (
                  <div className="lg:col-span-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                    <h3 className="text-xs uppercase font-mono tracking-wider text-slate-500 mb-6 font-bold">Revenue split graph</h3>
                    
                    <div className="relative flex items-center justify-center py-4">
                      {metrics.totalRevenue === 0 ? (
                        <p className="text-xs text-slate-400 font-mono">No transactions in selected scope.</p>
                      ) : (
                        <>
                          <svg width="180" height="180" viewBox="0 0 100 100" className="transform -rotate-90">
                            {(() => {
                              const r = 35;
                              const c = 2 * Math.PI * r;
                              const cashPct = metrics.cashRevenue / metrics.totalRevenue;
                              const cashDash = cashPct * c;
                              const onlineDash = c - cashDash;
                              return (
                                <>
                                  <circle cx="50" cy="50" r={r} fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
                                  <circle 
                                    cx="50" 
                                    cy="50" 
                                    r={r} 
                                    fill="transparent" 
                                    stroke="#10b981" 
                                    strokeWidth="12" 
                                    strokeDasharray={`${cashDash} ${c}`}
                                    strokeDashoffset="0"
                                  />
                                  <circle 
                                    cx="50" 
                                    cy="50" 
                                    r={r} 
                                    fill="transparent" 
                                    stroke="#6366f1" 
                                    strokeWidth="12" 
                                    strokeDasharray={`${onlineDash} ${c}`}
                                    strokeDashoffset={-cashDash}
                                  />
                                </>
                              );
                            })()}
                          </svg>
                          
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                            <span className="text-[9px] text-slate-400 uppercase font-mono">REVENUE</span>
                            <span className="text-lg font-black text-slate-900 font-mono mt-0.5 font-mono">₹{metrics.totalRevenue.toFixed(0)}</span>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4 border-t border-slate-100 pt-4">
                      <div className="flex flex-col items-center border-r border-slate-100">
                        <div className="flex items-center gap-1 text-[11px] text-slate-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="font-bold">CASH ({getPercentage(metrics.cashRevenue, metrics.totalRevenue)}%)</span>
                        </div>
                        <span className="text-xs font-bold text-slate-900 mt-1 font-mono">₹{metrics.cashRevenue.toFixed(2)}</span>
                      </div>

                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1 text-[11px] text-slate-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          <span className="font-bold">ONLINE ({getPercentage(metrics.onlineRevenue, metrics.totalRevenue)}%)</span>
                        </div>
                        <span className="text-xs font-bold text-slate-900 mt-1 font-mono">₹{metrics.onlineRevenue.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Operator Revenue attribution */}
                <div className="lg:col-span-8 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-3">
                    <div className="flex flex-col">
                      <h3 className="text-xs uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                        <span>Operator Collections Attribution</span>
                      </h3>
                      <span className="text-[9px] text-slate-400 font-mono font-medium">Workstation cash drawer vs QR receipts</span>
                    </div>

                    {/* Filter Dropdown Controls */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-mono font-bold text-slate-400 uppercase">View:</span>
                      <div className="relative inline-block">
                        <select
                          id="collections-view-select"
                          value={collectionsView}
                          onChange={(e) => setCollectionsView(e.target.value as 'ACTIVE' | 'ALL')}
                          className="appearance-none bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-1 px-7 pr-8 rounded-xl text-[10px] uppercase tracking-wider transition border border-slate-200 outline-none cursor-pointer font-sans"
                        >
                          <option value="ACTIVE">Active Only ({getOperatorCollections().filter(op => op.tickets > 0).length})</option>
                          <option value="ALL">All Terminals ({getOperatorCollections().length})</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                          <ChevronDown size={12} className="stroke-[2.5]" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(() => {
                      const allCollections = getOperatorCollections();
                      const activeCollections = allCollections.filter(op => op.tickets > 0);
                      const displayedCollections = collectionsView === 'ACTIVE' ? activeCollections : allCollections;

                      if (displayedCollections.length === 0) {
                        return (
                          <div className="col-span-full py-10 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2">
                            <span className="text-slate-400 bg-slate-100 p-2 rounded-full">
                              <Info size={16} />
                            </span>
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-slate-700 font-sans">No active collections found in this timeframe</p>
                              <p className="text-[10px] text-slate-400 font-mono">All operator terminals have ₹0.00 collections for {dateFilter}.</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setCollectionsView('ALL')}
                              className="mt-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold px-3 py-1.5 rounded-lg text-[10px] uppercase font-sans tracking-wide transition cursor-pointer"
                            >
                              Show All Terminals
                            </button>
                          </div>
                        );
                      }

                      return displayedCollections.map((op) => (
                        <div key={op.user_id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 relative overflow-hidden flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black font-mono text-slate-800 uppercase flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${op.tickets > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-350'}`} />
                                <span>{op.username}</span>
                              </span>
                              <span className="text-[9px] bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded uppercase font-mono">
                                Terminal {op.user_id}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-center py-2">
                              <div className="bg-white border border-slate-150 p-2 rounded-lg">
                                <span className="text-[9px] font-mono text-slate-400 block uppercase">Cash Revenue</span>
                                <span className="text-xs font-bold text-emerald-600 font-mono">₹{op.cash.toFixed(2)}</span>
                              </div>
                              <div className="bg-white border border-slate-150 p-2 rounded-lg">
                                <span className="text-[9px] font-mono text-slate-400 block uppercase">Online Revenue</span>
                                <span className="text-xs font-bold text-indigo-600 font-mono">₹{op.online.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1 pt-2 border-t border-slate-200/60">
                            <div className="flex justify-between items-center font-mono text-xs">
                              <span className="text-slate-400 text-[10px]">Tickets Sold:</span>
                              <span className="font-bold text-slate-800">{op.tickets}</span>
                            </div>
                            <div className="flex justify-between items-center font-mono text-xs">
                              <span className="text-slate-900 font-bold text-[10px] uppercase">Total Collected:</span>
                              <span className="font-black text-indigo-600 text-sm">₹{op.total.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>

                  {getOperatorCollections().filter(op => op.tickets === 0).length > 0 && (
                    <div className="flex justify-center pt-2 border-t border-slate-100/60">
                      <button
                        type="button"
                        onClick={() => setCollectionsView(collectionsView === 'ACTIVE' ? 'ALL' : 'ACTIVE')}
                        className="text-[10px] font-extrabold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition cursor-pointer font-sans uppercase tracking-wider bg-indigo-50/50 hover:bg-indigo-100 border border-indigo-100/75 px-3 py-1.5 rounded-xl"
                      >
                        {collectionsView === 'ACTIVE' ? (
                          <>
                            <span>Show All Terminals ({getOperatorCollections().length})</span>
                            <ChevronDown size={12} className="stroke-[2.5]" />
                          </>
                        ) : (
                          <>
                            <span>Minimize to Active Terminals Only</span>
                            <ChevronUp size={12} className="stroke-[2.5]" />
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

              </div>

              {/* Operator Terminals & Credentials Configuration Panel */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-150 pb-4">
                  <div>
                    <h3 className="text-xs uppercase font-mono tracking-wider text-indigo-800 font-bold flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
                      <span>Operator Terminals & Credentials Settings</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 font-sans mt-1">
                      Manage all 10 Operator terminal IDs, login usernames, and security PIN passwords live.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-wider px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-sm hover:shadow active:scale-95 cursor-pointer self-start sm:self-center"
                  >
                    <Plus size={12} />
                    <span>{showAddForm ? 'Hide Form' : 'Add Operator Terminal'}</span>
                  </button>
                </div>

                {/* Collapsible Add New Operator Terminal Form */}
                {showAddForm && (
                  <form onSubmit={handleAddOperator} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="border-b border-slate-200/60 pb-2">
                      <h4 className="text-xs font-bold text-slate-700 font-mono uppercase tracking-wider">Configure New Operator Terminal Node</h4>
                      <p className="text-[10px] text-slate-400 font-sans">Set unique workstation IDs and custom login profiles.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">Terminal Code / ID</label>
                        <input
                          type="text"
                          required
                          value={newOpTerminalId}
                          onChange={(e) => setNewOpTerminalId(e.target.value.toUpperCase())}
                          placeholder="e.g. RD-11"
                          className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 outline-none transition"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">Operator Username</label>
                        <input
                          type="text"
                          required
                          value={newOpUsername}
                          onChange={(e) => setNewOpUsername(e.target.value)}
                          placeholder="e.g. operator11"
                          className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 outline-none transition"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">Security PIN Password</label>
                        <input
                          type="text"
                          required
                          value={newOpPassword}
                          onChange={(e) => setNewOpPassword(e.target.value)}
                          placeholder="e.g. op999"
                          className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 outline-none transition"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddForm(false);
                          setNewOpTerminalId('');
                          setNewOpUsername('');
                          setNewOpPassword('');
                        }}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2 rounded-xl text-[10px] uppercase font-sans tracking-wide transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-5 py-2 rounded-xl text-[10px] uppercase font-sans tracking-wide transition cursor-pointer shadow-sm"
                      >
                        Create Station
                      </button>
                    </div>
                  </form>
                )}

                {operatorUpdateSuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 text-xs font-mono">
                    ✓ {operatorUpdateSuccess}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dbUsers.filter(u => u.role === 'OPERATOR').map((op) => {
                    const isEditing = editingUserId === op.user_id;
                    return (
                      <div 
                        key={op.user_id} 
                        className={`border rounded-xl p-4 transition-all duration-200 flex flex-col justify-between ${
                          isEditing 
                            ? 'border-indigo-600 ring-2 ring-indigo-500/10 bg-slate-50/50' 
                            : 'border-slate-200 hover:border-slate-300 bg-white shadow-sm'
                        }`}
                      >
                        {isEditing ? (
                          <form onSubmit={(e) => handleUpdateOperator(e, op.user_id)} className="space-y-3.5">
                            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                              <span className="text-[10px] font-black font-mono text-indigo-700">EDIT TERMINAL #{op.user_id}</span>
                              <span className="text-[9px] bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded uppercase font-mono">Editing</span>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] uppercase font-mono font-bold text-slate-500">Terminal Code</label>
                              <input 
                                type="text"
                                value={editingTerminalId}
                                onChange={(e) => setEditingTerminalId(e.target.value.toUpperCase())}
                                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-800 outline-none focus:border-indigo-500"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] uppercase font-mono font-bold text-slate-500">Username</label>
                              <input 
                                type="text"
                                value={editingUsername}
                                onChange={(e) => setEditingUsername(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-800 outline-none focus:border-indigo-500"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] uppercase font-mono font-bold text-slate-500">Security PIN Password</label>
                              <input 
                                type="text"
                                value={editingPassword}
                                onChange={(e) => setEditingPassword(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-800 outline-none focus:border-indigo-500"
                              />
                            </div>

                            <div className="flex gap-2 pt-2">
                              <button
                                type="submit"
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] uppercase font-sans tracking-wide transition cursor-pointer"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingUserId(null)}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-1.5 px-3 rounded-lg text-[10px] uppercase font-sans tracking-wide transition cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="h-full flex flex-col justify-between space-y-4">
                            <div>
                              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                                <span className="text-xs font-extrabold font-mono text-slate-800 uppercase flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span>{op.username}</span>
                                </span>
                                <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100/50 font-black px-2 py-0.5 rounded font-mono">
                                  {op.terminal_id || `RD-${String(op.user_id).padStart(2, '0')}`}
                                </span>
                              </div>

                              <div className="space-y-1.5 pt-2 text-[11px] font-mono">
                                <div className="flex justify-between">
                                  <span className="text-slate-400">Terminal ID:</span>
                                  <span className="font-bold text-slate-700">{op.user_id}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-400">Username:</span>
                                  <span className="font-bold text-slate-700">{op.username}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-400">Security PIN:</span>
                                  <span className="font-bold text-slate-900 bg-slate-100 border border-slate-200/50 px-1.5 py-0.5 rounded">{op.password_hash}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2 mt-3">
                              <button
                                type="button"
                                onClick={() => handleStartEditingOperator(op)}
                                className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 font-bold py-1.5 px-2 rounded-lg text-[10px] uppercase font-sans tracking-wide transition cursor-pointer flex items-center justify-center gap-1"
                              >
                                <Edit size={10} />
                                <span>Configure</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteOperatorClick(op.user_id, op.terminal_id || `RD-${op.user_id}`)}
                                className="bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 text-rose-700 font-bold py-1.5 px-2 rounded-lg text-[10px] uppercase font-sans tracking-wide transition cursor-pointer flex items-center justify-center gap-1"
                                title="Delete Operator Terminal Node"
                              >
                                <Trash size={10} />
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* C. Change Accounting Password Form */}
              <div className="bg-slate-900 text-white border border-slate-950 rounded-2xl p-6 shadow">
                <div className="max-w-xl">
                  <h3 className="text-xs uppercase font-mono tracking-widest text-amber-400 font-black mb-1.5 flex items-center gap-1.5">
                    <Key size={14} className="text-amber-400" />
                    <span>Change Accounting Password</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-sans leading-relaxed mb-4">
                    Secure Accounting PIN & Data Persistence has its own distinct PIN lock to prevent general operators or managers from viewing high-level profits. Change this password here to lock down the system immediately.
                  </p>

                  <form onSubmit={handleChangeAccountingPassword} className="space-y-4 max-w-sm">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-slate-300 uppercase font-mono font-bold">New Secure Accounting Password</label>
                      <input
                        type="text"
                        required
                        placeholder="Enter New Accounting Password"
                        value={newAccountingPassword}
                        onChange={(e) => setNewAccountingPassword(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono outline-none focus:border-amber-400 transition text-white shadow-inner"
                      />
                    </div>

                    {accountingPasswordChangeSuccess && (
                      <div className="text-emerald-400 font-mono text-[10px] bg-emerald-950/40 border border-emerald-900 rounded-xl p-3">
                        {accountingPasswordChangeSuccess}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 px-4 rounded-xl transition text-xs uppercase tracking-wider cursor-pointer active:scale-98 shadow flex items-center justify-center gap-1.5"
                    >
                      <span>Update Accounting Password</span>
                    </button>
                  </form>
                </div>
              </div>

              {/* D. SQL Console / Relational Database Console Section */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4">
                {/* Schema visualizer */}
                <div className="lg:col-span-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4 font-mono text-xs text-slate-600">
                  <h3 className="text-xs uppercase tracking-wider text-slate-500 font-bold flex items-center gap-2">
                    <Database size={14} className="text-indigo-600" />
                    <span>Two-Table Secure Relational Schema</span>
                  </h3>

                  <div className="space-y-5">
                    {/* Table A: Users */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <p className="text-indigo-800 font-bold text-[10px] uppercase border-b border-slate-200 pb-1 mb-2 font-bold">
                        TABLE: Users (Authentication)
                      </p>
                      <ul className="space-y-1.5 text-[10px]">
                        <li>
                          <strong className="text-slate-800 font-bold">user_id</strong> 
                          <span className="text-slate-400 font-medium"> SERIAL (PK)</span>
                        </li>
                        <li>
                          <span className="text-slate-800">username</span> 
                          <span className="text-slate-400 font-medium"> VARCHAR(50)</span>
                        </li>
                        <li>
                          <span className="text-slate-800">password_hash</span> 
                          <span className="text-slate-400 font-medium"> TEXT</span>
                        </li>
                        <li>
                          <span className="text-slate-800 font-semibold">role</span> 
                          <span className="text-slate-400 font-medium"> VARCHAR(20)</span>
                        </li>
                      </ul>
                    </div>

                    {/* Table B: Transactions */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <p className="text-indigo-800 font-bold text-[10px] uppercase border-b border-slate-200 pb-1 mb-2 font-bold">
                        TABLE: Transactions (Financials)
                      </p>
                      <ul className="space-y-1.5 text-[10px]">
                        <li>
                          <strong className="text-slate-800 font-bold">transaction_id</strong> 
                          <span className="text-slate-400 font-medium"> SERIAL (PK)</span>
                        </li>
                        <li>
                          <strong className="text-slate-800">operator_id</strong> 
                          <span className="text-slate-400 font-medium"> INT (FK)</span>
                        </li>
                        <li>
                          <span className="text-slate-800">quantity</span> 
                          <span className="text-slate-400 font-medium"> INT</span>
                        </li>
                        <li>
                          <span className="text-slate-800">ticket_price</span> 
                          <span className="text-slate-400 font-medium"> DECIMAL(10,2)</span>
                        </li>
                        <li>
                          <span className="text-slate-800">total_amount</span> 
                          <span className="text-slate-400 font-medium"> DECIMAL(10,2)</span>
                        </li>
                        <li>
                          <span className="text-slate-800 font-semibold">payment_mode</span> 
                          <span className="text-slate-400 font-medium"> VARCHAR(10)</span>
                        </li>
                        <li>
                          <span className="text-slate-800">created_at</span> 
                          <span className="text-slate-400 font-medium"> TIMESTAMP</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Raw SQL Query Sandbox */}
                <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="bg-slate-900 border-b border-slate-950 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Terminal size={14} className="text-emerald-400" />
                      <span className="text-xs uppercase font-mono tracking-wider text-emerald-400 font-bold">SQL Query Console</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono font-medium">SQLite Emulation Core</span>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Fast presets */}
                    <div className="space-y-1.5">
                      <span className="text-[9px] uppercase font-mono tracking-widest text-slate-400 block font-bold">
                        Fast Query Presets (Click to Load & Run)
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {[
                          'SELECT * FROM Users',
                          'SELECT * FROM Transactions',
                          'SELECT * FROM Transactions JOIN Users ON Transactions.operator_id = Users.user_id',
                          'SELECT payment_mode, SUM(quantity) as TICKETS_SOLD, SUM(total_amount) as REVENUE_SUM FROM Transactions GROUP BY payment_mode'
                        ].map((q) => (
                          <button
                            key={q}
                            onClick={() => {
                              setSqlQuery(q);
                              handleRunSql(q);
                            }}
                            className="text-[9px] font-mono bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg px-2.5 py-1.5 transition cursor-pointer font-bold animate-pulse-slow"
                          >
                            {q.includes('JOIN') ? 'Join query' : q.includes('Users') ? 'Select Users' : q.includes('GROUP BY') ? 'Group by mode' : 'Select Transactions'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Raw Input and execution */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={sqlQuery}
                        onChange={(e) => setSqlQuery(e.target.value)}
                        placeholder="SELECT * FROM Transactions..."
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 font-mono outline-none focus:ring-1 focus:ring-indigo-600"
                      />
                      <button
                        onClick={() => handleRunSql(sqlQuery)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 rounded-xl transition text-xs flex items-center gap-1.5 cursor-pointer active:scale-98 shadow"
                      >
                        <Play size={13} fill="currentColor" />
                        <span>Run Query</span>
                      </button>
                    </div>

                    {/* Query output */}
                    {sqlResult && (
                      <div className="border border-slate-150 rounded-lg overflow-hidden bg-slate-950 p-4 text-xs font-mono">
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-1.5 mb-3 font-bold">
                          Query compilation: <span className="text-emerald-400">Success (0.21ms)</span>
                        </p>

                        {sqlResult.error ? (
                          <div className="text-rose-400 space-y-1">
                            <p className="font-bold">Execution Error:</p>
                            <p>{sqlResult.error}</p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-slate-300">
                              <thead>
                                <tr className="border-b border-slate-800 text-slate-400 font-bold">
                                  {sqlResult.columns.map((col, index) => (
                                    <th key={index} className="py-1.5 px-2 text-[10px] uppercase font-black text-slate-300">{col}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-900">
                                {sqlResult.rows.map((row, rIndex) => (
                                  <tr key={rIndex} className="hover:bg-slate-900/40">
                                    {row.map((val: any, cIndex: number) => (
                                      <td key={cIndex} className="py-2 px-2 text-[11px] font-medium">{String(val)}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* RENDER DYNAMIC REPRINT BILL DIALOG FOR MANAGEMENT */}
      {selectedReprintTx && (
        <ReceiptPrinter
          transaction={selectedReprintTx}
          onClose={() => setSelectedReprintTx(null)}
        />
      )}

      {/* FACTORY RESET CONFIRMATION DIALOG MODAL */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl relative space-y-6 text-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="bg-rose-100 text-rose-600 p-3 rounded-full shrink-0">
                <AlertCircle size={24} className="stroke-[2.5]" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-extrabold font-sans text-slate-900 uppercase tracking-tight">Irreversible Database Wipe</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-sans">
                  Are you absolutely sure you want to restore the terminal database to factory standards? This will permanently erase all transaction registers, wipe out operator terminals, and reset the ticket rate to ₹20.00. This action is irreversible.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeResetDB}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer shadow-md shadow-rose-500/20"
              >
                Wipe & Seed DB
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OPERATOR DELETE CONFIRMATION DIALOG MODAL */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl relative space-y-6 text-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="bg-amber-100 text-amber-600 p-3 rounded-full shrink-0">
                <Trash size={24} className="stroke-[2.5]" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-extrabold font-sans text-slate-900 uppercase tracking-tight">Delete Operator Workstation</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-sans">
                  Are you sure you want to permanently delete Operator Terminal <strong className="text-slate-800 font-mono font-bold">{deleteConfirmUser.terminalId}</strong>? They will immediately lose Point-of-Sale ticketing privileges.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDeleteOperator}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer shadow-md shadow-rose-500/20"
              >
                Delete Terminal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HIGH-QUALITY NOTIFICATION TOAST OVERLAY */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 flex items-center gap-3.5 max-w-sm animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="shrink-0">
            {toast.type === 'success' ? (
              <div className="bg-emerald-500/10 text-emerald-400 p-2 rounded-xl">
                <CheckCircle size={18} />
              </div>
            ) : toast.type === 'error' ? (
              <div className="bg-rose-500/10 text-rose-400 p-2 rounded-xl">
                <AlertCircle size={18} />
              </div>
            ) : (
              <div className="bg-indigo-500/10 text-indigo-400 p-2 rounded-xl">
                <Info size={18} />
              </div>
            )}
          </div>
          <div className="flex-1 font-sans text-xs font-semibold text-slate-100 pr-2 leading-snug">
            {toast.message}
          </div>
          <button 
            onClick={() => setToast(null)}
            className="text-slate-500 hover:text-slate-300 transition p-1 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

    </div>
  );
}
