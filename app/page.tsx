'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; // אם הפרויקט בלי src, שנה ל: '../lib/supabase'
import { PlusCircle, Calendar, AlertCircle, Wallet, CheckCircle2, TrendingDown } from 'lucide-react';

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

export default function CashflowDashboard() {
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [actualExpenses, setActualExpenses] = useState<ActualExpense[]>([]);
  const [loading, setLoading] = useState(true);

  // חודש נוכחי וחודש הבא (1-12)
  const currentMonthNum = new Date().getMonth() + 1;
  const nextMonthNum = currentMonthNum === 12 ? 1 : currentMonthNum + 1;

  // טופס הזנה מהירה
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

  // שליפת הנתונים מ-Supabase
  const fetchData = async () => {
    try {
      setLoading(true);
      // 1. שליפת הגאנט
      const { data: budgetData, error: budgetError } = await supabase
        .from('budget_items')
        .select('*');

      if (budgetError) console.error('Error fetching budget:', budgetError);
      else setBudgetItems(budgetData || []);

      // 2. שליפת הוצאות בפועל לחודש הנוכחי
      const startOfMonth = new Date(new Date().getFullYear(), currentMonthNum - 1, 1).toISOString();
      const { data: actualData, error: actualError } = await supabase
        .from('actual_expenses')
        .select('*')
        .gte('created_at', startOfMonth);

      if (actualError) console.error('Error fetching actual expenses:', actualError);
      else setActualExpenses(actualData || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // חישובים מהירים
  // 1. יעד הוצאות מתוכנן לחודש הנוכחי לפי הגאנט
  const currentMonthPlannedTotal = budgetItems.reduce((acc, item) => {
    const monthAmount = item.monthly_amounts?.[String(currentMonthNum)] || 0;
    return acc + Number(monthAmount);
  }, 0);

  // 2. שריון חודשי נדרש (סכום השריון של סעיפים שאינם חודשיים קבועים)
  const totalMonthlyProvision = budgetItems
    .filter((item) => item.expense_type !== 'חודשי')
    .reduce((acc, item) => acc + (Number(item.monthly_provision) || 0), 0);

  // 3. סך מה שבוזבז בפועל החודש
  const totalSpentThisMonth = actualExpenses.reduce((acc, item) => acc + Number(item.amount), 0);

  // 4. סעיפי "מכ"ם קדימה" – הוצאות מזדמנות/שנתיות של החודש הנוכחי והבא
  const upcomingOccasionalItems = budgetItems.filter((item) => {
    const isNotStandardMonthly = item.expense_type !== 'חודשי';
    const hasCostThisOrNextMonth =
      (item.monthly_amounts?.[String(currentMonthNum)] || 0) > 0 ||
      (item.monthly_amounts?.[String(nextMonthNum)] || 0) > 0;
    return isNotStandardMonthly && hasCostThisOrNextMonth;
  });

  // שליחת הוצאה חדשה ל-Supabase
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
        alert('שגיאה בשמירה: ' + error.message);
      } else {
        setAmount('');
        setDescription('');
        setShowQuickAdd(false);
        fetchData(); // רענון הנתונים
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-900 pb-20 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 px-4 py-3 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-slate-800">ניהול תזרים משפחתי</h1>
          <p className="text-xs text-slate-500">תכנון ובקרה שנתית חכמה</p>
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
                placeholder="פירוט קצר (למשל: סופר פארם, שופרסל)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs p-2 border rounded-lg bg-slate-50 outline-none"
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-slate-900 text-white font-medium py-2 rounded-xl text-sm hover:bg-slate-800 transition"
              >
                {isSubmitting ? 'שומר במסד הנתונים...' : 'שמירת הוצאה'}
              </button>
            </form>
          </div>
        )}

        {/* כרטיסי סיכום עליונים */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm">
            <span className="text-xs text-slate-500 font-medium">שריון חודשי נדרש</span>
            <div className="text-xl font-extrabold text-blue-600 mt-1">
              ₪{loading ? '...' : totalMonthlyProvision.toLocaleString()}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">להפרשה לקרן בלת"ם ושנתי</p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm">
            <span className="text-xs text-slate-500 font-medium">יעד תקציב החודש</span>
            <div className="text-xl font-extrabold text-slate-800 mt-1">
              ₪{loading ? '...' : currentMonthPlannedTotal.toLocaleString()}
            </div>
            <p className="text-[10px] text-emerald-600 font-medium mt-0.5">לפי תכנון הגאנט</p>
          </div>
        </div>

        {/* מכ"ם הוצאות מזדמנות קדימה */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <AlertCircle size={16} className="text-amber-500" />
              <h2 className="text-sm font-bold text-slate-800">מכ"ם הוצאות קדימה</h2>
            </div>
            <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              חודש {currentMonthNum} ו-{nextMonthNum}
            </span>
          </div>

          <div className="space-y-2">
            {upcomingOccasionalItems.length === 0 ? (
              <p className="text-xs text-slate-400 py-2 text-center">אין הוצאות שנתיות מיוחדות בתקופה זו</p>
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

        {/* הוצאות בפועל שתועדו החודש */}
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
      </main>

      {/* סרגל ניווט תחתון */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-2 flex justify-around items-center z-10">
        <button className="flex flex-col items-center gap-0.5 text-blue-600">
          <Wallet size={18} />
          <span className="text-[10px] font-bold">מצב שוטף</span>
        </button>
        <button
          onClick={() => setShowQuickAdd(true)}
          className="-mt-5 bg-blue-600 text-white p-3 rounded-full shadow-lg border-2 border-white hover:scale-105 transition"
        >
          <PlusCircle size={22} />
        </button>
        <button
          onClick={() => alert('מסך הגאנט השנתי המלא ייפתח כאן')}
          className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-700"
        >
          <Calendar size={18} />
          <span className="text-[10px]">גאנט שנתי</span>
        </button>
      </nav>
    </div>
  );
}