import React, { useMemo, useEffect, useState } from 'react';
import { Task, Editor, Program } from '../types';
import { BarChart3, PieChart, TrendingUp, Users, Layout, Calendar, Clock } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

interface Props {
  tasks: Task[];
  editors: Editor[];
  programs: Program[];
}

// 🎨 馬卡龍配色 (Zoom=綠, Formosa=粉)
const COLORS = {
  mint: '#C1E1C1',   // Zoom In
  pink: '#FFD1DC',   // Formosa
  sky: '#AEC6CF',    // DC
  cream: '#FDFD96',  // Missed
  beige: '#E6DCCF',  // Correspondents
  gray: '#F1F5F9'
};

const StatsView: React.FC<Props> = ({ tasks, editors }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // 1. 計算核心數據
  const stats = useMemo(() => {
    const totalTasks = tasks.length;
    const now = new Date();
    
    // 篩選本月任務
    const thisMonthTasks = tasks.filter(t => 
      isWithinInterval(parseISO(t.startDate), {
        start: startOfMonth(now),
        end: endOfMonth(now)
      })
    );
    const currentMonthTasksCount = thisMonthTasks.length;

    // --- A. 計算「總體」數據 (All Time) ---
    const showCounts: Record<string, number> = {};
    const editorCounts: Record<string, number> = {};
    tasks.forEach(t => {
      showCounts[t.show.trim()] = (showCounts[t.show.trim()] || 0) + 1;
      editorCounts[t.editor.trim()] = (editorCounts[t.editor.trim()] || 0) + 1;
    });

    // --- B. 計算「本月」數據 (This Month) ---
    const monthShowCounts: Record<string, number> = {};
    const monthEditorCounts: Record<string, number> = {};
    thisMonthTasks.forEach(t => {
      monthShowCounts[t.show.trim()] = (monthShowCounts[t.show.trim()] || 0) + 1;
      monthEditorCounts[t.editor.trim()] = (monthEditorCounts[t.editor.trim()] || 0) + 1;
    });

    return { 
      totalTasks, 
      currentMonthTasksCount, 
      showCounts, 
      editorCounts,
      monthShowCounts,
      monthEditorCounts,
      monthLabel: format(now, 'yyyy年 M月')
    };
  }, [tasks]);

  // 計算最大值 (為了讓進度條比例正確)
  const maxShowCount = Math.max(...Object.values(stats.showCounts), 1);
  const maxEditorCount = Math.max(...Object.values(stats.editorCounts), 1);
  const maxMonthShowCount = Math.max(...Object.values(stats.monthShowCounts), 1);
  const maxMonthEditorCount = Math.max(...Object.values(stats.monthEditorCounts), 1);

  // 輔助函數：取得節目顏色
  const getBarColor = (showName: string) => {
    const name = showName.toLowerCase();
    if (name.includes('formosa')) return COLORS.pink; // Formosa -> 粉
    if (name.includes('dc')) return COLORS.sky;
    if (name.includes('missed')) return COLORS.cream;
    if (name.includes('zoom')) return COLORS.mint; // Zoom -> 綠
    if (name.includes('correspondents')) return COLORS.beige;
    return COLORS.gray;
  };

  return (
    <div className="h-full bg-slate-50 overflow-y-auto p-8">
      <div className={`max-w-6xl mx-auto space-y-10 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        
        {/* 標題區 */}
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <TrendingUp className="text-indigo-500" />
            數據儀表板
          </h2>
          <p className="text-slate-500 text-sm mt-1 ml-9">即時分析節目產量與人力分配</p>
        </div>

        {/* 1. KPI 卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: '歷史總排程', val: stats.totalTasks, unit: '件', icon: Layout, color: 'bg-indigo-50 text-indigo-600', delay: '0ms' },
            { label: '本月新案件', val: stats.currentMonthTasksCount, unit: '件', icon: Calendar, color: 'bg-emerald-50 text-emerald-600', delay: '100ms' },
            { label: '團隊成員', val: Object.keys(stats.editorCounts).length, unit: '人', icon: Users, color: 'bg-rose-50 text-rose-600', delay: '200ms' }
          ].map((item, idx) => (
             <div key={idx} 
                  className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 transition-transform hover:scale-105"
                  style={{ transitionDelay: item.delay }}
             >
                <div className={`p-3 rounded-xl ${item.color}`}><item.icon size={24} /></div>
                <div>
                  <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">{item.label}</div>
                  <div className="text-3xl font-black text-slate-800 tabular-nums">
                    {mounted ? item.val : 0} 
                    <span className="text-sm font-medium text-slate-400 ml-1">{item.unit}</span>
                  </div>
                </div>
             </div>
          ))}
        </div>

        {/* ==============================================
            2. 本月詳細分析 (Monthly Deep Dive) 
           ============================================== */}
        <section>
           <div className="flex items-center gap-3 mb-6">
             <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
               <Clock size={20} />
             </div>
             <h3 className="text-xl font-black text-slate-800">
               {stats.monthLabel} 重點分析
               <span className="ml-3 text-xs font-medium text-white bg-emerald-500 px-2 py-1 rounded-full">Current Month</span>
             </h3>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 本月節目排行 */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm ring-4 ring-emerald-50/50">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                  <PieChart size={16}/> 本月節目產量
                </h4>
                {Object.keys(stats.monthShowCounts).length === 0 ? (
                  <div className="text-center text-slate-400 py-10 text-sm">本月尚無案件數據</div>
                ) : (
                  <div className="space-y-5">
                    {Object.entries(stats.monthShowCounts)
                      .sort(([,a], [,b]) => b - a)
                      .map(([show, count], idx) => (
                        <div key={show} className="group">
                          <div className="flex justify-between text-xs font-bold text-slate-600 mb-1.5">
                            <span>{show}</span>
                            <span>{count} 件</span>
                          </div>
                          <div className="w-full bg-slate-50 rounded-full h-3 overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-1000 ease-out"
                              style={{ 
                                width: mounted ? `${(count / maxMonthShowCount) * 100}%` : '0%',
                                backgroundColor: getBarColor(show),
                                transitionDelay: `${idx * 100}ms`
                              }} 
                            />
                          </div>
                        </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 本月剪輯師工作量 */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm ring-4 ring-emerald-50/50">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                  <BarChart3 size={16}/> 本月剪輯師工作量
                </h4>
                {Object.keys(stats.monthEditorCounts).length === 0 ? (
                  <div className="text-center text-slate-400 py-10 text-sm">本月尚無案件數據</div>
                ) : (
                  <div className="space-y-5">
                    {Object.entries(stats.monthEditorCounts)
                      .sort(([,a], [,b]) => b - a)
                      .map(([editor, count], idx) => (
                        <div key={editor} className="group">
                          <div className="flex justify-between text-xs font-bold text-slate-600 mb-1.5">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-emerald-50 text-[10px] flex items-center justify-center text-emerald-600 font-black shadow-sm">
                                  {editor.charAt(0).toUpperCase()}
                              </div>
                              <span>{editor}</span>
                            </div>
                            <span>{count} 件</span>
                          </div>
                          <div className="w-full bg-slate-50 rounded-full h-3 overflow-hidden">
                            <div 
                              className="h-full bg-emerald-400 rounded-full transition-all duration-1000 ease-out group-hover:bg-emerald-500"
                              style={{ 
                                width: mounted ? `${(count / maxMonthEditorCount) * 100}%` : '0%',
                                transitionDelay: `${idx * 100}ms`
                              }} 
                            />
                          </div>
                        </div>
                    ))}
                  </div>
                )}
              </div>
           </div>
        </section>


        {/* ==============================================
            3. 歷史總體分析 (All Time Overview) 
           ============================================== */}
        <section className="opacity-80 hover:opacity-100 transition-opacity">
           <div className="flex items-center gap-3 mb-6 mt-8 border-t border-slate-200 pt-8">
             <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
               <Layout size={20} />
             </div>
             <h3 className="text-xl font-black text-slate-800">歷史總體分析</h3>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 總體節目排行 */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                  <PieChart size={16}/> 歷史節目總量
                </h4>
                <div className="space-y-5">
                  {Object.entries(stats.showCounts)
                    .sort(([,a], [,b]) => b - a)
                    .map(([show, count], idx) => (
                      <div key={show} className="group">
                        <div className="flex justify-between text-xs font-bold text-slate-600 mb-1.5">
                          <span>{show}</span>
                          <span>{count} 件</span>
                        </div>
                        <div className="w-full bg-slate-50 rounded-full h-3 overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-1000 ease-out"
                            style={{ 
                              width: mounted ? `${(count / maxShowCount) * 100}%` : '0%',
                              backgroundColor: getBarColor(show),
                              transitionDelay: `${idx * 100}ms`
                            }} 
                          />
                        </div>
                      </div>
                  ))}
                </div>
              </div>

              {/* 總體剪輯師排行 */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                  <BarChart3 size={16}/> 歷史剪輯師總量
                </h4>
                <div className="space-y-5">
                  {Object.entries(stats.editorCounts)
                    .sort(([,a], [,b]) => b - a)
                    .map(([editor, count], idx) => (
                      <div key={editor} className="group">
                        <div className="flex justify-between text-xs font-bold text-slate-600 mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-50 text-[10px] flex items-center justify-center text-indigo-500 font-black shadow-sm">
                                {editor.charAt(0).toUpperCase()}
                            </div>
                            <span>{editor}</span>
                          </div>
                          <span>{count} 件</span>
                        </div>
                        <div className="w-full bg-slate-50 rounded-full h-3 overflow-hidden">
                          <div 
                            className="h-full bg-indigo-400 rounded-full transition-all duration-1000 ease-out group-hover:bg-indigo-500"
                            style={{ 
                              width: mounted ? `${(count / maxEditorCount) * 100}%` : '0%',
                              transitionDelay: `${idx * 100}ms`
                            }} 
                          />
                        </div>
                      </div>
                  ))}
                </div>
              </div>
           </div>
        </section>

      </div>
    </div>
  );
};

export default StatsView;