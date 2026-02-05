import React, { useState } from 'react';
import { Settings, Save, Database, AlertCircle, FileText, CheckCircle, Trash2 } from 'lucide-react';
import { WorkspaceSettings, Task, Program, Editor } from '../types';
import { db } from '../firebase';
import { writeBatch, doc, collection, getDocs } from 'firebase/firestore';

interface Props {
  settings: WorkspaceSettings;
  setSettings: (settings: WorkspaceSettings) => void;
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  programs: Program[];
  setPrograms: (programs: Program[]) => void;
  editors: Editor[];
  setEditors: (editors: Editor[]) => void;
  onReset: () => void;
  onSyncGoogleSheets: any;
  onPushToGoogleSheets: any;
  isPushing: boolean;
}

// 🔧 工具：自動把各種日期格式轉成 YYYY-MM-DD
const normalizeDate = (dateStr: string): string => {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  
  // 移除多餘空白
  const clean = dateStr.trim();
  
  // 嘗試處理 2024/02/05 或 2024.02.05
  const parts = clean.split(/[/.-]/); 
  
  if (parts.length === 3) {
    let [y, m, d] = parts;
    // 如果年份在最後面 (如 05/02/2024)，交換一下 (簡單判斷)
    if (y.length <= 2 && d.length === 4) { [y, d] = [d, y]; }
    
    // 補 0 (變成 02)
    m = m.padStart(2, '0');
    d = d.padStart(2, '0');
    
    return `${y}-${m}-${d}`;
  }
  
  return clean; // 如果格式太奇怪就原樣回傳，或是回傳今天
};

const SettingsView: React.FC<Props> = ({
  settings, setSettings, onReset
}) => {
  const [csvText, setCsvText] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

  const handleImportCSV = async () => {
    if (!csvText.trim()) return;
    setImportStatus('processing');
    console.log("開始解析 CSV...");

    try {
      const batch = writeBatch(db);
      const lines = csvText.split(/\r?\n/).filter(l => l.trim());
      let successCount = 0;
      
      lines.forEach((line, index) => {
        // 跳過標題列
        if (line.includes('節目') || line.includes('show') || line.includes('Start Date')) {
          return;
        }

        // ⭐️ 重點修正：使用正規表達式來切割，可以處理 "Zoom In, Zoom Out" 這種有引號的情況
        // 這行咒語的意思是：抓取「被雙引號包住的內容」或是「沒有逗號的內容」
        const matches = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
        
        if (!matches || matches.length < 4) {
          console.warn(`第 ${index + 1} 行資料格式不足:`, line);
          return;
        }

        // 清理資料：把前後的引號拿掉 (replace) 並修剪空白 (trim)
        const cols = matches.map(c => c.replace(/^"|"$/g, '').trim());

        // ==========================================
        // 根據你的資料順序：
        // [0]節目, [1]集數, [2]剪輯師, [3]開始日, [4]交播日(可選)
        // ==========================================
        const rawShow = cols[0];
        const rawEp = cols[1];
        const rawEditor = cols[2];
        const rawStartDate = cols[3];
        const rawEndDate = cols[4]; // 如果沒有這一欄，下面會自動用開始日代替

        const finalStartDate = normalizeDate(rawStartDate);
        const finalEndDate = rawEndDate ? normalizeDate(rawEndDate) : finalStartDate;

        console.log(`解析結果: ${rawShow} | ${finalStartDate} ~ ${finalEndDate}`);

        const newTaskRef = doc(collection(db, "tasks"));
        batch.set(newTaskRef, {
          id: newTaskRef.id,
          show: rawShow || '未分類',
          episode: rawEp || '',
          editor: rawEditor || '',
          startDate: finalStartDate,
          endDate: finalEndDate, 
          lastEditedAt: new Date().toISOString(),
          version: 1
        });
        successCount++;
      });

      if (successCount === 0) {
        throw new Error("沒有解析出任何有效資料，請檢查 CSV 格式。");
      }

      await batch.commit();
      setImportStatus('success');
      setCsvText('');
      alert(`✅ 成功匯入 ${successCount} 筆資料！\n包含解決了像 "${lines[1]?.split(',')[0]}..." 這種有逗號的標題！`);
      
    } catch (error: any) {
      console.error("匯入錯誤:", error);
      setImportStatus('error');
      alert('❌ 匯入失敗：' + error.message);
    }
  };

  const handleClearAllData = async () => {
    if (!confirm("⚠️ 警告：這將會刪除「雲端資料庫」裡的所有任務！\n確定要執行嗎？")) return;
    try {
      setImportStatus('processing');
      const querySnapshot = await getDocs(collection(db, "tasks"));
      const batch = writeBatch(db);
      querySnapshot.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      setImportStatus('success');
      alert("🗑️ 已清空所有雲端資料！");
    } catch (e: any) { alert("刪除失敗：" + e.message); } 
    finally { setImportStatus('idle'); }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-y-auto">
      <div className="p-6 bg-white border-b border-slate-200 sticky top-0 z-10">
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
          <Settings className="text-slate-400" /> 系統設定
        </h2>
      </div>

      <div className="p-8 max-w-3xl space-y-8">
        {/* CSV 匯入區 */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm ring-4 ring-indigo-50/50">
          <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
            <FileText size={20} className="text-emerald-500" /> 匯入 CSV
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            預設格式順序：<b>節目名稱, 集數, 剪輯師, 日期(2024-02-05)</b>
          </p>
          
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="例如：&#10;新聞面對面, EP50, James, 2024/02/06"
            className="w-full h-40 bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs font-mono mb-4 outline-none"
          />

          <div className="flex justify-between">
             <button onClick={handleClearAllData} className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-lg text-xs font-bold hover:bg-red-200">
               <Trash2 size={14}/> 清空所有資料
             </button>
             <button 
                onClick={handleImportCSV}
                disabled={!csvText || importStatus === 'processing'}
                className="px-6 py-2 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 shadow-lg"
             >
               {importStatus === 'processing' ? '處理中...' : '開始匯入'}
             </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsView;