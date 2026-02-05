import React, { useMemo, useState } from 'react';
import { Task, Editor } from '../types';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameDay, parseISO, isWithinInterval, 
  addMonths, subMonths, isToday, startOfDay, isBefore, isAfter, areIntervalsOverlapping 
} from 'date-fns';
import { ChevronLeft, ChevronRight, Circle, PlayCircle, AlertCircle, CheckCircle, Users, LayoutGrid } from 'lucide-react';

interface Props {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  editors: Editor[];
  isMobile: boolean;
}

// ==========================================
// 🎨 配色系統
// ==========================================

// 1. 節目配色 
const getShowColorStyle = (showName: string) => {
  const name = showName.toLowerCase();
  
  if (name.includes("formosa") || name.includes("finding")) return "bg-[#FFD1DC] text-slate-700 ring-1 ring-[#EEC0CB]"; 
  if (name.includes("zoom")) return "bg-[#C1E1C1] text-slate-700 ring-1 ring-[#AECFA3]"; 
  if (name.includes("dc")) return "bg-[#AEC6CF] text-slate-700 ring-1 ring-[#9AB2BB]";
  if (name.includes("missed") || name.includes("case")) return "bg-[#FDFD96] text-slate-700 ring-1 ring-[#EBEB84]";
  if (name.includes("correspondents")) return "bg-[#E6DCCF] text-slate-700 ring-1 ring-[#D6CCBF]";
  
  return "bg-[#F1F5F9] text-slate-600 ring-1 ring-[#E2E8F0]";
};

// 2. 剪輯師配色 (提亮彩度！✨)
const getEditorColorStyle = (name: string) => {
  const n = name.toLowerCase();
  
  // Eason -> 亮麗太陽黃 (比之前明亮)
  if (n.includes("eason")) return "bg-[#FFE58F] text-[#876800] ring-1 ring-[#F0D570]"; 
  
  // James -> 清透天空藍 (飽和度提高)
  if (n.includes("james")) return "bg-[#91CAFF] text-[#003A8C] ring-1 ring-[#69B1FF]";   
  
  // Dolphine -> 甜美櫻花粉 (更粉嫩)
  if (n.includes("dolphine")) return "bg-[#FFADD2] text-[#780650] ring-1 ring-[#FF85C0]"; 
  
  // 其他人 -> 隨機亮色
  const otherColors = [
    'bg-[#95DE64] text-[#135200] ring-1 ring-[#73D13D]', // 亮綠
    'bg-[#B37FEB] text-[#391085] ring-1 ring-[#9254DE]', // 亮紫
    'bg-[#FFC069] text-[#873800] ring-1 ring-[#FA8C16]'  // 亮橘
  ];
  return otherColors[name.length % otherColors.length];
};

// 🚦 3. 狀態燈號
const getTaskStatus = (startDateStr: string, endDateStr: string) => {
  const today = startOfDay(new Date());
  const start = startOfDay(parseISO(startDateStr));
  const end = startOfDay(parseISO(endDateStr));

  if (isBefore(today, start)) return { label: '待處理', icon: Circle, color: 'text-slate-400/80' };
  if (isAfter(today, end)) return { label: '已交片', icon: CheckCircle, color: 'text-emerald-600' };
  if (isSameDay(today, end)) return { label: '審片中', icon: AlertCircle, color: 'text-amber-600' };
  return { label: '剪輯中', icon: PlayCircle, color: 'text-indigo-600' };
};

const CalendarView: React.FC<Props> = ({ tasks, onEditTask, isMobile }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'editor' | 'show'>('editor');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  // 🧱 排版核心
  const taskLayout = useMemo(() => {
    const visibleTasks = tasks.filter(t => 
      areIntervalsOverlapping(
        { start: parseISO(t.startDate), end: parseISO(t.endDate) },
        { start: startDate, end: endDate }
      )
    );

    visibleTasks.sort((a, b) => {
      const startDiff = a.startDate.localeCompare(b.startDate);
      if (startDiff !== 0) return startDiff;
      
      if (viewMode === 'editor') {
        const editorDiff = a.editor.localeCompare(b.editor);
        if (editorDiff !== 0) return editorDiff;
      } else {
        const showDiff = a.show.localeCompare(b.show);
        if (showDiff !== 0) return showDiff;
      }
      return 0;
    });

    const layout: Record<string, number> = {}; 
    const rows: Date[] = []; 

    visibleTasks.forEach(task => {
      const taskStart = parseISO(task.startDate);
      const taskEnd = parseISO(task.endDate);
      let assignedRow = -1;

      for (let i = 0; i < rows.length; i++) {
        if (isBefore(rows[i], taskStart)) {
          assignedRow = i;
          rows[i] = taskEnd;
          break;
        }
      }

      if (assignedRow === -1) {
        assignedRow = rows.length;
        rows.push(taskEnd);
      }
      layout[task.id] = assignedRow;
    });
    return layout;
  }, [tasks, startDate, endDate, viewMode]);

  const getTaskStyle = (task: Task) => {
    if (viewMode === 'editor') return getEditorColorStyle(task.editor);
    return getShowColorStyle(task.show);
  };

  const getAvatarStyle = (task: Task) => {
    if (viewMode === 'editor') return "bg-white/80 text-slate-700 ring-1 ring-slate-200/50";
    return getEditorColorStyle(task.editor).replace('text-', 'text-').split(' ')[0] + ' text-slate-800 ring-1 ring-white/50'; 
  };

  if (isMobile) {
    return (
      <div className="h-full overflow-y-auto p-4 space-y-3 pb-24">
        {tasks.sort((a,b) => a.startDate.localeCompare(b.startDate)).map(task => (
            <div key={task.id} onClick={() => onEditTask(task)} className={`p-4 rounded-xl shadow-sm border-l-4 bg-white ${getTaskStyle(task).replace('bg-', 'border-').split(' ')[0]}`}>
              <h3 className="font-bold text-slate-700">
                {task.show} <span className="text-slate-400 text-sm ml-1 font-medium">{task.episode ? `#${task.episode}` : ''}</span>
              </h3>
              <p className="text-xs text-slate-400">{task.startDate} ~ {task.endDate}</p>
              <div className={`mt-2 inline-block px-2 py-1 rounded-md text-xs font-bold ${getEditorColorStyle(task.editor)}`}>
                {task.editor}
              </div>
            </div>
        ))}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 導航列 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
        <div className="flex items-center gap-6">
            <h2 className="text-2xl font-black text-slate-700 tracking-tight font-serif">
            {format(currentMonth, 'yyyy年 M月')}
            </h2>
            
            <div className="flex bg-slate-100 p-1 rounded-lg">
                <button 
                    onClick={() => setViewMode('editor')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'editor' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Users size={14} /> 依剪輯師
                </button>
                <button 
                    onClick={() => setViewMode('show')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'show' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <LayoutGrid size={14} /> 依節目
                </button>
            </div>
        </div>

        <div className="flex bg-slate-50 rounded-lg p-1 border border-slate-100">
          <button onClick={prevMonth} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-500"><ChevronLeft size={18}/></button>
          <button onClick={goToToday} className="px-3 text-xs font-bold hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600">今天</button>
          <button onClick={nextMonth} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-500"><ChevronRight size={18}/></button>
        </div>
      </div>

      {/* 星期標題 */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
        {weekDays.map(day => (
          <div key={day} className="py-3 text-center text-xs font-bold text-slate-400 tracking-wider">週{day}</div>
        ))}
      </div>

      {/* 日期網格 */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-y-auto content-start">
        {calendarDays.map((day) => {
          const isCurrentMonth = format(day, 'M') === format(currentMonth, 'M');
          const isTodayDate = isToday(day);

          const todaysTasks = tasks.filter(task => 
            isWithinInterval(day, {
              start: parseISO(task.startDate),
              end: parseISO(task.endDate)
            })
          );

          const maxRowIndex = todaysTasks.reduce((max, t) => Math.max(max, taskLayout[t.id] || 0), -1);
          const rowsToRender = Array.from({ length: maxRowIndex + 1 }, (_, i) => i);

          return (
            <div 
              key={day.toString()} 
              // ⭐️ 修正：把 border-r 加回來 (行事曆的底線)
              className={`min-h-[120px] border-b border-r border-slate-100 transition-colors p-0
                ${!isCurrentMonth ? 'bg-slate-50/20' : 'bg-white'}
              `}
            >
              {/* 日期 */}
              <div className="flex justify-center py-2 pointer-events-none">
                <span className={`text-[11px] font-bold w-6 h-6 flex items-center justify-center rounded-full 
                  ${isTodayDate ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400'}`}>
                  {format(day, 'd')}
                </span>
              </div>

              {/* 任務堆疊區 */}
              <div className="flex flex-col w-full relative pb-1"> 
                {rowsToRender.map(rowIndex => {
                  const task = todaysTasks.find(t => taskLayout[t.id] === rowIndex);

                  if (!task) {
                    return <div key={`spacer-${rowIndex}`} className="h-7 mb-1 invisible" />;
                  }

                  const isStartDay = isSameDay(day, parseISO(task.startDate));
                  const isEndDay = isSameDay(day, parseISO(task.endDate));
                  const isMonday = format(day, 'E') === 'Mon';

                  const zIndexClass = (isStartDay || isMonday) ? 'z-20 overflow-visible' : 'z-10';

                  // ⭐️ 修正：這裡保持負邊距，讓「色塊處不要有分線」
                  let shapeClass = "mx-[-1px] rounded-none"; 
                  if (isStartDay && isEndDay) shapeClass = "mx-1 rounded-md";
                  else if (isStartDay) shapeClass = "ml-1 mr-[-1px] rounded-l-md rounded-r-none";
                  else if (isEndDay) shapeClass = "mr-1 ml-[-1px] rounded-r-md rounded-l-none";

                  const status = getTaskStatus(task.startDate, task.endDate);
                  const StatusIcon = status.icon;

                  return (
                    <div 
                      key={task.id}
                      onClick={(e) => { e.stopPropagation(); onEditTask(task); }}
                      className={`
                        relative h-7 mb-1 flex items-center px-2 cursor-pointer transition-all hover:brightness-105
                        ${getTaskStyle(task)} ${shapeClass} ${zIndexClass}
                        text-[11px] font-bold shadow-sm group
                      `}
                      title={`${task.show} #${task.episode} - ${task.editor}`}
                    >
                      {(isStartDay || isMonday) && (
                        <div className="flex items-center w-full whitespace-nowrap absolute left-2 right-1 top-0 bottom-0">
                           
                           <div className="flex items-center gap-1.5 flex-1 overflow-visible">
                             <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black shadow-sm shrink-0 ${getAvatarStyle(task)}`}>
                                {task.editor.charAt(0).toUpperCase()}
                             </div>
                             
                             <span className="drop-shadow-sm pr-4 opacity-90 font-medium">
                               {task.show} 
                               {task.episode && <span className="ml-1 opacity-70 font-normal">#{task.episode}</span>}
                             </span>
                           </div>

                           <div className={`relative ${status.color} drop-shadow-sm shrink-0 bg-white/30 rounded-full p-0.5`} title={status.label}>
                              <StatusIcon size={11} strokeWidth={3} />
                           </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarView;