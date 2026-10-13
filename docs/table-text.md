# TableText：表格文字介面與 Task 1 盤點

## 介面速查

```tsx
import { TableText } from '@/components/Table/tableText';

<TableText value={amount} format={value => Number(value).toLocaleString('zh-TW')} align="right" />
<TableText value={name} renderContent={text => <Link to={url}>{text}</Link>} />
<TableText value={notes} maxLines={2} maxWidth={240} emptyText="—" />
<TableText value={code} tooltipContent={<span>完整業務說明</span>} tooltipMode="always" />
```

- `value`: `string | number | null | undefined`。`null`、`undefined`、空字串使用 `emptyText`（預設空字串）；`0` 不算空值。
- `format(value) => string`: 非空值的文字格式化；預覽及預設提示共用格式化文字。
- `renderContent(text) => ReactNode`: 客製文字強調、顏色、Link；接收已格式化的預覽文字。單行把 CRLF／CR／LF 換成空格。完整提示不從 JSX 推測，請用原始 `value`、`format` 或明確 `tooltipContent`。
- `tooltipContent`: 明確的 ReactNode 提示（`null` 可關閉提示內容）；不會因提供此 prop 就強制顯示。請勿放入需操作的按鈕／連結。
- `tooltipMode`: `overflow`（預設）只在實際寬／高溢出或單行隱藏原文字換行時提示；`always` 用於額外業務說明；`never` 完全停用。
- `maxLines`: 預設 1，單行 ellipsis；大於 1 明確採多行 line-clamp 並保留換行。所有文字行高 24px。`maxWidth` 預設 `100%`，支援數值或 CSS 寬度；`align` 支援 left／center／right。

提示可透過 hover／focus 開啟。只有確實需要提示的純文字增加 tab stop；內含原生可聚焦 Link 時使用該 Link，不增加重複 tab stop。

## 共用正規化與邊界

- `ErpTable` 以 `normalizeTableColumns` 包住 `columns` 或 JSX `Table.Column`／`ColumnGroup`；`StandardErpTable` 透過 `ErpTable` 間接受到相同處理。
- `generateTableColumns` 與 `buildTableColumns` 都在回傳前呼叫 `normalizeTableColumns`。builder 產生的 `ellipsis`、`maxLines`、`showHint`、`headerHint` 會交給共用處理。
- 正規化會把一般純文字 renderer 轉成 `TableText`，保留 sorter、filter、onCell、fixed、RenderedCell 屬性與原始 renderer 參數；實際 `ellipsis` 由文字元件處理，因此輸出欄位會設定 `ellipsis: false`。
- 欄位原本明確設定 `ellipsis: false` 時，renderer 原樣返回；多 Link／多 `a`、Button、Tag、輸入控制項、帶事件或 role/tabIndex 的互動容器、未知 custom component、明確多行節點也原樣保留。
- `EllipsisText` 是相容入口，內部轉接至 `TableText`。既有呼叫可暫留；若需要 `format`、`renderContent`、`tooltipContent`、`emptyText` 或欄位特殊寬度，後續批次才改成直接 `TableText`。
- 不處理表單欄位、Input、Select、Textarea、表單 label、API、DTO、資料計算、權限或版號。

## Task 1 真實盤點矩陣（2026-10-13）

盤點範圍是 `react-frontend/src` 的 `.tsx` 原始碼（排除測試檔與 TableText 核心實作檔），搜尋 `Table`／`Table.Column`、`ErpTable`、`StandardErpTable`、`buildTableColumns`／`generateTableColumns`、`EllipsisText`、`ellipsis` 及直接 renderer。結果：**52 個頁面表格檔、78 個表格 JSX 入口**，其中 **49 個 `<Table>`／`Table.Column` 入口使用 `ErpTable` 別名，29 個使用 `StandardErpTable`**；未發現未經本專案 wrapper 的 Ant Design `<Table>` 直接表格。

### A. 已由共用正規化覆蓋：52 個表格檔／78 個入口

下列檔案均直接使用 `ErpTable` 或 `StandardErpTable`，所以一般純文字欄位已經進入 `normalizeTableColumns`。這表示「共用行為已覆蓋」，不表示每個欄位都應自動裁切；欄位級例外仍看 B／C 類別。

| 模組 | 檔案 |
|---|---|
| 基礎資料 | `pages/basic/brand-models/BrandModelsLayout.tsx`；`pages/basic/business-partners/BusinessPartnerList.tsx`、`ContactList.tsx`；`pages/basic/employees/index.tsx`；`pages/basic/machines/MachineList.tsx`；`pages/basic/materials/MaterialList.tsx`；`pages/basic/molds/MoldAssociatedProductsDialog.tsx`、`MoldList.tsx`；`pages/basic/products/ProductsList.tsx`、`Tabs/ProductBom.tsx`、`Tabs/ProductMolds.tsx`；`pages/basic/storages/StorageList.tsx` |
| 生產／品質 | `pages/production-quality/production-receipts/ProductionReceiptItemsTab.tsx`、`ProductionReceiptsList.tsx`；`pages/production-quality/qc-receipts/QcProductionReceiptSelector.tsx`、`QcReceiptItemsTab.tsx`、`QcReceiptsList.tsx`；`pages/production-quality/work-orders/PersonnelWorkingHoursField.tsx`、`RollSubstitutionPicker.tsx`、`WorkOrderItemsTab.tsx`、`WorkOrderRequisitionTab.tsx`、`WorkOrderReturnTab.tsx`、`WorkOrdersList.tsx` |
| 採購 | `pages/purchase/iqc-inspections/IqcDrawer.tsx`、`IqcList.tsx`；`pages/purchase/orders/PurchaseOrderItemsTab.tsx`、`PurchaseOrdersList.tsx`；`pages/purchase/receipts/PurchaseOrderItemSelector.tsx`、`PurchaseReceiptItemsTab.tsx`、`PurchaseReceiptsList.tsx` |
| 銷售 | `pages/sales/orders/OrderItemsTab.tsx`、`OrdersList.tsx`、`components/CustomerProductPickerModal.tsx`；`pages/sales/pricing/ProductPricingList.tsx`；`pages/sales/sales-deliveries/SalesDeliveriesList.tsx`、`SalesDeliveryItemsTab.tsx`、`components/UndeliveredOrderItemPicker.tsx`；`pages/sales/statements/CustomerStatementList.tsx` |
| 系統 | `pages/system/Profile.tsx`；`pages/system/RoleList.tsx`、`UserList.tsx`；`pages/system/general-types/CategoryItemList.tsx`、`CategoryList.tsx` |
| 倉儲 | `pages/warehouse/customer-material-receipt/CustomerMaterialPickerModal.tsx`、`CustomerMaterialReceiptItemsTab.tsx`、`CustomerMaterialReceiptList.tsx`；`pages/warehouse/inventory/StorageInventoryList.tsx`；`pages/warehouse/inventory-adjustments/InventoryAdjustmentList.tsx`、`Tabs/InventoryAdjustmentItemsTab.tsx`；`pages/warehouse/inventory-movements/StorageTransactionsList.tsx`；`pages/warehouse/material-inventory/MaterialInventoryList.tsx`、`QuickRollTransfer.tsx` |

### B. 需直接 `TableText` 客製或移除重複相容 wrapper：11 個檔案

這些檔案仍直接使用 `EllipsisText`（共 53 個命中，含 import／宣告），而且至少部分欄位有特殊寬度、日期／數值格式、空值替代、Link 或欄位語意；後續批次應逐欄判斷，不能把所有 `EllipsisText` 一次替換成 `TableText`。

| 檔案 | 盤點判斷 | 後續處理 |
|---|---|---|
| `pages/basic/products/ProductConfig.tsx` | 品名／規格／備註有 `maxWidth`，部分位於單一 Link | 直接 `TableText` 的 `renderContent`／`maxWidth`；保留 Link，操作欄不包裝 |
| `pages/purchase/orders/PurchaseOrderConfig.tsx` | 品名位於單一 Link；備註另有 `ellipsis` 設定 | Link 用 `renderContent`，備註確認是否已由 builder 正規化，避免雙 wrapper |
| `pages/purchase/receipts/PurchaseReceiptConfig.tsx` | 品名／規格有固定寬度 | 先確認呼叫端 builder，再決定 `maxWidth` 或直接 `TableText` |
| `pages/sales/orders/OrderConfig.tsx` | 品名位於單一 Link | `renderContent` 保留單一 Link |
| `pages/sales/sales-deliveries/SalesDeliveryConfig.tsx` | 品名位於單一 Link | `renderContent` 保留單一 Link |
| `pages/production-quality/work-orders/WorkOrderConfig.tsx` | 物料、替代料、備註有不同寬度 | 依欄位逐一設定 `maxWidth`／`format`；不要包裝選取器或操作節點 |
| `pages/warehouse/inventory/StorageInventoryList.tsx` | 分組主表與展開子表重複使用 `EllipsisText` | 先保留展開／分組結構；再改純文字欄位，維持名稱欄寬 |
| `pages/warehouse/inventory-movements/StorageTransactionsList.tsx` | 多處名稱／單號／備註 wrapper，含數值 renderer | 數值格式交給既有 renderer 或 `format`；Link／操作欄不包裝 |
| `pages/warehouse/inventory-adjustments/InventoryAdjustmentConfig.tsx` | 備註與帶 suffix 的顯示值有固定寬度 | 直接 `TableText format` 或 `renderContent`，確認 `0` 與空值語意 |
| `pages/warehouse/customer-material-receipt/CustomerMaterialReceiptConfig.tsx` | 多個單號／備註／品名 wrapper，另有 Tag、日期及複合 span | 只處理純文字欄；Tag、日期容器與複合互動 renderer 原樣保留 |
| `pages/warehouse/customer-material-receipt/CustomerMaterialPickerModal.tsx` | Picker 表格內品名使用 wrapper | 保留 checkbox／選取互動，只改單一純文字欄 |

### C. 複合互動例外：欄位級排除，與 A 重疊

這類不是「尚未覆蓋」；它們已經經過 `ErpTable`／`StandardErpTable`，但必須維持 renderer 原樣。盤點到 **11 個具有展開、選取器、JSX `Table.Column`、`onCell` 或多表組合的高風險表格檔**：

- `pages/production-quality/qc-receipts/QcProductionReceiptSelector.tsx`
- `pages/production-quality/work-orders/RollSubstitutionPicker.tsx`
- `pages/production-quality/work-orders/WorkOrderRequisitionTab.tsx`
- `pages/purchase/iqc-inspections/IqcDrawer.tsx`
- `pages/purchase/receipts/PurchaseOrderItemSelector.tsx`
- `pages/sales/orders/components/CustomerProductPickerModal.tsx`
- `pages/sales/sales-deliveries/SalesDeliveryItemsTab.tsx`
- `pages/sales/sales-deliveries/components/UndeliveredOrderItemPicker.tsx`
- `pages/warehouse/customer-material-receipt/CustomerMaterialPickerModal.tsx`
- `pages/warehouse/inventory/StorageInventoryList.tsx`
- `pages/warehouse/material-inventory/QuickRollTransfer.tsx`

另有所有 list／detail 表格的 action column、Button、Tag、輸入控制項及多節點 renderer；它們不列入可自動裁切文字欄位。明確 `ellipsis: false` 的欄位目前在 `pages/basic/molds/MoldConfig.tsx`（相關產品數、關聯產品編號／名稱）及其他明細／互動欄位中維持原樣，後續不得為了統一而移除。

### D. 尚未覆蓋的直接表格：0 個已確認；仍需防回歸搜尋

本次搜尋未發現頁面直接 import Ant Design `Table` 並以 `<Table>`／`Table.Column` 渲染而繞過 wrapper。`pages/basic/employees/index.tsx`、`pages/basic/machines/MachineList.tsx`、`pages/basic/molds/MoldList.tsx`、`pages/warehouse/inventory-adjustments/InventoryAdjustmentList.tsx` 雖有從 `antd` import `Table`，但沒有對應的 `<Table>` JSX 入口，實際頁面表格使用 `StandardErpTable`；這些 import 是清理候選，不是未覆蓋表格。

`QuickRollTransfer.tsx` 的 JSX `Table.Column` 也不是漏網：它的 `Table` 別名來自 `@/components/Table/ErpTable`，由 `ErpTable.columnsFromChildren` 轉成 columns 後正規化。後續若新增原始 `import { Table } from 'antd'` 的頁面，應立即列入本類別並先補 wrapper／測試，不要直接聲稱全站完成。

## 後續批次優先順序

1. **Batch 1：低風險共用覆蓋確認** — 先針對 52 個入口以 focused test 確認一般純文字、`0`、空值、換行、欄頭 hint 與排序／filter；不改頁面程式碼時，本批只建立驗證基線。
2. **Batch 2：基礎／倉儲的 11 個 `EllipsisText` 檔** — 優先 `ProductConfig`、`StorageInventoryList`、`StorageTransactionsList`、`InventoryAdjustmentConfig`、客供料兩檔；先處理純文字與特殊寬度，再處理單一 Link。
3. **Batch 3：採購／銷售單據** — `PurchaseOrderConfig`、`PurchaseReceiptConfig`、`OrderConfig`、`SalesDeliveryConfig` 及 picker；金額／數量／日期只沿用既有格式規則，操作欄與選取器不包裝。
4. **Batch 4：生產／品質高風險互動表格** — 先驗證 11 個 C 類檔案的選取、展開、`onCell`、多表與多 renderer，再考慮任何直接 `TableText` 客製。
5. **Batch 5：清理與回歸** — 再評估未使用的 antd `Table` import、`EllipsisText` 相容入口及重複 wrapper；最後才處理直接表格防回歸掃描。表單永不併入這個採用批次。

## 未決風險

- **欄位級判斷仍需逐檔確認**：本盤點能確認入口與 renderer 形狀，但不能僅靠靜態搜尋判定每個 `EllipsisText` 的業務語意、實際寬度或是否應保留 `emptyText`。
- **共用正規化與舊 wrapper 可能雙重處理**：直接把 `EllipsisText` 改成 `TableText` 前，必須確認該欄位是否已由 `buildTableColumns`／`generateTableColumns` 再進入 `normalizeTableColumns`。
- **互動 renderer 誤判風險**：Button、Tag、多 Link、輸入控制項、選取／展開／主從明細與 `onCell` 不能被文字 wrapper 取代；寧可保留原樣。
- **真實 ellipsis 需要瀏覽器量測**：目前測試可驗證 DOM、樣式、提示及事件契約；實際欄寬、字型、滾動容器與多表高度仍需後續唯讀瀏覽器或 fixture 驗證。
- **空值與格式化差異**：部分舊 renderer 以 `'-'`、空字串或自訂 suffix 表示空值；改用 `TableText` 時需保留現有業務顯示，不可把 `0` 誤判為空值。
- **工作樹基線**：本次只更新本文件；既有未提交頁面異動、`src/components/Form/types.ts`、`src/index.css` 及未追蹤測試／計算檔均未觸碰。未啟動開發服務，未 commit。

## 驗證依據

- 只讀搜尋 `react-frontend/src`，排除測試檔後得到 52 個頁面表格檔、78 個表格 JSX 入口。
- `ErpTable.tsx`、`StandardErpTable.tsx`、`tableText.tsx`、`tableUtils.ts` 已逐一核對共用正規化路徑。
- 既有 TableText 測試：`src/components/Table/tableText.test.tsx`、`src/components/Table/TableText.behavior.test.tsx`、`src/components/Table/EllipsisText.test.tsx`；本 Task 未新增或修改測試。
