import React, { useState, useMemo, useEffect } from 'react';
// 引入我們剛剛設定好的 Firebase
import { db } from './firebase'; 
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

// 引入原本的型別與組件 (這些都不用動)
import { Task, Program, Editor, FilterState, WorkspaceSettings, Activity } from './types'; // 去掉 .ts
import Sidebar from './components/Sidebar'; // 去掉 .tsx
import MobileNav from './components/MobileNav';
import Header from './components/Header';
import CalendarView from './components/CalendarView';
import TaskModal from './components/TaskModal';
import FilterBar from './components/FilterBar';
import MemberManager from './components/MemberManager';
import ProgramManager from './components/ProgramManager';
import SettingsView from './components/SettingsView';
import StatsView from './components/StatsView';
import { SHOWS, EDITORS, EDITOR_COLORS } from './constants'; // 去掉 .tsx

const App: React.FC = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [currentView, setCurrentView] = useState('calendar');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterState>({ shows: [], editors: [] });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // ==========================================
  // 1. 新增：Firebase 狀態管理 (這是核心！)
  // ==========================================
  const [tasks, setTasks] = useState<Task[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

  // 本地設定狀態 (保留原本的編輯器和節目設定，暫時存在 LocalStorage)
  // 未來如果要連這也同步，可以依樣畫葫蘆把這些也搬到 Firebase
  const [localState, setLocalState] = useState(() => {
    const saved = localStorage.getItem("EDITFLOW_LOCAL_CONFIG");
    return saved ? JSON.parse(saved) : {
      programs: SHOWS.map(s => ({ id: s, name: s, priority: 'Medium', duration: '24:00', description: '' })),
      editors: EDITORS.map(e => ({ id: e, name: e, color: EDITOR_COLORS[e] || '#cbd5e1', role: 'Editor', notes: '' })),
      settings: { companyName: 'TaiwanPlus (Live)', syncStatus: 'live', lastSyncedAt: new Date().toISOString() }
    };
  });

  // 更新本地設定時儲存
  const updateLocalState = (newData: any) => {
    setLocalState(newData);
    localStorage.setItem("EDITFLOW_LOCAL_CONFIG", JSON.stringify(newData));
  };

  // ==========================================
  // 2. 新增：Firebase 監聽器 (Real-time Listener)
  // ==========================================
  useEffect(() => {
    // 監聽 "tasks" 集合
    const unsubscribe = onSnapshot(collection(db, "tasks"), 
      (snapshot) => {
        const liveTasks = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Task[];
        
        setTasks(liveTasks);
        setConnectionStatus('connected');
      }, 
      (error) => {
        console.error("Firebase 連線失敗:", error);
        setConnectionStatus('error');
        alert("連線失敗：請檢查 firebase.ts 設定，或是資料庫權限是否已開啟。");
      }
    );

    // 當視窗關閉時，取消監聽
    return () => unsubscribe();
  }, []);

  // ==========================================
  // 3. 修改：儲存與刪除邏輯 (改為寫入 Firebase)
  // ==========================================
  
  // 儲存任務 (新增或修改)
  const handleSaveTask = async (task: Task) => {
    try {
      // 確保有 ID
      const taskId = task.id || `task_${Date.now()}`;
      const taskToSave = { ...task, id: taskId };

      // 寫入 Firebase (如果有就更新，沒有就新增)
      await setDoc(doc(db, "tasks", taskId), taskToSave);
      
      // 關閉視窗 (不用手動更新 state，上面的 useEffect 會自動更新畫面)
      setIsModalOpen(false);
    } catch (e: any) {
      alert("儲存失敗: " + e.message);
    }
  };

  // 刪除任務
  const handleDeleteTask = async (taskId: string) => {
    if(!confirm("確定要刪除嗎？")) return;
    try {
      await deleteDoc(doc(db, "tasks", taskId));
      setIsModalOpen(false);
    } catch (e: any) {
      alert("刪除失敗: " + e.message);
    }
  };

  // ==========================================
  // 4. 計算過濾後的任務
  // ==========================================
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const sMatch = filters.shows.length === 0 || filters.shows.includes(t.show);
      const eMatch = filters.editors.length === 0 || filters.editors.includes(t.editor);
      const search = `${t.show} ${t.episode} ${t.editor}`.toLowerCase();
      return sMatch && eMatch && (!searchTerm || search.includes(searchTerm.toLowerCase()));
    });
  }, [tasks, filters, searchTerm]);

  return (
    <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} h-full bg-slate-50 text-slate-800 overflow-hidden`}>
      {!isMobile && <Sidebar onAddTask={() => { setEditingTask(null); setIsModalOpen(true); }} insights="" currentView={currentView} setCurrentView={setCurrentView} />}
      
      <main className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">
        <Header 
          companyName={localState.settings.companyName} 
          isMobile={isMobile} 
          searchTerm={searchTerm} 
          setSearchTerm={setSearchTerm}
          activities={[{id: 'status', type: 'info', userName: '系統', details: connectionStatus === 'connected' ? '雲端連線中' : '連線建立中...', timestamp: new Date().toISOString()}]} 
          onAddTask={() => { setEditingTask(null); setIsModalOpen(true); }}
          editors={localState.editors} 
          syncStatus={connectionStatus === 'connected' ? 'synced' : 'pending'} 
          lastSyncedAt={new Date().toISOString()}
          
          // ⚠️ 修正重點：
          // 1. 移除了 onRefresh={...}
          // 2. 移除了 googleSheetWriteUrl=""
          
          onPush={async () => { 
            alert("資料會自動儲存，不需要手動推播！");
          }}
          isPushing={false}
          
          onGoToSettings={() => setCurrentView('settings')}
        />
        
        <div className={`${isMobile ? 'px-2 pb-20' : 'px-8 pb-8'} flex-1 overflow-hidden flex flex-col`}>
          {currentView === 'calendar' && <FilterBar filters={filters} setFilters={setFilters} programs={localState.programs} editors={localState.editors} isMobile={isMobile} />}
          
          <div className={`flex-1 bg-white ${isMobile ? 'rounded-xl' : 'rounded-[32px]'} border border-slate-200 overflow-hidden shadow-sm relative`}>
            {(() => {
              switch(currentView) {
                case 'calendar': return <CalendarView tasks={filteredTasks} onEditTask={(t) => { setEditingTask(t); setIsModalOpen(true); }} editors={localState.editors} isMobile={isMobile} />;
                case 'stats': return <StatsView tasks={tasks} editors={localState.editors} programs={localState.programs} />;
                case 'team': return <MemberManager editors={localState.editors} setEditors={(e: any) => updateLocalState({...localState, editors: typeof e === 'function' ? e(localState.editors) : e})} tasks={tasks} setTasks={() => {}} />;
                case 'programs': return <ProgramManager programs={localState.programs} setPrograms={(pr: any) => updateLocalState({...localState, programs: typeof pr === 'function' ? pr(localState.programs) : pr})} tasks={tasks} setTasks={() => {}} />;
                case 'settings': 
                  return <SettingsView 
                    settings={localState.settings} 
                    setSettings={(s) => updateLocalState({...localState, settings: s})} 
                    tasks={tasks} setTasks={() => {}} 
                    programs={localState.programs} setPrograms={(pr: any) => updateLocalState({...localState, programs: pr})} 
                    editors={localState.editors} setEditors={(e: any) => updateLocalState({...localState, editors: e})} 
                    onReset={() => {}}
                    onSyncGoogleSheets={async () => true} // 這裡加了 async 並回傳 true
                    onPushToGoogleSheets={async () => {}} // 這裡加了 async 解決報錯
                    isPushing={false}
                  />;
                default: return null;
              }
            })()}
          </div>
        </div>
        {isMobile && <MobileNav currentView={currentView} setCurrentView={setCurrentView} />}
      </main>

      {isModalOpen && (
        <TaskModal
          task={editingTask} 
          programs={localState.programs} 
          editors={localState.editors} 
          isMobile={isMobile}
          onClose={() => { setEditingTask(null); setIsModalOpen(false); }}
          onSave={handleSaveTask}   // 使用新的 Firebase 儲存函數
          onDelete={handleDeleteTask} // 使用新的 Firebase 刪除函數
        />
      )}
    </div>
  );
};

export default App;