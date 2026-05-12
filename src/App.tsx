import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Minus, 
  Wallet, 
  PieChart, 
  Settings, 
  LogOut, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Tag,
  ArrowUpCircle,
  ArrowDownCircle,
  TrendingDown,
  TrendingUp,
  History,
  Trash2,
  X,
  PlusCircle,
  UserCircle,
  Utensils,
  Bus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './components/FirebaseProvider';
import { firestore } from './lib/firestore-utils';
import { Account, Transaction, TransactionType } from './types';
import { where, orderBy, limit } from 'firebase/firestore';

// --- Gujarati Translations ---
const t = {
  appName: 'હિસાબ કિતાબ',
  welcome: 'સ્વાગત છે',
  login: 'Google સાથે લોગિન કરો',
  dashboard: 'ડેશબોર્ડ',
  history: 'હિસાબની વિગતો',
  accounts: 'ખાતા',
  settings: 'સેટિંગ્સ',
  totalIncome: 'કુલ આવક',
  totalExpense: 'કુલ જાવક',
  balance: 'બાકી રકમ',
  addTransaction: 'નવો હિસાબ ઉમેરો',
  income: 'આવક',
  expense: 'જાવક',
  category: 'શ્રેણી / ખાતું',
  amount: 'રકમ',
  date: 'તારીખ',
  note: 'નોંધ',
  save: 'સાચવો',
  cancel: 'રદ કરો',
  recentTransactions: 'તાજેતરના વ્યવહારો',
  noTransactions: 'હજુ સુધી કોઈ વ્યવહાર નથી',
  addFirstTransaction: 'પહેલો વ્યવહાર ઉમેરો',
  manageAccounts: 'ખાતા સંચાલિત કરો',
  addAccount: 'નવું ખાતું ઉમેરો',
  accountName: 'ખાતાનું નામ',
  accountType: 'ખાતાનો પ્રકાર',
  delete: 'કાઢી નાખો',
  confirmDelete: 'શું તમે ખરેખર કાઢી નાખવા માંગો છો?',
};

// --- Components ---

const Button = ({ children, onClick, variant = 'primary', className = '', type = 'button' }: any) => {
  const variants: any = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-sm',
    danger: 'bg-rose-500 text-white hover:bg-rose-600 shadow-sm',
    income: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
    expense: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm',
    dark: 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-semibold transition-all active:scale-95 flex items-center justify-center gap-2 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className = '' }: any) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-5 ${className}`}>
    {children}
  </div>
);

const TransactionItem = ({ transaction, account, onDelete, key }: { transaction: Transaction, account?: Account, onDelete: (id: string) => void | Promise<void>, key?: string | number }) => {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex items-center justify-between p-4 mb-3 bg-white rounded-xl border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all group"
    >
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${transaction.type === 'income' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
          {transaction.type === 'income' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
        </div>
        <div>
          <h4 className="font-semibold text-slate-800 tracking-tight">{account?.name || 'Unknown'}</h4>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
              {transaction.type === 'income' ? t.income : t.expense}
            </span>
            <p className="text-xs text-slate-400 font-medium">{new Date(transaction.date).toLocaleDateString()}</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className={`text-lg font-bold ${transaction.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
            {transaction.type === 'income' ? '+' : '-'} ₹{transaction.amount.toLocaleString()}
          </p>
          {transaction.note && <p className="text-[11px] text-slate-400 font-medium italic mt-0.5">{transaction.note}</p>}
        </div>
        <button 
          onClick={() => onDelete(transaction.id)}
          className="p-2 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const { user, loading, signIn, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'accounts'>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);

  // Initialize accounts if empty
  useEffect(() => {
    if (user && accounts.length === 0) {
      const defaultAccounts = [
        { name: 'પગાર (Salary)', type: 'income', icon: 'Wallet', color: 'indigo' },
        { name: 'જમવાનો ખર્ચ (Food)', type: 'expense', icon: 'Utensils', color: 'orange' },
        { name: 'મુસાફરી (Travel)', type: 'expense', icon: 'Bus', color: 'blue' },
      ];
      
      const checkAndInit = async () => {
        const existing = await firestore.list<Account>('accounts', [where('ownerId', '==', user.uid)]);
        if (existing && existing.length === 0) {
          for (const acc of defaultAccounts) {
            await firestore.create('accounts', acc);
          }
        }
      };
      checkAndInit();
    }
  }, [user]);

  // Subscriptions
  useEffect(() => {
    if (!user) return;

    const unsubAccounts = firestore.subscribe<Account>('accounts', [where('ownerId', '==', user.uid)], setAccounts);
    const unsubTransactions = firestore.subscribe<Transaction>('transactions', 
      [where('ownerId', '==', user.uid), orderBy('date', 'desc')], 
      setTransactions
    );

    return () => {
      unsubAccounts();
      unsubTransactions();
    };
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white mb-6 mx-auto shadow-xl shadow-indigo-100">
            <Wallet size={40} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t.appName}</h1>
          <p className="text-gray-500 mb-8 max-w-xs">{t.welcome}! તમારા રોજના આવક અને ખર્ચનો હિસાબ રાખવા માટેની સરળ એપ્લિકેશન.</p>
          <Button onClick={signIn} className="w-full max-w-sm py-4 text-lg">
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5 mr-1" alt="Google" />
            {t.login}
          </Button>
        </motion.div>
      </div>
    );
  }

  const totals = transactions.reduce((acc, curr) => {
    if (curr.type === 'income') acc.income += curr.amount;
    else acc.expense += curr.amount;
    return acc;
  }, { income: 0, expense: 0 });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar Navigation - Desktop */}
      <aside className="hidden md:flex w-72 bg-slate-900 text-slate-300 flex-col border-r border-slate-800 sticky top-0 h-screen">
        <div className="p-8 border-b border-slate-800 mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-lg font-mono shadow-lg shadow-blue-900/20 tracking-tighter">₹</div>
            {t.appName}
          </h1>
        </div>
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
          <div className="px-4 py-3 text-[10px] font-bold uppercase text-slate-500 tracking-[0.2em]">મુખ્ય મેનુ</div>
          <SidebarNavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<Wallet size={20} />} label={t.dashboard} />
          <SidebarNavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History size={20} />} label={t.history} />
          <SidebarNavButton active={activeTab === 'accounts'} onClick={() => setActiveTab('accounts')} icon={<Tag size={20} />} label={t.accounts} />
          
          <div className="px-4 pt-8 py-3 text-[10px] font-bold uppercase text-slate-500 tracking-[0.2em]">તમારા ખાતા (Accounts)</div>
          <div className="space-y-1 px-2">
            {accounts.slice(0, 5).map(acc => (
              <div key={acc.id} className="flex justify-between items-center px-4 py-2 hover:bg-slate-800/50 rounded-lg cursor-pointer transition-colors group">
                <span className="text-sm text-slate-400 group-hover:text-slate-200">{acc.name}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${acc.type === 'income' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-rose-900/30 text-rose-400'}`}>
                  {acc.type === 'income' ? '+' : '-'}
                </span>
              </div>
            ))}
          </div>
        </nav>
        
        <div className="p-6 border-t border-slate-800">
          <button 
            onClick={logout} 
            className="flex items-center gap-3 px-4 py-3 w-full text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
          >
            <LogOut size={20} />
            <span className="font-semibold">{t.cancel} (Log Out)</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 md:px-10 py-6 sticky top-0 z-30 flex items-center justify-between shadow-sm backdrop-blur-md bg-opacity-90">
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-slate-900 md:hidden flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-sm">₹</div>
              {t.appName}
            </h2>
            <h2 className="hidden md:block text-2xl font-bold text-slate-900">
              {activeTab === 'dashboard' ? t.dashboard : activeTab === 'history' ? t.history : t.accounts}
            </h2>
            <p className="text-xs text-slate-400 font-medium hidden md:block mt-0.5">તમારી દૈનિક આવક અને ખર્ચની વિગત</p>
          </div>
          
          <div className="flex items-center gap-4 md:gap-8">
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">{t.balance}</p>
              <p className={`text-xl md:text-2xl font-black tabular-nums transition-colors ${totals.income - totals.expense >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                ₹{(totals.income - totals.expense).toLocaleString()}
              </p>
            </div>
            <Button onClick={() => setShowAddModal(true)} variant="dark" className="hidden md:flex !py-3 !px-6 text-sm">
              <Plus size={20} strokeWidth={3} /> {t.addTransaction}
            </Button>
            <button onClick={logout} className="md:hidden p-2 text-slate-400 hover:text-rose-500">
              <LogOut size={22} />
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full">
          {activeTab === 'dashboard' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
              {/* Stats Summary Panel */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-none shadow-xl shadow-emerald-100 flex flex-col justify-between min-h-[140px]">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider">{t.totalIncome}</p>
                      <div className="p-2 bg-white/20 rounded-lg">
                        <TrendingUp size={20} />
                      </div>
                    </div>
                    <h3 className="text-3xl font-black">₹{totals.income.toLocaleString()}</h3>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-xs text-emerald-100/70 font-medium">ગત માસ કરતા ૦% વધુ</p>
                  </div>
                </Card>

                <Card className="bg-gradient-to-br from-rose-500 to-rose-600 text-white border-none shadow-xl shadow-rose-100 flex flex-col justify-between min-h-[140px]">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-rose-100 text-xs font-bold uppercase tracking-wider">{t.totalExpense}</p>
                      <div className="p-2 bg-white/20 rounded-lg">
                        <TrendingDown size={20} />
                      </div>
                    </div>
                    <h3 className="text-3xl font-black">₹{totals.expense.toLocaleString()}</h3>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-xs text-rose-100/70 font-medium">બજેટની અંદર છે</p>
                  </div>
                </Card>

                <Card className="bg-white border-slate-200 border shadow-sm flex flex-col justify-between min-h-[140px]">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">બચત દર (Savings)</p>
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <PieChart size={20} />
                      </div>
                    </div>
                    <h3 className="text-3xl font-black text-slate-900">
                      {totals.income > 0 ? Math.round(((totals.income - totals.expense) / totals.income) * 100) : 0}%
                    </h3>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-50">
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-600 h-full rounded-full" 
                        style={{ width: `${Math.max(0, Math.min(100, totals.income > 0 ? ((totals.income - totals.expense) / totals.income) * 100 : 0))}%` }}
                      />
                    </div>
                  </div>
                </Card>
              </div>

              {/* Transaction List and Quick Tips Box */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-black text-slate-800 text-xl tracking-tight">{t.recentTransactions}</h3>
                    <button 
                      onClick={() => setActiveTab('history')}
                      className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all"
                    >
                      {t.history} <ChevronRight size={18} />
                    </button>
                  </div>

                  {transactions.length > 0 ? (
                    <div className="space-y-4">
                      {transactions.slice(0, 10).map(tx => (
                        <TransactionItem 
                          key={tx.id} 
                          transaction={tx} 
                          account={accounts.find(a => a.id === tx.accountId)}
                          onDelete={(id) => firestore.remove('transactions', id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mx-auto mb-6">
                        <History size={40} />
                      </div>
                      <h4 className="font-bold text-slate-800 mb-2">{t.noTransactions}</h4>
                      <p className="text-slate-400 text-sm mb-6 max-w-xs mx-auto">તમારી બચતની યાત્રા શરૂ કરવા માટે પહેલો વ્યવહાર ઉમેરો.</p>
                      <Button onClick={() => setShowAddModal(true)} variant="secondary">
                        {t.addFirstTransaction}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  {/* Quick Tip / Info Box */}
                  <Card className="bg-blue-900 text-white border-none relative overflow-hidden">
                    <div className="relative z-10">
                      <h4 className="font-bold text-lg mb-3">પ્રો ટીપ 💡</h4>
                      <p className="text-blue-100 text-sm leading-relaxed mb-4">
                        દરેક ખર્ચ પછી તરત જ એન્ટ્રી કરવાથી મહિનાના અંતે હિસાબમાં ભૂલ આવતી નથી અને તમે બચતનું લક્ષ્ય મેળવી શકો છો.
                      </p>
                      <Button variant="secondary" className="w-full bg-white/20 border-none text-white hover:bg-white/30">
                        વધુ જાણો
                      </Button>
                    </div>
                    <div className="absolute -bottom-6 -right-6 text-white/5">
                      <TrendingUp size={140} />
                    </div>
                  </Card>

                  {/* Summary Small Box */}
                  <Card className="bg-slate-800 text-white border-none">
                    <h4 className="font-bold text-sm uppercase tracking-widest text-slate-500 mb-4">{t.accounts}</h4>
                    <div className="space-y-4">
                      {accounts.slice(0, 3).map(acc => (
                        <div key={acc.id} className="flex items-center justify-between text-sm">
                          <span className="text-slate-300">{acc.name}</span>
                          <span className="font-mono text-slate-500">₹0</span>
                        </div>
                      ))}
                      <button 
                        onClick={() => setActiveTab('accounts')}
                        className="text-xs text-blue-400 font-bold hover:text-blue-300 pt-2 block"
                      >
                        બધા ખાતા જુઓ +
                      </button>
                    </div>
                  </Card>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-black text-slate-800 text-3xl tracking-tight">{t.history}</h3>
                <div className="flex gap-2">
                  {/* Filter buttons could go here */}
                </div>
              </div>
              
              {transactions.length > 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">વિગત</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">પ્રકાર</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">તારીખ</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">રકમ (₹)</th>
                          <th className="px-6 py-4 w-20"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {transactions.map(tx => {
                          const acc = accounts.find(a => a.id === tx.accountId);
                          return (
                            <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors group">
                              <td className="px-6 py-5">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded flex items-center justify-center text-xs ${tx.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                    {tx.type === 'income' ? <ArrowUpCircle size={14} /> : <ArrowDownCircle size={14} />}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-800">{acc?.name || 'Unknown'}</p>
                                    <p className="text-[11px] text-slate-400 font-medium">{tx.note || '-'}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-5">
                                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md ${tx.type === 'income' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                  {tx.type === 'income' ? t.income : t.expense}
                                </span>
                              </td>
                              <td className="px-6 py-5">
                                <p className="text-sm text-slate-500 font-medium">{new Date(tx.date).toLocaleDateString()}</p>
                              </td>
                              <td className="px-6 py-5 text-right font-black">
                                <span className={tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}>
                                  {tx.type === 'income' ? '+' : '-'} {tx.amount.toLocaleString()}
                                </span>
                              </td>
                              <td className="px-6 py-5 text-right">
                                <button 
                                  onClick={() => firestore.remove('transactions', tx.id)}
                                  className="text-slate-200 hover:text-rose-500 transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 shadow-sm">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mx-auto mb-6">
                    <History size={40} />
                  </div>
                  <p className="text-slate-400 font-bold">{t.noTransactions}</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'accounts' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center justify-between mb-10">
                <h3 className="font-black text-slate-800 text-3xl tracking-tight">{t.accounts}</h3>
                <Button onClick={() => setShowAccountModal(true)} variant="dark" className="!py-3 !px-6">
                  <PlusCircle size={20} /> {t.addAccount}
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {accounts.map(acc => (
                  <Card key={acc.id} className="hover:border-blue-400 group transition-all">
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                        <Tag size={24} />
                      </div>
                      <button 
                        onClick={() => firestore.remove('accounts', acc.id)}
                        className="p-2 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-xl mb-1">{acc.name}</h4>
                      <p className={`text-[10px] font-black uppercase tracking-[0.15em] py-1 px-2 rounded-md inline-block ${acc.type === 'income' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {acc.type === 'income' ? t.income : t.expense}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}
        </main>
      </div>

            {/* Bottom Nav - Mobile ONLY */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-8 py-4 z-30 flex items-center justify-between backdrop-blur-xl bg-opacity-90 shadow-[0_-10px_30px_rgb(0,0,0,0.05)]">
        <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<Wallet size={24} />} label={t.dashboard} />
        <NavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History size={24} />} label={t.history} />
        <NavButton active={activeTab === 'accounts'} onClick={() => setActiveTab('accounts')} icon={<Tag size={24} />} label={t.accounts} />
      </nav>

      {/* Mobile Floating Action Button */}
      <div className="md:hidden fixed bottom-24 right-4 z-40">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAddModal(true)}
          className="w-16 h-16 bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-400 flex items-center justify-center"
        >
          <Plus size={32} strokeWidth={3} />
        </motion.button>
      </div>

      {/* Modal: Add Transaction */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" 
            />
            <motion.div 
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100% '}}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] p-6 z-50 max-w-md mx-auto shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t.addTransaction}</h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><X /></button>
              </div>
              
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const accId = formData.get('accountId') as string;
                const account = accounts.find(a => a.id === accId);
                
                await firestore.create('transactions', {
                  amount: Number(formData.get('amount')),
                  date: formData.get('date'),
                  accountId: accId,
                  type: account?.type || 'expense',
                  note: formData.get('note'),
                });
                setShowAddModal(false);
              }} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">{t.amount} (₹)</label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-xl group-focus-within:text-blue-500 transition-colors">₹</span>
                    <input name="amount" type="number" required placeholder="0.00" autoFocus className="w-full pl-10 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-600 focus:bg-white focus:ring-0 transition-all font-black text-2xl outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">{t.category} / {t.accounts}</label>
                    <select name="accountId" required className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-600 focus:bg-white focus:ring-0 transition-all font-bold text-slate-700 outline-none appearance-none">
                      <option value="">ખાતું પસંદ કરો</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name} ({acc.type === 'income' ? '+' : '-'})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">{t.date}</label>
                    <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-600 focus:bg-white focus:ring-0 transition-all font-bold text-slate-700 outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">{t.note}</label>
                  <input name="note" type="text" placeholder="વિશેષ નોંધ (નૈચ્છિક)" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-600 focus:bg-white focus:ring-0 transition-all font-bold text-slate-700 outline-none" />
                </div>

                <Button type="submit" variant="dark" className="w-full py-5 text-lg mt-4 shadow-xl shadow-slate-200">
                  {t.save}
                </Button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modal: Add Account */}
      <AnimatePresence>
        {showAccountModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAccountModal(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-3xl p-6 z-50 w-[90%] max-w-sm shadow-2xl"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-6">{t.addAccount}</h3>
              
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                await firestore.create('accounts', {
                  name: formData.get('name'),
                  type: formData.get('type'),
                  icon: 'Tag',
                  color: 'indigo'
                });
                setShowAccountModal(false);
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.accountName}</label>
                  <input name="name" type="text" required placeholder="દા.ત. રોકડ (Cash)" className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.accountType}</label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="relative">
                      <input type="radio" name="type" value="income" required className="peer sr-only" />
                      <div className="p-3 text-center rounded-xl border border-gray-100 peer-checked:bg-emerald-50 peer-checked:border-emerald-500 peer-checked:text-emerald-600 cursor-pointer transition-all">
                        {t.income}
                      </div>
                    </label>
                    <label className="relative">
                      <input type="radio" name="type" value="expense" required defaultChecked className="peer sr-only" />
                      <div className="p-3 text-center rounded-xl border border-gray-100 peer-checked:bg-rose-50 peer-checked:border-rose-500 peer-checked:text-rose-600 cursor-pointer transition-all">
                        {t.expense}
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="secondary" onClick={() => setShowAccountModal(false)} className="flex-1">
                    {t.cancel}
                  </Button>
                  <Button type="submit" className="flex-1">
                    {t.save}
                  </Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 transition-all ${active ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
    >
      <motion.div animate={{ scale: active ? 1.2 : 1, y: active ? -2 : 0 }}>
        {icon}
      </motion.div>
      <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
      {active && <motion.div layoutId="nav-pill" className="w-4 h-1 bg-blue-600 rounded-full" />}
    </button>
  );
}

function SidebarNavButton({ active, onClick, icon, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 w-full rounded-xl transition-all ${
        active 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 ' 
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
      }`}
    >
      <div className={`${active ? 'text-white' : 'text-slate-500'}`}>{icon}</div>
      <span className="font-bold text-sm">{label}</span>
      {active && <motion.div layoutId="sidebar-pill" className="ml-auto w-1.5 h-1.5 bg-white rounded-full" />}
    </button>
  );
}
