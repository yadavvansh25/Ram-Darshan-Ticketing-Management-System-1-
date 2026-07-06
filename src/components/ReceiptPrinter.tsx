import React, { useEffect, useRef } from 'react';
import { Printer, Download, X, Copy, Check } from 'lucide-react';
import { Transaction } from '../types';
import { RelationalDatabase } from '../db';

interface ReceiptPrinterProps {
  transaction: Transaction;
  onClose: () => void;
}

export default function ReceiptPrinter({ transaction, onClose }: ReceiptPrinterProps) {
  const [copied, setCopied] = React.useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Synthesize realistic thermal printer sound using Web Audio API
  const playPrinterSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;

      const duration = 1.6; // seconds
      const sampleRate = ctx.sampleRate;
      const bufferSize = sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
      const data = buffer.getChannelData(0);

      // Synthesize noise resembling stepper motor + thermal head firing
      for (let i = 0; i < bufferSize; i++) {
        const t = i / sampleRate;
        const stepperFreq = Math.sin(2 * Math.PI * 180 * t) > 0 ? 1 : -1;
        const headFreq = Math.sin(2 * Math.PI * 1200 * t) * (Math.random() * 0.3);
        const linePulse = Math.sin(2 * Math.PI * 15 * t) > -0.2 ? 1 : 0;
        
        data[i] = (stepperFreq * 0.05 + headFreq * 0.04) * linePulse * Math.max(0, 1 - t / duration);
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();

      setTimeout(() => {
        ctx.close();
      }, duration * 1000 + 500);
    } catch (e) {
      console.log('Audio synthesis failed or was blocked by browser autoplay policy', e);
    }
  };

  useEffect(() => {
    playPrinterSound();
  }, [transaction.transaction_id]);

  const formattedDate = () => {
    const d = new Date(transaction.created_at);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).replace(/\//g, '-');
  };

  const formattedTime = () => {
    const d = new Date(transaction.created_at);
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).toUpperCase();
  };

  const getMonospaceReceiptText = () => {
    const users = RelationalDatabase.getUsers();
    const operator = users.find(u => u.user_id === transaction.operator_id);
    const operatorName = operator ? operator.username : `Operator #${transaction.operator_id}`;

    const dateLine = `Date: ${formattedDate()}`;
    const timeLine = `Time: ${formattedTime()}`;
    const ticketIdLine = `Ticket ID: #RD-${transaction.transaction_id}`;
    const operatorLine = `Operator: ${operatorName}`;
    
    let text = `================================\n`;
    text += `          RAM DARSHAN           \n`;
    text += `================================\n`;
    text += `${dateLine}\n`;
    text += `${timeLine}\n`;
    text += `${ticketIdLine}\n`;
    text += `${operatorLine}\n`;
    text += `--------------------------------\n`;
    
    text += `${"Number of Tickets".padEnd(18)}: ${transaction.quantity.toString().padStart(12)}\n`;
    text += `${"Rate per Ticket".padEnd(18)}: ${`₹${transaction.ticket_price.toFixed(2)}`.padStart(12)}\n`;
    text += `--------------------------------\n`;
    text += `${"Total Amount".padEnd(18)}: ${`₹${transaction.total_amount.toFixed(2)}`.padStart(12)}\n`;
    text += `${"Payment Mode".padEnd(18)}: ${transaction.payment_mode.padStart(12)}\n`;
    text += `================================\n`;
    text += `    Thank You for Visiting!     \n`;
    text += `================================`;
    return text;
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt #RD-${transaction.transaction_id}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              width: 72mm;
              margin: 4mm;
              padding: 0;
              font-size: 12px;
              line-height: 1.4;
              color: #000;
              background: #fff;
            }
            pre {
              margin: 0;
              white-space: pre-wrap;
              font-family: 'Courier New', Courier, monospace;
            }
            @media print {
              body {
                margin: 0;
                width: 100%;
              }
            }
          </style>
        </head>
        <body>
          <pre>${getMonospaceReceiptText()}</pre>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(getMonospaceReceiptText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-40 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans text-slate-800"
      id="receipt-modal"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header bar */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono font-bold text-slate-600">THERMAL PRINTER ACTIVE</span>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition cursor-pointer"
            title="Dismiss Receipt"
          >
            <X size={18} />
          </button>
        </div>

        {/* Paper Container */}
        <div className="bg-slate-50 p-6 flex flex-col items-center justify-center overflow-y-auto max-h-[60vh] border-b border-slate-100">
          
          {/* Virtual Receipt Paper */}
          <div 
            className="bg-white border border-slate-200 shadow-sm p-5 w-full max-w-[280px] text-left font-mono text-[11px] leading-relaxed relative flex flex-col"
            id="thermal-receipt-paper"
            style={{ 
              boxShadow: '0 4px 10px -2px rgba(0,0,0,0.05)',
              backgroundImage: 'linear-gradient(rgba(0,0,0,0.02) 1px, transparent 1px)',
              backgroundSize: '100% 24px',
            }}
          >
            {/* Torn paper top pattern */}
            <div className="absolute top-0 left-0 right-0 h-1 flex overflow-hidden">
              {Array.from({ length: 28 }).map((_, i) => (
                <div key={i} className="w-2.5 h-1.5 bg-slate-50 rotate-45 transform -translate-y-1 border-t border-r border-slate-200" />
              ))}
            </div>

            {/* Receipt Monospace preformatted text block */}
            <pre className="whitespace-pre font-mono font-bold text-slate-900 select-all overflow-x-auto mt-2">
              {getMonospaceReceiptText()}
            </pre>

            {/* Torn paper bottom pattern */}
            <div className="absolute bottom-[-4px] left-0 right-0 h-1 flex overflow-hidden">
              {Array.from({ length: 28 }).map((_, i) => (
                <div key={i} className="w-2.5 h-1.5 bg-slate-50 rotate-45 transform translate-y-0.5 border-b border-l border-slate-200" />
              ))}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="p-4 bg-white flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5 px-4 rounded-xl transition text-sm cursor-pointer shadow-sm shadow-amber-600/10 active:transform active:scale-[0.98]"
            >
              <Printer size={16} />
              <span>Print Receipt</span>
            </button>
            <button
              onClick={handleCopyText}
              className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-xl transition text-sm cursor-pointer active:transform active:scale-[0.98]"
            >
              {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
              <span>{copied ? 'Copied' : 'Copy Plain'}</span>
            </button>
          </div>
          
          <button
            onClick={onClose}
            className="w-full text-center text-xs text-slate-500 hover:text-slate-800 font-medium py-1.5 transition cursor-pointer"
          >
            Close & Return to POS Terminal
          </button>
        </div>
      </div>
    </div>
  );
}
