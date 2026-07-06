import React, { useState, useEffect } from 'react';
import { Plus, Minus, Trash2, Coins, QrCode, Ticket, ArrowRight, Printer, AlertTriangle, CheckCircle, AlertCircle, X, Info } from 'lucide-react';
import { PaymentMode, Transaction, User } from '../types';
import { RelationalDatabase } from '../db';

interface OperatorPOSProps {
  onTransactionCompleted: (transaction: Transaction) => void;
  currentUser: User | null;
}

export default function OperatorPOS({ onTransactionCompleted, currentUser }: OperatorPOSProps) {
  const [quantity, setQuantity] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [ticketPrice, setTicketPrice] = useState<number>(20.0);
  const [usersList, setUsersList] = useState<User[]>([]);

  // Custom Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => prev && prev.message === message ? null : prev);
    }, 4000);
  };

  // Sync recent transactions and price
  const loadRecentLogs = () => {
    RelationalDatabase.init();
    const txList = RelationalDatabase.getTransactions();
    setRecentTransactions(txList.slice(0, 5)); // show last 5
    setTicketPrice(RelationalDatabase.getTicketPrice());
    setUsersList(RelationalDatabase.getUsers());
  };

  useEffect(() => {
    loadRecentLogs();
  }, []);

  // Handle Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if input/textarea is focused
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      // Check numeric keys 0-9 to input quantity
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        setQuantity(prev => {
          const newQty = parseInt(`${prev === 0 ? '' : prev}${e.key}`);
          return isNaN(newQty) || newQty > 999 ? prev : newQty;
        });
      }

      // Backspace to delete last digit
      if (e.key === 'Backspace') {
        e.preventDefault();
        setQuantity(prev => {
          const str = prev.toString();
          if (str.length <= 1) return 0;
          return parseInt(str.slice(0, -1)) || 0;
        });
      }

      // Toggle Payment Mode
      if (e.key === 'F1' || e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        setPaymentMode('CASH');
      }
      if (e.key === 'F2' || e.key === 'o' || e.key === 'O') {
        e.preventDefault();
        setPaymentMode('ONLINE');
      }

      // Clear Cart (Escape)
      if (e.key === 'Escape') {
        e.preventDefault();
        setQuantity(0);
      }

      // Process Checkout (Space)
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        handleCheckout();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quantity, paymentMode, ticketPrice]);

  // Preset Handlers
  const applyPreset = (amount: number) => {
    setQuantity(prev => {
      const next = prev + amount;
      return next > 999 ? 999 : next < 0 ? 0 : next;
    });
  };

  const grandTotal = quantity * ticketPrice;

  // Submit transaction
  const handleCheckout = () => {
    if (quantity <= 0) return;

    try {
      const transaction = RelationalDatabase.processTransaction(quantity, paymentMode, currentUser?.user_id || 1);

      // Trigger callback to render receipt modal
      onTransactionCompleted(transaction);
      
      // Reset quantity back to default
      setQuantity(0);
      
      // Refresh recent logs
      loadRecentLogs();
    } catch (err: any) {
      showToast(`Booking failed: ${err.message}`, 'error');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start h-full animate-in fade-in duration-300" id="operator-pos-grid">
      
      {/* LEFT COLUMN: Quantity Console & Presets & Logs (8/12 space) */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        
        {/* Main POS Quantity Input Controller Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative">
          
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
            <h2 className="text-xs uppercase font-mono tracking-wider text-slate-500 flex items-center gap-2">
              <Ticket size={16} className="text-amber-500 stroke-[2.5]" />
              <span className="font-bold font-heading text-slate-700 text-sm">Ticket Quantity Input</span>
            </h2>
            <div className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 font-mono py-1 px-3 rounded-full font-black uppercase">
              Flat Rate: ₹{ticketPrice.toFixed(2)} per ticket
            </div>
          </div>

          {/* Quantity Indicator Display */}
          <div className="flex flex-col md:flex-row gap-6 items-stretch mb-6">
            
            {/* Visual Screen Display */}
            <div className="flex-1 bg-slate-900 text-white rounded-2xl p-6 flex flex-col justify-between border border-slate-950 relative overflow-hidden shadow-inner">
              {/* Decorative terminal lines */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.06)_0%,transparent_70%)] pointer-events-none" />
              <div className="flex justify-between items-center text-xs font-mono text-slate-400">
                <span>TERMINAL NODE: <strong className="text-amber-500 font-bold">{currentUser?.terminal_id || 'RD-01'}</strong></span>
                <span className="text-emerald-400 font-bold">READY</span>
              </div>

              <div className="my-6 text-center">
                <span className="text-xs font-mono uppercase tracking-widest text-slate-400 block mb-1">TOTAL TICKETS</span>
                <span className="text-6xl font-black font-mono tracking-tight text-amber-400" id="pos-quantity-display">
                  {quantity}
                </span>
              </div>

              <div className="flex justify-between items-baseline border-t border-slate-800/80 pt-4 mt-2">
                <span className="text-xs text-slate-400 font-mono">TICKET PRICE: ₹{ticketPrice.toFixed(2)}</span>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-mono uppercase block">TOTAL AMOUNT</span>
                  <span className="text-2xl font-black font-mono text-white">
                    ₹{grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Adjustment +/- Panel */}
            <div className="w-full md:w-48 flex flex-col justify-between gap-3">
              <button
                onClick={() => applyPreset(1)}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 text-sm transition cursor-pointer select-none active:scale-[0.98] shadow-sm"
              >
                <Plus size={16} />
                <span>Add 1 Ticket</span>
              </button>
              
              <button
                onClick={() => applyPreset(-1)}
                disabled={quantity <= 0}
                className={`flex-1 font-bold rounded-xl flex items-center justify-center gap-2 text-sm transition select-none active:scale-[0.98] ${
                  quantity <= 0
                    ? 'bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer'
                }`}
              >
                <Minus size={16} />
                <span>Remove 1 Ticket</span>
              </button>
            </div>

          </div>

          {/* Quick presets */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold block mb-2.5">
                Quick Ticket Presets
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                {[1, 5, 10, 20, 50, 100].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setQuantity(preset)}
                    className="py-3 px-4 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold font-mono text-xs rounded-xl border border-slate-200 transition cursor-pointer active:scale-95 text-center"
                  >
                    Set to {preset}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold block mb-2.5">
                Relative Ticket Adjustment
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[-5, -10, +5, +10].map((diff) => (
                  <button
                    key={diff}
                    onClick={() => applyPreset(diff)}
                    className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold font-mono text-xs rounded-xl border border-slate-200 transition cursor-pointer active:scale-95 text-center"
                  >
                    {diff > 0 ? `+${diff}` : diff} Tickets
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* TERMINAL JOURNAL LOGS TABLE */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
            <h2 className="text-xs uppercase font-mono tracking-wider text-slate-500 flex items-center gap-2">
              <Printer size={16} className="text-slate-400 stroke-[2]" />
              <span className="font-bold font-heading text-slate-700 text-sm">Terminal Journal Logs</span>
            </h2>
            <span className="text-[10px] text-slate-400 font-mono font-medium">
              (Reprints & Offline Auditing)
            </span>
          </div>

          {recentTransactions.length === 0 ? (
            <p className="text-xs text-slate-400 font-mono text-center py-8 bg-slate-50/30 rounded-xl border border-dashed border-slate-150">
              No transactions recorded in this active window.
            </p>
          ) : (
            <div className="overflow-hidden border border-slate-150 rounded-xl">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                    <th className="py-3 px-4">TX ID</th>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4 text-center">Payment Mode</th>
                    <th className="py-3 px-4 text-center">Tickets Sold</th>
                    <th className="py-3 px-4 text-right">Grand Total</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {recentTransactions.map((tx) => {
                    const txOperator = usersList.find(u => u.user_id === tx.operator_id);
                    return (
                      <tr key={tx.transaction_id} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-4 text-slate-900 font-bold font-mono">
                          <div>#RD-{tx.transaction_id}</div>
                          <div className="text-[9px] text-amber-600 font-medium">by: {txOperator ? txOperator.username : `User ${tx.operator_id}`}</div>
                        </td>
                      <td className="py-2.5 px-4 text-slate-500">
                        {new Date(tx.created_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        }).toUpperCase()}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded ${
                          tx.payment_mode === 'CASH' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                          {tx.payment_mode}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center font-bold text-slate-800">{tx.quantity}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-900 font-heading text-sm">₹{tx.total_amount.toFixed(2)}</td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => onTransactionCompleted(tx)}
                          className="text-[10px] text-amber-600 hover:text-amber-700 border border-amber-500/20 hover:border-amber-500/40 bg-amber-50 hover:bg-amber-100 rounded-lg px-2.5 py-1.5 transition cursor-pointer font-bold font-sans"
                        >
                          Reprint Ticket
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

        {/* WORKSTATION KEYBOARD HOTKEYS HINT */}
        <div className="bg-slate-200/40 border border-slate-200 rounded-xl p-4 flex flex-wrap gap-4 items-center justify-between text-slate-500 font-mono text-[10px] uppercase tracking-wide">
          <div className="flex items-center gap-1.5">
            <span className="bg-white text-slate-700 px-2 py-0.5 rounded border border-slate-250 font-bold">0 - 9</span>
            <span>Input Quantity</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="bg-white text-slate-700 px-2 py-0.5 rounded border border-slate-250 font-bold">F1 / C</span>
            <span>CASH MODE</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="bg-white text-slate-700 px-2 py-0.5 rounded border border-slate-250 font-bold">F2 / O</span>
            <span>ONLINE MODE</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="bg-white text-slate-700 px-2 py-0.5 rounded border border-slate-250 font-bold">ESC</span>
            <span>CLEAR</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="bg-white text-slate-700 px-2 py-0.5 rounded border border-slate-250 font-bold">SPACEBAR</span>
            <span>CHECKOUT</span>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Split Payment & Actions (4/12 space) */}
      <div className="lg:col-span-4 flex flex-col gap-6 h-full" id="pos-terminal-cart">
        
        {/* Checkout Panel */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col p-5 space-y-4">
          
          <h3 className="text-slate-800 font-bold font-heading flex items-center gap-2 border-b border-slate-100 pb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Countertop Checkout</span>
          </h3>

          {/* Pricing Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Tickets Quantity:</span>
              <span className="text-slate-800 font-bold">{quantity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Standard Rate:</span>
              <span className="text-slate-800 font-bold">₹{ticketPrice.toFixed(2)} / ticket</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2.5 text-sm">
              <span className="text-slate-900 font-bold font-sans">Accumulated Total</span>
              <span className="text-lg font-black text-slate-900">
                ₹{grandTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* PAYMENT MODE ACTION SELECTOR */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold block">
              Payment Method Select
            </span>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 border border-slate-200 rounded-xl">
              <button
                type="button"
                id="payment-mode-cash"
                onClick={() => setPaymentMode('CASH')}
                className={`py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 font-mono text-xs font-bold tracking-wide transition cursor-pointer border ${
                  paymentMode === 'CASH'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-transparent'
                }`}
              >
                <Coins size={14} />
                <span>CASH [F1]</span>
              </button>
              <button
                type="button"
                id="payment-mode-online"
                onClick={() => setPaymentMode('ONLINE')}
                className={`py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 font-mono text-xs font-bold tracking-wide transition cursor-pointer border ${
                  paymentMode === 'ONLINE'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-transparent'
                }`}
              >
                <QrCode size={14} />
                <span>ONLINE [F2]</span>
              </button>
            </div>
          </div>

          {/* DYNAMIC QR CODE DISPLAY IF ONLINE IS ACTIVE */}
          {paymentMode === 'ONLINE' && (
            <div className="border border-indigo-200 bg-indigo-50/40 rounded-xl p-3.5 text-center animate-in slide-in-from-bottom-2 duration-250">
              <p className="text-[9px] uppercase font-mono tracking-widest text-indigo-600 mb-2 font-bold">
                Countertop Static UPI QR
              </p>
              {/* SVG Mock QR Code */}
              <div className="mx-auto bg-white p-2.5 rounded-lg w-24 h-24 flex items-center justify-center relative shadow-sm border border-slate-150">
                <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900" aria-label="Simulated QR Code">
                  <rect x="0" y="0" width="30" height="30" fill="currentColor" />
                  <rect x="3" y="3" width="24" height="24" fill="white" />
                  <rect x="8" y="8" width="14" height="14" fill="currentColor" />

                  <rect x="70" y="0" width="30" height="30" fill="currentColor" />
                  <rect x="73" y="3" width="24" height="24" fill="white" />
                  <rect x="78" y="8" width="14" height="14" fill="currentColor" />

                  <rect x="0" y="70" width="30" height="30" fill="currentColor" />
                  <rect x="3" y="73" width="24" height="24" fill="white" />
                  <rect x="8" y="78" width="14" height="14" fill="currentColor" />

                  <rect x="40" y="10" width="10" height="10" fill="currentColor" />
                  <rect x="45" y="25" width="15" height="10" fill="currentColor" />
                  <rect x="15" y="45" width="10" height="15" fill="currentColor" />
                  <rect x="35" y="40" width="20" height="15" fill="currentColor" />
                  <rect x="60" y="45" width="15" height="20" fill="currentColor" />
                  <rect x="40" y="75" width="15" height="10" fill="currentColor" />
                  <rect x="80" y="40" width="10" height="10" fill="currentColor" />
                  <rect x="85" y="80" width="10" height="10" fill="currentColor" />
                  <rect x="70" y="85" width="10" height="10" fill="currentColor" />
                  
                  <rect x="42" y="42" width="16" height="16" fill="white" rx="2" />
                  <circle cx="50" cy="50" r="5" fill="crimson" />
                </svg>
              </div>
              <p className="text-[10px] text-indigo-700 font-sans mt-2.5 leading-tight font-bold">
                Scan to Pay (PhonePe / GPay / BHIM)
              </p>
              <p className="text-[9px] text-slate-500 font-mono mt-1">
                Verified locally via Soundbox at countertop.
              </p>
            </div>
          )}

          {/* PROCESS CHECKOUT AND PRINT BUTTON */}
          <button
            type="button"
            id="checkout-trigger-btn"
            disabled={quantity <= 0}
            onClick={handleCheckout}
            className={`w-full py-4 rounded-xl font-bold font-sans tracking-wide text-sm flex items-center justify-center gap-2 transition cursor-pointer select-none active:scale-[0.98] ${
              quantity <= 0
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
                : paymentMode === 'CASH'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/10'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/10'
            }`}
          >
            <span>COMPLETE BOOKING [SPACE]</span>
            <ArrowRight size={16} />
          </button>

        </div>

      </div>

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
