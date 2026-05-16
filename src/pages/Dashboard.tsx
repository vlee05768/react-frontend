import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="p-6 md:p-10 min-h-screen">
      <div className="dashboard-container">
        {/* Header Section */}
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-xl font-bold tracking-wider border-l-4 border-blue-500 pl-3 text-gray-800 dark:text-gray-200">
            待處理事項
          </h2>
          <span className="text-sm text-gray-500">點擊卡片可跳轉對應列表</span>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-10 h-32">
          <div className="dashboard-card" onClick={() => navigate('/sales/orders')}>
            <div className="card-border bg-orange-500"></div>
            <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">未完成訂單</div>
            <div className="text-3xl font-bold text-orange-500 mt-2">1,109</div>
            <div className="text-xs text-blue-500 dark:text-blue-400 mt-auto pt-2 flex items-center hover:text-blue-400 dark:hover:text-blue-300">
              <span>前往列表</span> <span className="ml-1">→</span>
            </div>
          </div>
          <div className="dashboard-card" onClick={() => navigate('/production/workorders')}>
            <div className="card-border bg-red-500"></div>
            <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">未開工製令</div>
            <div className="text-3xl font-bold text-red-500 mt-2">15</div>
            <div className="text-xs text-blue-500 dark:text-blue-400 mt-auto pt-2 flex items-center hover:text-blue-400 dark:hover:text-blue-300">
              <span>前往列表</span> <span className="ml-1">→</span>
            </div>
          </div>
          <div className="dashboard-card" onClick={() => navigate('/production/workorders')}>
            <div className="card-border bg-blue-500"></div>
            <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">待發/領料提示</div>
            <div className="text-3xl font-bold text-blue-500 mt-2">6</div>
            <div className="text-xs text-blue-500 dark:text-blue-400 mt-auto pt-2 flex items-center hover:text-blue-400 dark:hover:text-blue-300">
              <span>前往列表</span> <span className="ml-1">→</span>
            </div>
          </div>
          <div className="dashboard-card" onClick={() => navigate('/production-quality/production-receipts')}>
            <div className="card-border bg-purple-500"></div>
            <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">待 QC 檢驗 (PR)</div>
            <div className="text-3xl font-bold text-purple-500 mt-2">12</div>
            <div className="text-xs text-blue-500 dark:text-blue-400 mt-auto pt-2 flex items-center hover:text-blue-400 dark:hover:text-blue-300">
              <span>前往列表</span> <span className="ml-1">→</span>
            </div>
          </div>
          <div className="dashboard-card" onClick={() => navigate('/production-quality/qc-receipts')}>
            <div className="card-border bg-teal-500"></div>
            <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">待 QC 入庫</div>
            <div className="text-3xl font-bold text-teal-500 mt-2">8</div>
            <div className="text-xs text-blue-500 dark:text-blue-400 mt-auto pt-2 flex items-center hover:text-blue-400 dark:hover:text-blue-300">
              <span>前往列表</span> <span className="ml-1">→</span>
            </div>
          </div>
          <div className="dashboard-card" onClick={() => navigate('/sales/salesdeliveries')}>
            <div className="card-border bg-yellow-500"></div>
            <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">待銷貨出庫 (SD)</div>
            <div className="text-3xl font-bold text-yellow-500 mt-2">24</div>
            <div className="text-xs text-blue-500 dark:text-blue-400 mt-auto pt-2 flex items-center hover:text-blue-400 dark:hover:text-blue-300">
              <span>前往列表</span> <span className="ml-1">→</span>
            </div>
          </div>
          <div className="dashboard-card" onClick={() => navigate('/purchase/materials')}>
            <div className="card-border bg-indigo-500"></div>
            <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">採購待核准</div>
            <div className="text-3xl font-bold text-indigo-500 mt-2">3</div>
            <div className="text-xs text-blue-500 dark:text-blue-400 mt-auto pt-2 flex items-center hover:text-blue-400 dark:hover:text-blue-300">
              <span>前往列表</span> <span className="ml-1">→</span>
            </div>
          </div>
          <div className="dashboard-card" onClick={() => navigate('/warehouse/inventory-adjustments')}>
            <div className="card-border bg-rose-500"></div>
            <div className="text-sm font-medium text-rose-500 dark:text-rose-400">⚠️ 異常報廢警示</div>
            <div className="text-3xl font-bold text-rose-500 mt-2">2</div>
            <div className="text-xs text-blue-500 dark:text-blue-400 mt-auto pt-2 flex items-center hover:text-blue-400 dark:hover:text-blue-300">
              <span>檢視明細</span> <span className="ml-1">→</span>
            </div>
          </div>
        </div>

        {/* Flowchart Section */}
        <div className="flex justify-between items-end mb-4 mt-8">
          <h2 className="text-xl font-bold tracking-wider border-l-4 border-blue-500 pl-3 text-gray-800 dark:text-gray-200">
            系統作業流程
          </h2>
          <span className="text-sm text-gray-500">點擊下方按鈕可直接進入各模組</span>
        </div>

        <div className="bg-white dark:bg-[#191919] p-8 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm dark:shadow-none">
          
          {/* 核心業務流程 Core Flow (Columns) */}
          <div className="flex items-start justify-between gap-2 overflow-x-auto pb-4">
            
            {/* 基本資料模組列 (放最左邊) */}
            <div className="flow-col">
              <div className="flow-node-header border-t-4 border-t-yellow-500">
                <div className="text-yellow-500 dark:text-yellow-400 mb-1">
                  <svg className="w-7 h-7 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                </div>
                <div className="font-bold text-gray-800 dark:text-gray-200">基本資料</div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="sub-btn" onClick={() => navigate('/business-partners')}>🤝 廠商客戶</div>
                <div className="sub-btn" onClick={() => navigate('/employee')}>🧑‍💼 員工資料</div>
              </div>
            </div>

            {/* 透明箭頭：佔位用 */}
            <div className="flow-arrow opacity-0 pointer-events-none">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </div>

            {/* 銷售模組列 */}
            <div className="flow-col">
              <div className="flow-node-header border-t-4 border-t-blue-500">
                <div className="text-blue-500 dark:text-blue-400 mb-1">
                  <svg className="w-7 h-7 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                </div>
                <div className="font-bold text-gray-800 dark:text-gray-200">銷售管理</div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="sub-btn" onClick={() => navigate('/sales/orders')}>📄 訂單管理</div>
                <div className="sub-btn" onClick={() => navigate('/sales/salesdeliveries')}>🚚 銷貨單維護</div>
                <div className="sub-btn" onClick={() => navigate('/sales/statements')}>🧾 客戶對帳單</div>
              </div>
            </div>

            <div className="flow-arrow">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </div>

            {/* 採購模組列 */}
            <div className="flow-col">
              <div className="flow-node-header border-t-4 border-t-pink-500">
                <div className="text-pink-500 dark:text-pink-400 mb-1">
                  <svg className="w-7 h-7 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                </div>
                <div className="font-bold text-gray-800 dark:text-gray-200">採購管理</div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="sub-btn-dev" title="開發中">📝 請購單 (Dev)</div>
                <div className="sub-btn-dev" title="開發中">🛒 採購單 (Dev)</div>
              </div>
            </div>

            <div className="flow-arrow">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </div>

            {/* 生產模組列 */}
            <div className="flow-col">
              <div className="flow-node-header border-t-4 border-t-indigo-500">
                <div className="text-indigo-500 dark:text-indigo-400 mb-1">
                  <svg className="w-7 h-7 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                </div>
                <div className="font-bold text-gray-800 dark:text-gray-200">生產管理</div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="sub-btn" onClick={() => navigate('/production/workorders')}>📋 製令 (WO)</div>
                <div className="sub-btn" onClick={() => navigate('/production-quality/machines')}>⚙️ 機台維護</div>
                <div className="sub-btn" onClick={() => navigate('/production-quality/molds')}>🔧 模具維護</div>
              </div>
            </div>

            <div className="flow-arrow">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </div>

            {/* 品檢模組列 */}
            <div className="flow-col">
              <div className="flow-node-header border-t-4 border-t-purple-500">
                <div className="text-purple-500 dark:text-purple-400 mb-1">
                  <svg className="w-7 h-7 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <div className="font-bold text-gray-800 dark:text-gray-200">品檢管理</div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="sub-btn" onClick={() => navigate('/production-quality/production-receipts')}>📥 生產入庫單 (PR)</div>
                <div className="sub-btn" onClick={() => navigate('/production-quality/qc-receipts')}>🔍 QC 檢驗單</div>
              </div>
            </div>

            <div className="flow-arrow">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </div>

            {/* 庫存模組列 */}
            <div className="flow-col">
              <div className="flow-node-header border-t-4 border-t-teal-500">
                <div className="text-teal-500 dark:text-teal-400 mb-1">
                  <svg className="w-7 h-7 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                </div>
                <div className="font-bold text-gray-800 dark:text-gray-200">庫存管理</div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="sub-btn" onClick={() => navigate('/warehouse/products')}>📦 產品資料</div>
                <div className="sub-btn" onClick={() => navigate('/purchase/materials')}>🧰 原物料管理</div>
                <div className="sub-btn" onClick={() => navigate('/warehouse/storages')}>📍 儲位管理</div>
                <div className="sub-btn" onClick={() => navigate('/warehouse/inventory-adjustments')}>📝 庫存調整單</div>
                <div className="sub-btn" onClick={() => navigate('/warehouse/inventory-movements')}>🔄 庫存異動紀錄</div>
                <div className="sub-btn" onClick={() => navigate('/warehouse/inventory')}>🏢 庫存查詢</div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}