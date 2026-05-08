# ERP 前端開發設計規範 (React Frontend Design Guide)

## 1. 核心架構與設計模式 (Core Architecture & Patterns)

### 1.1 單檔模組設定模式 (Single File Module Config Design Pattern)
- **概念**：為了解決 Table List、Search Form 與 Create/Update Form 欄位定義散落各處的問題，將單一業務模組（如「原料管理」）的所有欄位配置統一寫在單一設定檔中（例如 `MaterialConfig.tsx`）。
- **實作方式**：
  - 定義統一的介面，內部包含 `columns` (TableColumnConfig) 以及 Search/Form 的對應屬性。
  - 透過 `tableUtils.ts` 等工具函數，將 Config 自動轉換為 Ant Design Table 需要的 Column 格式，或是動態表單需要的欄位格式。
- **優點**：確保新增/修改欄位時，列表、表單、搜尋條件能同步生效，大幅降低維護與修改成本。

### 1.2 Master-Detail(s) 架構 (主檔與明細設計)
針對不同複雜度的 CRUD 操作，我們採用兩種層級的架構：
1. **簡易 CRUD (Drawer CRUD Pattern)**：
   - **適用情境**：僅有主檔，無複雜明細（例如：基礎資料設定）。
   - **實作方式**：以 List 列表頁面為主，新增、編輯時由右側滑出 `Drawer` 進行操作。操作完成後關閉 Drawer 並直接重新 Fetch List 資料。
2. **複雜主檔與明細 (Master-Detail Tabs Pattern)**：
   - **適用情境**：主檔下包含多筆關聯明細（例如：採購單、訂單與其明細）。
   - **實作方式**：使用獨立路由或透過 `MasterDetailTabs` 元件，將主檔資訊與各個明細 Tab 整合在同一個頁面中。
   - **UI 規範**：為保持畫面緊湊，Tab 標籤之間的間距會透過 `tabBarGutter={16}` 進行縮小。

---

## 2. UI/UX 與樣式規範 (UI/UX & Styling)

### 2.1 系統常數與尺寸統一管理
- **規範**：禁止在元件中 Hardcode 寬度、間距等數字。
- **作法**：所有 UI 相關的共用常數（如 Drawer Width、Modal Width、Table Page Size 等）必須統一維護在 `src/constants/ui.ts` 中，並由各元件 Import 使用。

### 2.2 深色模式 (Dark Mode) 支援
- **規範**：全站需完美支援 Light / Dark Mode 切換，**嚴禁寫死 Hex 色碼**。
- **作法**：
  - 盡量使用 Ant Design 提供的 `theme.useToken()` 獲取當前主題變數（Token）。
  - 若使用 Tailwind CSS，必須正確設定 `dark:` class 處理深色對應樣式。

### 2.3 表格與列表 (Table & List)
- **長文字與換行處理 (EllipsisText)**：
  - 針對容易有長篇文字或折行內容的欄位（如備註、規格說明），在 Config 啟用 `ellipsis: true`。
  - 預設列表顯示時會截斷為單行（原內容的換行符號會轉為空白，避免撐高 Row 破壞表格整齊度）。
  - 使用者滑鼠懸停 (Hover) 時，會顯示 Tooltip 完整檢視，Tooltip 內支援 `white-space: pre-wrap` 保留原始的多行折行排版。
- **對齊方式**：除金額、數量等數值型態可能靠右對齊外，其餘文字欄位預設靠左對齊。

### 2.4 表單設計 (Form UX)
- **唯讀模式 (Read-only)**：檢視資料時，表單欄位應使用 `disabled` 狀態而非純文字顯示，以保持欄位排版與編輯時的視覺一致性。
- **版面配置**：表單輸入框預設應填滿容器 (`w-full`)。
- **多行文本 (TextArea)**：針對備註等長文字輸入框，預設行數設定應 `>= 3` 行。
- **預設 Focus**：開啟新增/編輯表單時，系統應自動 Focus 第一個可輸入欄位。

### 2.5 彈出視窗與對話框 (Modal & Dialog)
- **全域實例**：統一使用 `App.useApp().modal` (或 message, notification) 等全域實例，**禁止使用靜態 `message.xxx` 或 `Modal.xxx`** 導致無法正確套用 Context 狀態或 Theme 設定。
- **置中顯示**：所有 Modal 與對話框必須設定 `centered: true`。
- **危險/破壞性操作 (Danger Action)**：如登出、刪除等行為，確認按鈕必須設定 `okType="danger"`（呈現紅色）。
  - *範例：Header 點擊登出時，需跳出 Modal 確認對話框，點擊紅色「登出」後再正式清除狀態並導向登入頁。*

---

## 3. 狀態、資料與驗證 (State, Data & Validation)

### 3.1 字典檔與下拉選單 (Dictionaries)
- 小型、靜態、或是跨模組共用的下拉選單資料（如狀態碼、單位等），應使用全域或模組層級的 `dictionaryRegistry` 來集中管理。
- 必須確保 Table 顯示的文字（透過映射轉換）與 Form 下拉選單的選項來源保持絕對一致。

### 3.2 數字與格式化 (Number Formatting)
- **UI 顯示總計**：針對金額等總計數據，應四捨五入至小數點後 2 位 `Number(total.toFixed(2))`。
- **代碼/規格**：若為數值，顯示時應去除無意義的尾數 0（如 `Number(val).toString()`）。

### 3.3 資料驗證 (Validation)
- 全面使用 **Zod** 進行 Schema 宣告，並結合 React Hook Form 的 resolver 處理表單驗證。
- 確保 TypeScript 型別與執行時期的驗證邏輯同步，提高型別安全性與開發體驗。
