'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { PlusCircle, Calendar, AlertCircle, Wallet, ArrowRight, ArrowLeft } from 'lucide-react';

interface BudgetItem {
  id: string;
  title: string;
  category: string;
  expense_type: string;
  payment_method: string;
  monthly_amounts: Record<string, number>;
  annual_total: number;
  monthly_provision: number;
}

interface ActualExpense {
  id: string;
  date: string;
  amount: number;
  category: string;
  title: string;
}

const MONTH_NAMES = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

export default function CashflowApp() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'gantt'>('dashboard');
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [actualExpenses, setActualExpenses] = useState<ActualExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGanttMonth, setSelectedGanttMonth] = useState<number>(new Date().getMonth() + 1);

  const currentMonthNum = new Date().getMonth() + 1;
  const nextMonthNum = currentMonthNum === 12 ? 1 : currentMonthNum + 1;

  // טופס הזנה מהיר
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('אוכל לבית');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const quickCategories = [
    { label: '🛒 סופר', value: 'אוכל לבית' },
    { label: '⛽ דלק', value: 'דלק רז' },
    { label: '🐕 כלבים', value: 'כלבים' },
    { label: '💇 תספורות', value: 'אישי' },
    { label: '🛠️ שונות / בלת"ם', value: 'שוטף' },
  ];

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: bData } = await supabase.from('budget_items').select('*');
      if (bData) setBudgetItems(bData);

      const startOfMonth = new Date(new Date().getFullYear(), currentMonthNum - 1, 1).toISOString();
      const { data: aData } = await supabase
        .from('actual_expenses')
        .select('*')
        .gte('created_at', startOfMonth);
      if (aData) setActualExpenses(aData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // חישובים
  const currentMonthPlannedTotal = budgetItems.reduce((acc, item) => {
    return acc + Number(item.monthly_amounts?.[String(currentMonthNum)] || 0);
  }, 0);

  const totalMonthlyProvision = budgetItems
    .filter((item) => item.expense_type !== 'חודשי')
    .reduce((acc, item) => acc + (Number(item.monthly_provision) || 0), 0);

  const totalSpentThisMonth = actualExpenses.reduce((acc, item) => acc + Number(item.amount), 0);

  const upcomingOccasionalItems = budgetItems.filter((item) => {
    const isNotStandardMonthly = item.expense_type !== 'חודשי';
    const hasCost =
      (item.monthly_amounts?.[String(currentMonthNum)] || 0) > 0 ||
      (item.monthly_amounts?.[String(nextMonthNum)] || 0) > 0;
    return isNotStandardMonthly && hasCost;
  });

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('actual_expenses').insert([
        {
          amount: Number(amount),
          category: selectedCategory,
          title: description.trim() || selectedCategory,
        },
      ]);

      if (error) {
        alert('שגיאה: ' + error.message);
      } else {
        setAmount('');
        setDescription('');
        setShowQuickAdd(false);
        fetchData();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // חישוב סך הכל לחודש נבחר בגאנט
  const ganttMonthTotal = budgetItems.reduce((acc, item) => {
    return acc + Number(item.monthly_amounts?.[String(selectedGanttMonth)] || 0);
  }, 0);

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-900 pb-24 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 px-4 py-3 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-slate-800">
            {activeTab === 'dashboard' ? 'ניהול תזרים משפחתי' : 'גאנט הוצאות שנתי'}
          </h1>
          <p className="text-xs text-slate-500">
            {activeTab === 'dashboard' ? 'מבט שוטף ומכ"ם קדימה' : 'תכנון שנתי ומעקב חודשי'}
          </p>
        </div>
        <button
          onClick={() => setShowQuickAdd(!showQuickAdd)}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow transition"
        >
          <PlusCircle size={16} />
          {showQuickAdd ? 'סגור' : 'הוצאה חדשה'}
        </button>
      </header>

      <main className="max-w-md mx-auto px-4 py-4 space-y-4">
        {/* טופס הזנה מהיר */}
        {showQuickAdd && (
          <div className="bg-white rounded-2xl p-4 shadow-lg border border-blue-100">
            <h2 className="text-sm font-bold text-slate-700 mb-2">תיעוד הוצאה מהיר</h2>
            <form onSubmit={handleQuickAdd} className="space-y-3">
              <div>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="₪ סכום"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full text-2xl font-bold p-2 text-center border rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  autoFocus
                  required
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {quickCategories.map((c) => (
                  <button
                    type="button"
                    key={c.value}
                    onClick={() => setSelectedCategory(c.value)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border transition ${
                      selectedCategory === c.value
                        ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold'
                        : 'border-slate-200 text-slate-600 bg-white'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="פירוט קצר (סופר, שופרסל, דלק)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs p-2 border rounded-lg bg-slate-50 outline-none"
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-slate-900 text-white font-medium py-2 rounded-xl text-sm hover:bg-slate-800 transition"
              >
                {isSubmitting ? 'שומר...' : 'שמירת הוצאה'}
              </button>
            </form>
          </div>
        )}

        {/* תצוגה 1: דשבורד שוטף */}
        {activeTab === 'dashboard' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm">
                <span className="text-xs text-slate-500 font-medium">שריון חודשי נדרש</span>
                <div className="text-xl font-extrabold text-blue-600 mt-1">
                  ₪{loading ? '...' : totalMonthlyProvision.toLocaleString()}
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">להפרשה לקרן בלת"ם</p>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm">
                <span className="text-xs text-slate-500 font-medium">יעד תקציב החודש</span>
                <div className="text-xl font-extrabold text-slate-800 mt-1">
                  ₪{loading ? '...' : currentMonthPlannedTotal.toLocaleString()}
                </div>
                <p className="text-[10px] text-emerald-600 font-medium mt-0.5">לפי תכנון הגאנט</p>
              </div>
            </div>

            {/* מכ"ם קדימה */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <AlertCircle size={16} className="text-amber-500" />
                  <h2 className="text-sm font-bold text-slate-800">מכ"ם הוצאות קדימה</h2>
                </div>
                <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                  {MONTH_NAMES[currentMonthNum - 1]} ו-{MONTH_NAMES[nextMonthNum - 1]}
                </span>
              </div>

              <div className="space-y-2">
                {upcomingOccasionalItems.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2 text-center">אין הוצאות מיוחדות בתקופה זו</p>
                ) : (
                  upcomingOccasionalItems.map((item) => {
                    const thisMonthCost = item.monthly_amounts?.[String(currentMonthNum)] || 0;
                    const nextMonthCost = item.monthly_amounts?.[String(nextMonthNum)] || 0;
                    const cost = thisMonthCost || nextMonthCost;
                    const when = thisMonthCost ? 'החודש' : 'בחודש הבא';

                    return (
                      <div key={item.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                            {item.category.slice(0, 3)}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-slate-800">{item.title}</div>
                            <div className="text-[10px] text-slate-400">{when} ({item.expense_type})</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-slate-900">₪{cost.toLocaleString()}</div>
                          <div className="text-[9px] text-blue-600 font-medium">קרן שריון</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* מעקב הוצאות בפועל */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-sm font-bold text-slate-800">הוצאות שתועדו החודש</h2>
                <span className="text-xs font-bold text-slate-700">₪{totalSpentThisMonth.toLocaleString()}</span>
              </div>
              <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {actualExpenses.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">עדיין לא תועדו הוצאות החודש</p>
                ) : (
                  actualExpenses.map((exp) => (
                    <div key={exp.id} className="py-2 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-medium text-slate-800">{exp.title}</span>
                        <span className="text-[10px] text-slate-400 block">{exp.category}</span>
                      </div>
                      <span className="font-bold text-slate-900">₪{Number(exp.amount).toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {/* תצוגה 2: גאנט שנתי מלא (The Annual Matrix) */}
        {activeTab === 'gantt' && (
          <div className="space-y-3">
            {/* בורר חודשים אופקי נגלל */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {MONTH_NAMES.map((name, idx) => {
                const mNum = idx + 1;
                const isSelected = selectedGanttMonth === mNum;
                const isCurrent = currentMonthNum === mNum;

                return (
                  <button
                    key={mNum}
                    onClick={() => setSelectedGanttMonth(mNum)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow'
                        : isCurrent
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>

            {/* כרטיס סיכום לחודש הנבחר בגאנט */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 rounded-2xl shadow">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-xs text-slate-300">תקציב מתוכנן לחודש {MONTH_NAMES[selectedGanttMonth - 1]}</span>
                  <div className="text-2xl font-black mt-0.5">₪{ganttMonthTotal.toLocaleString()}</div>
                </div>
                {ganttMonthTotal > 22000 && (
                  <span className="bg-amber-500/20 text-amber-300 text-[10px] px-2.5 py-1 rounded-full font-medium border border-amber-500/30">
                    חודש עמוס
                  </span>
                )}
              </div>
            </div>

            {/* רשימת כל ההוצאות בחודש הנבחר */}
            <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm space-y-2">
              <h3 className="text-xs font-bold text-slate-500 mb-2">פירוט סעיפים לחודש זה</h3>
              <div className="divide-y divide-slate-100 max-h-[55vh] overflow-y-auto">
                {budgetItems
                  .filter((item) => (item.monthly_amounts?.[String(selectedGanttMonth)] || 0) > 0)
                  .map((item) => {
                    const itemAmount = item.monthly_amounts[String(selectedGanttMonth)];
                    const isOccasional = item.expense_type !== 'חודשי';

                    return (
                      <div key={item.id} className="py-2.5 flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-800">{item.title}</span>
                            {isOccasional && (
                              <span className="text-[9px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-medium">
                                {item.expense_type}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {item.category} • {item.payment_method}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-slate-900">₪{Number(itemAmount).toLocaleString()}</div>
                          {isOccasional && (
                            <div className="text-[9px] text-blue-600 font-medium">
                              שריון: ₪{item.monthly_provision}/חודש
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Navigation בר תחתון */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-2 flex justify-around items-center z-10">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-0.5 ${
            activeTab === 'dashboard' ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <Wallet size={18} />
          <span className="text-[10px]">מצב שוטף</span>
        </button>

        <button
          onClick={() => setShowQuickAdd(true)}
          className="-mt-5 bg-blue-600 text-white p-3 rounded-full shadow-lg border-2 border-white hover:scale-105 transition"
        >
          <PlusCircle size={22} />
        </button>

        <button
          onClick={() => setActiveTab('gantt')}
          className={`flex flex-col items-center gap-0.5 ${
            activeTab === 'gantt' ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <Calendar size={18} />
          <span className="text-[10px]">גאנט שנתי</span>
        </button>
      </nav>
    </div>
  );
}