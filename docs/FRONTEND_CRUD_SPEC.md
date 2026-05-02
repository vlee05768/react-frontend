# ERP 前端基本檔 CRUD 模組開發規範

本文件彙整了 ERP 系統中「基本資料模組」(如：員工、使用者、角色、儲位、機台、模具等單檔維護) 的 UI/UX 與架構開發規範。未來若有新增模組或修改共用邏輯，請務必遵循此規範，並優先透過自動化腳本 (`generate_crud_v2.py`) 產出。

## 1. 列表與排版 (UI/UX 佈局)

- **操作欄位固定 (Fixed Actions)**：
  - 表格的「操作」欄位 (檢視、編輯、刪除按鈕) 必須置於最左側 (`fixed: 'left'`)，寬度預設 `120px`。
  - 使用 `<Space>` 包覆 Icon Buttons。
  - 表格必須設定水平捲動 (`scroll={{ x: 1200 }}`) 以防止小螢幕跑版。
- **表格欄位對齊 (Table Column Alignment)**：
  - Table 的欄位名稱 (Header) 一律置中排列 (`align: 'center'`)。
- **頁面標題與暗色模式 (Theming & Typography)**：
  - 模組標題應包含左側藍色飾條 (Width: 4px, Height: 24px, Color: `#1677ff`)。
  - 避免使用 `<Typography.Title>` 以防被 Tailwind 覆蓋樣式。文字顏色應依賴 CSS 變數動態適應主題 (`color: 'var(--ant-color-text, inherit)'`)，嚴禁寫死 `#262626` 或 `#000`。
- **按鈕動線 (Action Buttons)**：
  - 表格右上角放置「進階查詢」(Default 樣式, `SearchOutlined`) 與「新增資料」(Primary 樣式, `PlusOutlined`)。
  - 兩按鈕間使用 `<Divider type="vertical" />` 分隔。

## 2. 查詢與過濾 (Search & Filtering)

- **彈窗設計 (Search Modal)**：
  - 統一使用 `<Modal>` 作為進階查詢介面。
  - 寬度限制為 `width={'60vw'}`。
  - 內容區高度限制 `maxHeight: '80vh'` 並開啟 `overflowY: 'auto'`。
  - 彈窗位置固定於距離頂部 `top: '10vh'`，確保不同螢幕尺寸下皆能完整顯示底部操作按鈕。
- **查詢條件狀態列 (Active Search Tags)**：
  - 必須在表格上方常駐顯示當前生效的查詢條件區塊 (淺灰背景 `var(--ant-color-fill-quaternary, #fafafa)`)。
  - 生效的條件以藍色標籤 (`<Tag color="blue">`) 呈現，例如：「狀態: 在職」、「姓名: 王小明」。
  - 必須將關聯代碼 (如 `departmentCode`) 自動轉換為對應的「名稱」(Label) 顯示。
  - 若未下達任何條件，須預設顯示灰色的 `【全部資料】` 標籤。
  - 系統應在渲染標籤時自動排除分頁參數 (`pageNumber`, `pageSize`)。
- **查詢按鈕操作 (Search Actions)**：
  - 查詢表單中的【清空重置】按鈕，僅需清空表單的所有查詢條件，**絕對不要關閉查詢視窗**，讓使用者能繼續輸入新的條件。
- **表單排版 (Form Layout)**：
  - 統一使用兩欄式佈局 `<Row gutter={16}>` 搭配 `<Col span={12}>`。

## 3. 表單元件與資料處理 (Form Components & Data Integration)

- **元件自適應 (Responsive Components)**：
  - 所有輸入元件 (`Input`, `Select`, `Input type="date"`) 皆須設定 `style={{ width: '100%' }}` 以撐滿所在的 `Col`。
- **關聯資料選單 (Relational Selects)**：
  - 具備關聯性質的欄位 (如：部門代碼) 應使用 `<Select>`。
  - 必須透過真實 API (`getApiV1GeneralTypesGetTypes` 等) 取得選項 (`options`)。
  - 必須開啟 `showSearch` 與 `filterOption` 支援關鍵字過濾。
  - 下拉選單載入時需綁定 `loading` 狀態 (`isFetching`)。
- **日期欄位處理 (Date Fields)**：
  - 進入編輯模式 (`startEditMode`) 並執行 `setFieldsValue` 前，必須將後端傳回的 ISO 8601 日期字串 (例如 `2024-03-25T00:00:00`) 截斷為 `YYYY-MM-DD` (`substring(0, 10)`)，以相容原生的 `<Input type="date">` 嚴格格式要求。
- **分頁處理 (Pagination)**：
  - 絕對禁止前端假分頁。
  - `<Table pagination>` 必須嚴格綁定後端 API 回傳的 `data.pageNumber`、`data.pageSize` 與 `data.totalRecords`。
- **數字顯示格式化 (Number Formatting)**：
  - 所有數字欄位的顯示，必須格式化為千分位 (例如：`1,234,567`)。
  - 小數點處理原則：有小數才顯示，沒有小數則不顯示 (不強制補零)。可使用 `Intl.NumberFormat` 或 `Number().toLocaleString()` 來實作。

## 4. 系統架構與穩定性 (Architecture & Core)

- **自動化生成 (Code Generation)**：
  - 基礎單檔 CRUD 應透過 `generate_crud_v2.py` 腳本統一產出，避免手動複製貼上導致各模組規格碎裂。
  - 若有 UI/UX 的通用變更需求，應優先修改 Python 腳本模板後再重新產出。
- **繁體中文化 (i18n)**：
  - 表格的 `title`、表單的 `label` 以及查詢的 `placeholder` 嚴禁直接暴露英文 API 變數。
  - 需透過字典檔 (如腳本中的 `I18N_MAP`) 或特定判斷邏輯，將其翻譯為繁體中文。
- **權限控管 (RBAC)**：
  - 依賴 `useAuthStore().hasPermission` 進行元件層級的渲染控制。
  - 權限 Key 必須與後端嚴格對齊。特別注意，後端「修改」的權限 Action 慣例為 `.Update` (如 `System.Users.Update`)，不可誤用 `.Edit`。

## 5. Ant Design v5 升級與警告防範 (Antd V5 Migration)

專案已升級至 Ant Design v5，嚴禁在元件中使用已棄用 (Deprecated) 的屬性。開發時若發現 Console 拋出警告，必須立即修正：
- **Space 元件**：禁用 `split` 屬性，必須改用 `separator` 屬性來加入分隔線。
- **Divider 元件**：禁用 `type` 屬性，必須改用 `orientation` 屬性 (例如：`<Divider orientation="vertical" />`)。
- **Spin 元件**：禁用 `tip` 屬性，必須改用 `description` 屬性。
