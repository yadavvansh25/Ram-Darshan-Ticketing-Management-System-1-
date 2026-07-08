import { Transaction, PaymentMode, SystemMetrics, User } from './types';

// Seed users matching the new PRD RBAC requirements with multiple operator terminals
const DEFAULT_USERS: User[] = [
  {
    user_id: 1,
    username: 'operator1',
    password_hash: 'op123',
    role: 'OPERATOR',
    is_active: true,
    terminal_id: 'RD-01'
  },
  {
    user_id: 2,
    username: 'operator2',
    password_hash: 'op456',
    role: 'OPERATOR',
    is_active: true,
    terminal_id: 'RD-02'
  },
  {
    user_id: 11,
    username: 'admin',
    password_hash: 'admin123',
    role: 'MANAGEMENT',
    is_active: true,
    terminal_id: 'RD-ADM'
  }
];

const KEYS = {
  TRANSACTIONS: 'ram_darshan_transactions_v5',
  TICKET_PRICE: 'ram_darshan_ticket_price_v5',
  USERS: 'ram_darshan_users_v5',
  ACCOUNTING_PASSWORD: 'ram_darshan_accounting_password_v5',
};

export class RelationalDatabase {
  static init() {
    if (!localStorage.getItem(KEYS.TICKET_PRICE)) {
      localStorage.setItem(KEYS.TICKET_PRICE, '20.00');
    }
    if (!localStorage.getItem(KEYS.USERS)) {
      localStorage.setItem(KEYS.USERS, JSON.stringify(DEFAULT_USERS));
    }
    if (!localStorage.getItem(KEYS.TRANSACTIONS)) {
      localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify([]));
    }
    if (!localStorage.getItem(KEYS.ACCOUNTING_PASSWORD)) {
      localStorage.setItem(KEYS.ACCOUNTING_PASSWORD, 'acc123');
    }
  }

  static reset() {
    localStorage.setItem(KEYS.TICKET_PRICE, '20.00');
    localStorage.setItem(KEYS.USERS, JSON.stringify(DEFAULT_USERS));
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify([]));
    localStorage.setItem(KEYS.ACCOUNTING_PASSWORD, 'acc123');
  }

  // --- ACCOUNTING ENGINE PASSWORD MANAGEMENT ---
  static getAccountingPassword(): string {
    this.init();
    return localStorage.getItem(KEYS.ACCOUNTING_PASSWORD) || 'acc123';
  }

  static saveAccountingPassword(password: string) {
    localStorage.setItem(KEYS.ACCOUNTING_PASSWORD, password);
  }

  // --- TICKET RATE CONFIGURATION (DYNAMIC RATE ENGINE) ---
  static getTicketPrice(): number {
    this.init();
    const price = localStorage.getItem(KEYS.TICKET_PRICE);
    return price ? Number(price) : 20.00;
  }

  static saveTicketPrice(price: number) {
    localStorage.setItem(KEYS.TICKET_PRICE, Number(price).toFixed(2));
  }

  // --- USERS TABLE MANAGEMENT ---
  static getUsers(): User[] {
    this.init();
    const data = localStorage.getItem(KEYS.USERS);
    return data ? JSON.parse(data) : [];
  }

  static saveUsers(usersList: User[]) {
    localStorage.setItem(KEYS.USERS, JSON.stringify(usersList));
  }

  static authenticate(username: string, passwordPlain: string): User | null {
    const users = this.getUsers();
    const found = users.find(u => u.username.toLowerCase() === username.toLowerCase().trim() && u.is_active);
    if (!found) return null;
    
    // Direct or hashed password matching
    if (found.password_hash === passwordPlain) {
      return found;
    }
    return null;
  }

  static updateManagementPassword(userId: number, newPasswordPlain: string): boolean {
    const users = this.getUsers();
    let updated = false;
    const newList = users.map(u => {
      if (u.user_id === userId) {
        updated = true;
        return { ...u, password_hash: newPasswordPlain };
      }
      return u;
    });
    if (updated) {
      this.saveUsers(newList);
    }
    return updated;
  }

  // --- TRANSACTIONS LOGS ---
  static getTransactions(): Transaction[] {
    this.init();
    const data = localStorage.getItem(KEYS.TRANSACTIONS);
    const list: Transaction[] = data ? JSON.parse(data) : [];
    // Sort transactions newest first
    return list.sort((a, b) => b.transaction_id - a.transaction_id);
  }

  static processTransaction(quantity: number, paymentMode: PaymentMode, operatorId: number): Transaction {
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than zero.');
    }

    const transactions = this.getTransactions();
    const activePrice = this.getTicketPrice();

    // Generate new transaction ID starting at 10009 (or max + 1)
    const nextTxId = transactions.length > 0 ? Math.max(...transactions.map(t => t.transaction_id)) + 1 : 10001;

    const newTransaction: Transaction = {
      transaction_id: nextTxId,
      operator_id: operatorId,
      quantity,
      ticket_price: activePrice,
      total_amount: Number((quantity * activePrice).toFixed(2)),
      payment_mode: paymentMode,
      created_at: new Date().toISOString(),
    };

    const updatedTransactions = [newTransaction, ...transactions];
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(updatedTransactions));

    return newTransaction;
  }

  // --- AGGREGATED ACCOUNTING ENGINE WITH DATE FILTERS ---
  static getMetrics(
    filterType: 'TODAY' | '15_DAYS' | '1_MONTH' | '1_YEAR' | 'ALL' | 'CUSTOM' = 'ALL', 
    customStart?: string, 
    customEnd?: string
  ): SystemMetrics {
    const transactions = this.getTransactions();
    
    // Compute cutoffs
    let startCutoff = 0;
    let endCutoff = Infinity;
    const now = Date.now();

    if (filterType === 'TODAY') {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      startCutoff = startOfToday.getTime();
    } else if (filterType === '15_DAYS') {
      startCutoff = now - 15 * 24 * 60 * 60 * 1000;
    } else if (filterType === '1_MONTH') {
      startCutoff = now - 30 * 24 * 60 * 60 * 1000;
    } else if (filterType === '1_YEAR') {
      startCutoff = now - 365 * 24 * 60 * 60 * 1000;
    } else if (filterType === 'CUSTOM') {
      if (customStart) {
        const s = new Date(customStart);
        s.setHours(0, 0, 0, 0);
        startCutoff = s.getTime();
      }
      if (customEnd) {
        const e = new Date(customEnd);
        e.setHours(23, 59, 59, 999);
        endCutoff = e.getTime();
      }
    }

    // Filter transactions
    const filtered = transactions.filter(tx => {
      const txTime = new Date(tx.created_at).getTime();
      return txTime >= startCutoff && txTime <= endCutoff;
    });

    let totalRevenue = 0;
    let cashRevenue = 0;
    let onlineRevenue = 0;
    let totalTicketsSold = 0;

    filtered.forEach(tx => {
      totalRevenue += tx.total_amount;
      totalTicketsSold += tx.quantity;
      if (tx.payment_mode === 'CASH') {
        cashRevenue += tx.total_amount;
      } else {
        onlineRevenue += tx.total_amount;
      }
    });

    return {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      cashRevenue: Number(cashRevenue.toFixed(2)),
      onlineRevenue: Number(onlineRevenue.toFixed(2)),
      totalTicketsSold,
    };
  }

  // --- RAW SQL INTERPRETATION CONSOLE ENGINE (Simulation) ---
  static executeQuery(sql: string): { columns: string[]; rows: any[]; error?: string } {
    const trimmed = sql.trim().replace(/\s+/g, ' ');
    const lower = trimmed.toLowerCase();
    const transactions = this.getTransactions();
    const users = this.getUsers();

    try {
      if (!lower.startsWith('select')) {
        return {
          columns: ['ERROR'],
          rows: [['Only read-only SELECT queries are supported on the counter node to preserve immutable logs']],
          error: 'DDL/DML operations are restricted.',
        };
      }

      // SQLite emulation for 'users' table
      if (lower.startsWith('select * from users') || lower.startsWith('select * from "users"')) {
        return {
          columns: ['user_id', 'username', 'password_hash', 'role', 'is_active', 'terminal_id'],
          rows: users.map(u => [
            u.user_id,
            u.username,
            u.password_hash, // Bcrypt/Argon2 Simulation Hash Representation
            u.role,
            u.is_active ? 'TRUE' : 'FALSE',
            u.terminal_id || 'N/A'
          ]),
        };
      }

      // SQLite emulation for 'transactions' table
      if (lower.startsWith('select * from transactions') || lower.startsWith('select * from "transactions"')) {
        return {
          columns: ['transaction_id', 'operator_id', 'quantity', 'ticket_price', 'total_amount', 'payment_mode', 'created_at'],
          rows: transactions.map(t => [
            t.transaction_id,
            t.operator_id,
            t.quantity,
            `₹${t.ticket_price.toFixed(2)}`,
            `₹${t.total_amount.toFixed(2)}`,
            t.payment_mode,
            new Date(t.created_at).toLocaleString('en-IN')
          ]),
        };
      }

      // SQLite emulation for JOIN 'transactions' and 'users'
      if (lower.includes('join users') || lower.includes('join "users"')) {
        return {
          columns: ['transaction_id', 'operator_name', 'quantity', 'ticket_price', 'total_amount', 'payment_mode', 'created_at'],
          rows: transactions.map(t => {
            const u = users.find(user => user.user_id === t.operator_id);
            return [
              t.transaction_id,
              u ? u.username : `User ${t.operator_id}`,
              t.quantity,
              `₹${t.ticket_price.toFixed(2)}`,
              `₹${t.total_amount.toFixed(2)}`,
              t.payment_mode,
              new Date(t.created_at).toLocaleString('en-IN')
            ];
          }),
        };
      }

      // Aggregate queries
      if (lower.includes('sum(total_amount)') || lower.includes('sum(quantity)')) {
        let totalRev = 0;
        let totalQty = 0;
        transactions.forEach(t => {
          totalRev += t.total_amount;
          totalQty += t.quantity;
        });
        
        return {
          columns: ['SUM(quantity)', 'SUM(total_amount)'],
          rows: [[totalQty, `₹${totalRev.toFixed(2)}`]]
        };
      }

      // Payment split groups
      if (lower.includes('group by payment_mode')) {
        let cashSum = 0;
        let cashCount = 0;
        let onlineSum = 0;
        let onlineCount = 0;

        transactions.forEach(t => {
          if (t.payment_mode === 'CASH') {
            cashSum += t.total_amount;
            cashCount += t.quantity;
          } else {
            onlineSum += t.total_amount;
            onlineCount += t.quantity;
          }
        });

        return {
          columns: ['payment_mode', 'TICKETS_SOLD', 'REVENUE_SUM'],
          rows: [
            ['CASH', cashCount, `₹${cashSum.toFixed(2)}`],
            ['ONLINE', onlineCount, `₹${onlineSum.toFixed(2)}`]
          ]
        };
      }

      // Default message
      return {
        columns: ['INFO'],
        rows: [
          ['Available Database Tables: "Users", "Transactions"'],
          ['Try standard SELECTs like: "SELECT * FROM Transactions", "SELECT * FROM Users", or joins like "SELECT * FROM Transactions JOIN Users"'],
        ],
        error: 'Query parsed, but no matching table/join rule triggered. Try "SELECT * FROM Transactions" or "SELECT * FROM Users".',
      };
    } catch (err: any) {
      return {
        columns: ['SQL ERROR'],
        rows: [[err.message || 'Unknown error occurred while processing query']],
        error: err.message,
      };
    }
  }
}
