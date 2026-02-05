import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, Plus, UploadCloud } from 'lucide-react'; // 移除了 RefreshCw
import { Editor, Activity } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface Props {
  companyName: string;
  isMobile?: boolean;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  activities: Activity[];
  onAddTask: () => void;
  editors: Editor[];
  syncStatus: string;
  lastSyncedAt?: string;
  // 移除了 onRefresh
  onPush?: () => Promise<void> | void;
  isPushing?: boolean;
  onGoToSettings?: () => void;
}

const Header: React.FC<Props> = ({ 
  isMobile, searchTerm, setSearchTerm, activities,
  onAddTask, onPush, onGoToSettings
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) setShowNotifications(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className={`${isMobile ? 'px-4 shadow-sm pt-safe pb-4' : 'h-16 px-8'} flex items-center justify-between bg-white border-b border-slate-200 shrink-0 z-30 relative transition-all`}>
      {/* 左側：搜尋列 */}
      <div className="flex-1 max-w-lg mr-2 flex items-center space-x-2">
        <div className="relative group flex-1">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${searchTerm ? 'text-indigo-500' : 'text-slate-400'}`} size={isMobile ? 14 : 16} />
          <input 
            type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isMobile ? "搜尋..." : "搜尋節目、集數、剪輯師..."}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-8 pr-8 focus:ring-2 ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-xs font-medium"
          />
        </div>
      </div>
      
      {/* 右側：按鈕區 */}
      <div className="flex items-center space-x-2">
        {/* 自動同步指示器 */}
        <button 
          onClick={onPush}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm transition-all bg-emerald-50 text-emerald-600 border border-emerald-100`}
          title="Firebase 自動同步中"
        >
          <UploadCloud size={12} />
          {!isMobile && <span>雲端同步中</span>}
        </button>

        {isMobile && (
          <button onClick={onAddTask} className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg active:scale-95 transition-all">
            <Plus size={18} />
          </button>
        )}

        {/* 通知鈴鐺 */}
        <div className="relative" ref={notificationRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`relative p-2 rounded-xl transition-all ${showNotifications ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Bell size={20} />
            {activities.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 border-2 border-white rounded-full"></span>}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-200 rounded-[24px] shadow-2xl overflow-hidden z-[100]">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">異動紀錄</span>
              </div>
              <div className="max-h-[350px] overflow-y-auto">
                {activities.map(activity => (
                  <div key={activity.id} className="p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <p className="text-xs font-bold text-slate-800">{activity.details}</p>
                    <span className="text-[9px] text-slate-300 uppercase font-black">
                       {(() => { try { return formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true, locale: zhTW }); } catch (e) { return '剛剛'; } })()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;