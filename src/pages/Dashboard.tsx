import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Spin } from 'antd';
import {
  getApiV1DashboardPendingTasks
} from '@/api/generated/sdk.gen';
import { useAuthStore } from '@/stores/useAuthStore';
import './Dashboard.css';

// 1. 定義待處理事項配置型別
interface KpiCardConfig {
  permissionKey: string;           // 檢視所需權限
  path: string;                    // 跳轉路由與參數
  borderColorClass: string;        // 頂部邊框 Tailwind
  title: string;                   // 卡片標題
  valueKey: string;                // 對接 API pendingTasks 的欄位
  textColorClass: string;          // 數字顏色 Tailwind
  isWarning?: boolean;
}

// 7 大黃金待處理事項動態清單 (對齊最新選單分類架構，支援日後無限動態擴充)
const KPI_CARDS_CONFIG: KpiCardConfig[] = [
  {
    permissionKey: 'Sales.Orders.View',
    path: '/sales/orders?unprocessedOrders=true',
    borderColorClass: 'bg-orange-500',
    title: '未完成訂單',
    valueKey: 'unprocessedOrders',
    textColorClass: 'text-orange-500'
  },
  {
    permissionKey: 'ProductionQuality.WorkOrders.View',
    path: '/production-quality/work-orders?status=Draft',
    borderColorClass: 'bg-red-500',
    title: '未開工製令',
    valueKey: 'draftWorkOrders',
    textColorClass: 'text-red-500'
  },
  {
    permissionKey: 'ProductionQuality.WorkOrders.View',
    path: '/production-quality/work-orders?status=StartedUnwarehoused',
    borderColorClass: 'bg-blue-500',
    title: '開工未完工',
    valueKey: 'inPrepWorkOrders',
    textColorClass: 'text-blue-500'
  },
  {
    permissionKey: 'ProductionQuality.ProductionReceipts.View',
    path: '/production-quality/production-receipts?notQcFinished=true',
    borderColorClass: 'bg-purple-500',
    title: '生產未QC',
    valueKey: 'notQcProductionReceipts',
    textColorClass: 'text-purple-500'
  },
  {
    permissionKey: 'ProductionQuality.QcReceipts.View',
    path: '/production-quality/qc-receipts?status=Unconfirmed',
    borderColorClass: 'bg-teal-500',
    title: 'QC未確認',
    valueKey: 'pendingQcReceipts',
    textColorClass: 'text-teal-500'
  },
  {
    permissionKey: 'Sales.Deliveries.View',
    path: '/sales/sales-deliveries?shippedConfirmed=false',
    borderColorClass: 'bg-yellow-500',
    title: '銷貨未出庫 (SD)',
    valueKey: 'notShippedSalesDeliveries',
    textColorClass: 'text-yellow-500'
  },
  {
    permissionKey: 'Purchase.Orders.View',
    path: '/purchase/orders?status=DRAFT',
    borderColorClass: 'bg-indigo-500',
    title: '採購待核准',
    valueKey: 'draftPurchaseOrders',
    textColorClass: 'text-indigo-500'
  }
];

export default function Dashboard() {
  const navigate = useNavigate();
  const hasPermission = useAuthStore((state) => state.hasPermission);

  const { data: pendingTasksRes, isLoading } = useQuery({
    queryKey: ['dashboard', 'pending-tasks'],
    queryFn: () => getApiV1DashboardPendingTasks()
  });

  const pendingTasks: Record<string, any> = pendingTasksRes?.data?.data || {
    unprocessedOrders: 0,
    draftWorkOrders: 0,
    inPrepWorkOrders: 0,
    notQcProductionReceipts: 0,
    pendingQcReceipts: 0,
    notShippedSalesDeliveries: 0,
    draftPurchaseOrders: 0,
    scrapInventoryAdjustments: 0
  };

  const renderKpiCard = (params: {
    key: any;
    permissionKey: string;
    path: string;
    borderColorClass: string;
    title: string;
    value: number | string;
    textColorClass: string;
    isWarning?: boolean;
    isDev?: boolean;
    onClickDev?: () => void;
  }) => {
    const hasPerm = params.isDev ? true : hasPermission(params.permissionKey);

    if (!hasPerm) {
      return (
        <div key={params.key} className="dashboard-card-disabled" title="🔒 您無此模組之存取權限">
          <div className="card-border bg-gray-300"></div>
          <div className="text-sm text-gray-400 dark:text-gray-500 font-medium flex items-center gap-1">
            {params.title} 🔒
          </div>
          <div className="text-3xl font-bold text-gray-400 dark:text-gray-500 mt-2">--</div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-auto pt-2 flex items-center">
            <span>🔒 無權限</span>
          </div>
        </div>
      );
    }

    const handleClick = () => {
      if (params.isDev && params.onClickDev) {
        params.onClickDev();
      } else {
        navigate(params.path);
      }
    };

    return (
      <div key={params.key} className="dashboard-card cursor-pointer" onClick={handleClick}>
        <div className={`card-border ${params.borderColorClass}`}></div>
        <div className={`text-sm font-medium ${params.isWarning ? 'text-rose-500 dark:text-rose-400' : 'text-gray-500 dark:text-gray-400'}`}>
          {params.title}
        </div>
        <div className={`text-3xl font-bold mt-2 ${params.textColorClass}`}>{params.value}</div>
        <div className="text-xs text-blue-500 dark:text-blue-400 mt-auto pt-2 flex items-center hover:text-blue-400 dark:hover:text-blue-300">
          <span>{params.isWarning ? '檢視明細' : '前往列表'}</span> <span className="ml-1">→</span>
        </div>
      </div>
    );
  };

  const renderSubButton = (params: {
    permissionKey: string;
    path: string;
    label: string;
    className?: string;
  }) => {
    const hasPerm = hasPermission(params.permissionKey);

    if (!hasPerm) {
      return (
        <div 
          className={`sub-btn-disabled ${params.className || ''}`.trim()} 
          title="🔒 您無此模組之存取權限"
        >
          {params.label} 🔒
        </div>
      );
    }

    return (
      <div 
        className={`sub-btn cursor-pointer ${params.className || ''}`.trim()} 
        onClick={() => navigate(params.path)}
      >
        {params.label}
      </div>
    );
  };

  return (
    <div className="p-6 md:p-10 min-h-screen relative">
      <div className="dashboard-container">
        {/* Header Section */}
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-xl font-bold tracking-wider border-l-4 border-blue-500 pl-3 text-gray-800 dark:text-gray-200">
            待處理事項
          </h2>
          <span className="text-sm text-gray-500">點擊卡片可跳轉對應列表</span>
        </div>

        {/* Dynamic KPI Cards Grid */}
        <Spin spinning={isLoading}>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-10">
            {KPI_CARDS_CONFIG.map((card, idx) => 
              renderKpiCard({
                key: idx,
                permissionKey: card.permissionKey,
                path: card.path,
                borderColorClass: card.borderColorClass,
                title: card.title,
                value: pendingTasks[card.valueKey] ?? 0,
                textColorClass: card.textColorClass,
                isWarning: card.isWarning
              })
            )}
          </div>
        </Spin>

        {/* Supply Chain Flowchart Section */}
        <div className="flex justify-between items-end mb-4 mt-8">
          <h2 className="text-xl font-bold tracking-wider border-l-4 border-blue-500 pl-3 text-gray-800 dark:text-gray-200">
            系統作業流程 (供應鏈增值流)
          </h2>
          <span className="text-sm text-gray-500">點擊按鈕直接進入各功能</span>
        </div>

        <div className="bg-white dark:bg-[#191919] p-8 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm dark:shadow-none relative overflow-hidden">
          
          {/* Linear Supply Chain Flow */}
          <div className="flex items-start justify-start xl:justify-center gap-2 overflow-x-auto pb-4 flowchart-container relative z-10">
            
            {/* COLUMN 1: BasicData (黃色) - 2-Column Layout */}
            <div className="flow-col min-w-[340px] xl:min-w-[380px]">
              <div className="flow-node-header border-t-4 border-t-yellow-500">
                <div className="text-yellow-500 dark:text-yellow-400 mb-1">
                  <svg className="w-7 h-7 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                  </svg>
                </div>
                <div className="font-bold text-gray-800 dark:text-gray-200 text-xs">1. 基本資料</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {renderSubButton({
                  permissionKey: 'BasicData.BusinessPartners.View',
                  path: '/basic/business-partners',
                  label: '🤝 商業夥伴管理'
                })}
                {renderSubButton({
                  permissionKey: 'BasicData.Employees.View',
                  path: '/basic/employees',
                  label: '🧑‍💼 員工基本檔'
                })}
                {renderSubButton({
                  permissionKey: 'BasicData.Products.View',
                  path: '/warehouse/products',
                  label: '📦 產品管理'
                })}
                {renderSubButton({
                  permissionKey: 'BasicData.Materials.View',
                  path: '/warehouse/materials',
                  label: '🧰 原料管理'
                })}
                {renderSubButton({
                  permissionKey: 'BasicData.Molds.View',
                  path: '/production-quality/molds',
                  label: '🔧 模具管理'
                })}
                {renderSubButton({
                  permissionKey: 'BasicData.Machines.View',
                  path: '/production-quality/machines',
                  label: '⚙️ 機台管理'
                })}
                {renderSubButton({
                  permissionKey: 'BasicData.Storages.View',
                  path: '/warehouse/storages',
                  label: '📍 儲位管理'
                })}
                {renderSubButton({
                  permissionKey: 'BasicData.BrandModels.View',
                  path: '/warehouse/brand-models',
                  label: '🏷️ 廠牌型號維護'
                })}
              </div>
            </div>

            {/* FLOW ARROW 1 */}
            <div className="flow-arrow">
              <svg className="w-5 h-5 text-gray-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
              </svg>
            </div>

            {/* COLUMN 2: Purchase (採購管理 - 橘色) */}
            <div className="flow-col min-w-[190px]">
              <div className="flow-node-header border-t-4 border-t-orange-500">
                <div className="text-orange-500 dark:text-orange-400 mb-1">
                  <svg className="w-7 h-7 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
                  </svg>
                </div>
                <div className="font-bold text-gray-800 dark:text-gray-200 text-xs">2. 採購管理</div>
              </div>
              <div className="flex flex-col gap-2">
                {renderSubButton({
                  permissionKey: 'Purchase.Orders.View',
                  path: '/purchase/orders',
                  label: '🛒 採購單管理'
                })}
                {renderSubButton({
                  permissionKey: 'Purchase.Receipts.View',
                  path: '/purchase/receipts',
                  label: '🚚 進貨單'
                })}
                {renderSubButton({
                  permissionKey: 'Purchase.IqcInspections.View',
                  path: '/purchase/iqc-inspections',
                  label: '🔍 IQC 進料品質檢驗'
                })}
              </div>
            </div>

            {/* FLOW ARROW 2 */}
            <div className="flow-arrow">
              <svg className="w-5 h-5 text-gray-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
              </svg>
            </div>

            {/* COLUMN 3: ProductionQuality (生產與品質管理 - 紫色) */}
            <div className="flow-col min-w-[190px]">
              <div className="flow-node-header border-t-4 border-t-purple-500">
                <div className="text-purple-500 dark:text-purple-400 mb-1">
                  <svg className="w-7 h-7 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                </div>
                <div className="font-bold text-gray-800 dark:text-gray-200 text-xs">3. 生產與品質管理</div>
              </div>
              <div className="flex flex-col gap-2">
                {renderSubButton({
                  permissionKey: 'ProductionQuality.WorkOrders.View',
                  path: '/production-quality/work-orders',
                  label: '📋 製令管理'
                })}
                {renderSubButton({
                  permissionKey: 'ProductionQuality.ProductionReceipts.View',
                  path: '/production-quality/production-receipts',
                  label: '📥 生產入庫單'
                })}
                {renderSubButton({
                  permissionKey: 'ProductionQuality.QcReceipts.View',
                  path: '/production-quality/qc-receipts',
                  label: '🔍 QC 檢驗管理'
                })}
              </div>
            </div>

            {/* FLOW ARROW 3 */}
            <div className="flow-arrow">
              <svg className="w-5 h-5 text-gray-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
              </svg>
            </div>

            {/* COLUMN 4: Warehouse (倉儲管理 - 綠色) */}
            <div className="flow-col min-w-[210px]">
              <div className="flow-node-header border-t-4 border-t-teal-500">
                <div className="text-teal-500 dark:text-teal-400 mb-1">
                  <svg className="w-7 h-7 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                  </svg>
                </div>
                <div className="font-bold text-gray-800 dark:text-gray-200 text-xs">4. 倉儲管理</div>
              </div>
              <div className="flex flex-col gap-2">
                {renderSubButton({
                  permissionKey: 'Warehouse.Inventory.View',
                  path: '/warehouse/inventory',
                  label: '🏢 產品儲位庫存'
                })}
                {renderSubButton({
                  permissionKey: 'Warehouse.MaterialInventory.View',
                  path: '/warehouse/material-inventory',
                  label: '📦 原料庫存與卷卡號追溯'
                })}
                {renderSubButton({
                  permissionKey: 'Warehouse.InventoryMovements.View',
                  path: '/warehouse/inventory-movements',
                  label: '🔄 庫存異動明細'
                })}
                {renderSubButton({
                  permissionKey: 'Warehouse.InventoryAdjustments.View',
                  path: '/warehouse/inventory-adjustments',
                  label: '📝 庫存調整單'
                })}
                {renderSubButton({
                  permissionKey: 'Warehouse.Inventory.View',
                  path: '/warehouse/quick-transfer',
                  label: '⚡ 原料快速轉倉'
                })}
              </div>
            </div>

            {/* FLOW ARROW 4 */}
            <div className="flow-arrow">
              <svg className="w-5 h-5 text-gray-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
              </svg>
            </div>

            {/* COLUMN 5: Sales (銷售管理 - 藍色) */}
            <div className="flow-col min-w-[190px]">
              <div className="flow-node-header border-t-4 border-t-blue-500">
                <div className="text-blue-500 dark:text-blue-400 mb-1">
                  <svg className="w-7 h-7 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
                <div className="font-bold text-gray-800 dark:text-gray-200 text-xs">5. 銷售管理</div>
              </div>
              <div className="flex flex-col gap-2">
                {renderSubButton({
                  permissionKey: 'Sales.Pricing.View',
                  path: '/sales/pricing',
                  label: '🧮 產品輔助定價'
                })}
                {renderSubButton({
                  permissionKey: 'Sales.Orders.View',
                  path: '/sales/orders',
                  label: '📄 訂單管理'
                })}
                {renderSubButton({
                  permissionKey: 'Sales.Deliveries.View',
                  path: '/sales/sales-deliveries',
                  label: '🚚 銷貨單管理'
                })}
                {renderSubButton({
                  permissionKey: 'Sales.Statements.View',
                  path: '/sales/statements',
                  label: '🧾 對帳單報表'
                })}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}