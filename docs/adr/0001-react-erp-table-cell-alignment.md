# ADR 0001: 採用單元格級別 (Cell-Level) 物理對齊包裹器優化高密表格排版

## 狀態
已接受 (Accepted) - 2026-07-22

## 背景 (Context)
在模切業 ERP 系統的前端 React + Ant Design 表格（如訂單明細 `OrderItemsTab`）中，許多欄位會混合使用不同 Display 模式與高度的 UI 組件：
- 「操作」欄位包含按鈕（`<Button>` 預設高度為 32px，高密表格要求為 24px/small）。
- 「商品編碼」與「類型」欄位包含標籤（`<Tag>` 與 `<DictTag>`，自帶內距與邊框）。
- 「要求交期」與「商品名稱」包含純文字與純數字。
- 「產生製令」包含 inline SVG 圖示（`<CheckOutlined>` / `<CloseOutlined>`）。

由於這些組件物理高度不一致，且瀏覽器的預設基線對齊（`vertical-align: baseline` 或 `middle`）在面對 display 為 `inline-block`、`inline-flex`、`inline` 混合容器時，會產生微小的垂直起伏偏差。
在高密度表格（`size="small"`）下，Cell 的上下 Padding 極小，這使得 1~2px 的基線對齊不整齊在視覺上顯得非常刺眼、不美觀（內容幾乎頂到儲存格邊界，且排列上下起伏）。

## 決定 (Decision)
我們決定在訂單明細與未來的其他高密表格（`size="small"`）中，**全面套用「單元格級別 (Cell-Level) 物理對齊包裹器」** 的設計模式。

具體實施方式如下：
1. **統一對齊高度（Uniform 24px Height）：** 
   - 所有的欄位 render 函數，其輸出均包裹在固定高度為 `24px`、垂直居中對齊的容器中。
2. **文字與數值欄位（Inline-Block Wrapper）：**
   - 靠左/中/右對齊的文字或數值，使用 `<span>` 包裹：
     ```tsx
     style={{ display: 'inline-block', lineHeight: '24px', verticalAlign: 'middle', width: '100%', textAlign: 'left|center|right' }}
     ```
3. **組件、標籤、按鈕與圖示欄位（Inline-Flex Wrapper）：**
   - 包含 `<Tag>`、`<Space>`（內含按鈕）或 `<CheckOutlined>` 等圖示的欄位，使用 `<div>` 包裹：
     ```tsx
     style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center|flex-start', height: '24px', verticalAlign: 'middle' }}
     ```
4. **按鈕與表單控制縮小化（Size Small）：**
   - 行內按鈕一律顯式加上 `size="small"`，使其物理高度與其他對齊器一致，防止表格撐高。
5. **清除標籤外距（Zero Tag Margin）：**
   - 所有在行內渲染的標籤（如 `Tag`、`DictTag`）一律清除外距（套用 `style={{ margin: 0 }}` 或 `className="m-0"`）。

## 替代方案 (Alternatives Considered)
- **方案 A：全域或模組級別的 CSS 覆寫（例如調整 `.ant-table-cell` 及子元件排版）**
  - *被否決的原因*：容易產生樣式污染（CSS leak），在面對混合不同 display 屬性的子組件時，瀏覽器對 `vertical-align` 的計算往往不盡人意，難以做到針對單個 Tag / Button 的 100% 物理對齊。
- **方案 B：僅包裹 Tag 欄位，純文字欄位不作包裹**
  - *被否決的原因*：純文字的基線（baseline）與 `inline-flex` 的 Tag 計算邏輯依然不同，極容易造成 1px 左右的錯位起伏。

## 後果與影響 (Consequences)
- **正面影響：**
  - 表格整列中，無論包含純文字、數值、按鈕、Tag 還是圖示，所有內容皆在相同的 24px 高度內居中，且其垂直中心軸完美對齊。
  - 提供了高度確定、一致的視覺品質（對齊性、緊湊感與留白平衡）。
  - 符合高密度表格防捲軸、防不必要行高撐大的物理要求。
- **負面影響：**
  - 欄位設定檔（如 `OrderConfig.tsx`）中的 `render` 函數會顯得較為繁瑣，多了許多排版包裹容器。開發時需要注意重複套用此模式。
