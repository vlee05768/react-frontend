# TableText：表格文字介面

```tsx
import { TableText } from '@/components/Table/tableText';

<TableText value={amount} format={value => Number(value).toLocaleString('zh-TW')} align="right" />
<TableText value={name} renderContent={text => <Link to={url}>{text}</Link>} />
<TableText value={notes} maxLines={2} maxWidth={240} emptyText="—" />
<TableText value={code} tooltipContent={<span>完整業務說明</span>} tooltipMode="always" />
```

- `value`: 原始 `string | number | null | undefined`。`null`、`undefined`、空字串使用 `emptyText`（預設空字串）；`0` 不算空值。
- `format(value) => string`: 非空值的文字格式化；預覽及預設提示共用格式化文字。
- `renderContent(text) => ReactNode`: 客製文字強調、顏色、Link；接收已格式化的預覽文字。單行把 CRLF／CR／LF 換成空格。完整提示不從 JSX 推測，請用原始 `value`、`format` 或明確 `tooltipContent`。
- `tooltipContent`: 明確的 ReactNode 提示（`null` 可關閉提示內容）；不會因提供此 prop 就強制顯示。請勿放入需操作的按鈕／連結。
- `tooltipMode`: `overflow`（預設）只在實際寬／高溢出或單行隱藏原文字換行時提示；`always` 用於額外業務說明；`never` 完全停用。
- `maxLines`: 預設 1，單行 ellipsis；大於 1 明確採多行 line-clamp 並保留換行。所有文字行高 24px。`maxWidth` 預設 `100%`，支援數值或 CSS 寬度；`align` 支援 left／center／right。

提示可透過 hover／focus 開啟。只有確實需要提示的純文字增加 tab stop；內含原生可聚焦 Link 時使用該 Link，不增加重複 tab stop。

## 相容與範圍

`EllipsisText` 保留舊 props；明確 `showHint=true` 對應 always，false 對應 never，省略採 overflow。`renderTableText`／共用 Table 只包裝純文字與可辨識的文字容器／單一文字 Link 或原生 a，保留原事件、路由、ref 與樣式；多個 Link／a（含混合）、帶其他事件／role／tabIndex 的互動容器、未知元件、Button、Tag、複合操作、明確多行節點原樣返回。欄位 `ellipsis:false` 完全退出自動處理。

既有 `headerHint` 是欄頭補充說明，預設 always；欄位明確 `tooltipMode` 或 `showHint=false` 可覆蓋。一般欄頭及儲存格採 overflow。不修改表單，也不推導任意 JSX 的完整文字。

量測於每次 DOM commit（包含內容與配置更新）、ResizeObserver、window resize 執行；observer／listener 僅隨預覽 DOM 節點建立及釋放，不因 JSX 或量測 state 更新重建。卸載清理所有訂閱，無 layout polling。jsdom 測試以受控寬高驗證提示判斷，真實截斷需瀏覽器版面量測。

檔名 `TableTextContent.tsx` 避免與既有 `tableText.tsx` 在大小寫不敏感檔案系統衝突；公開 import 由 `tableText` 匯出。