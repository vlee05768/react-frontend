/**
 * UI 顯示相關的常數設定
 * 統一管理全站 Layout, Width, Size 等參數，避免散落在各模組中
 */

// --- Drawer 寬度設定 ---
export const DRAWER_WIDTH_MAIN = '60vw';   // 主表單 (例如：新增/編輯使用者、角色、廠商)
export const DRAWER_WIDTH_DETAIL = '55vw'; // 明細表單 (例如：聯絡人、分類項目)
export const DRAWER_WIDTH_SEARCH = '40vw'; // 查詢側邊欄 (例如：進階搜尋 Drawer)

// --- Pagination 分頁設定 ---
export const DEFAULT_PAGE_SIZE = 20;       // 預設每頁筆數
export const MAX_PAGE_SIZE = 100;          // 下拉選單、字典檔無分頁時預設抓取的最大筆數
export const PAGE_SIZE_OPTIONS = ['10', '20', '50', '100']; // 可選每頁筆數

// --- 時間/延遲設定 ---
export const ANIMATION_DELAY_MS = 300;     // Drawer/Modal 等待動畫完成的延遲時間 (ms)
