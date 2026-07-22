# Ticket: 實作原料「最後進貨成本」同步與動態解鎖機制

- **Feature**: material-last-cost
- **Ticket ID**: 01
- **Status**: resolved
- **Type**: task
- **Assignee**: agent

## Description

1. 更改原料管理中「標準成本 (元/㎡)」的語意為「最後進貨成本 (元/㎡)」。
2. 當 IQC 確認入庫過帳（AllPass/Partial）以及主管核准特採（ConcessionApproved）時，即時更新該原料的最後進貨成本。
3. 根據原料是否存在 IQC 實際交易紀錄，動態鎖定「最後進貨成本」欄位。
4. 提供 Admin/Finance 權限的小鎖頭 🔒 動態解鎖微調功能。

## Implementation Details

- **後端變更**：
  - `MaterialDto.cs`：新增 `IsCostLocked` 屬性。
  - `MaterialService.cs`：在 `EntityToDtoSelector` 進行 `IsCostLocked` 投影。
  - `IqcInspectionService.cs`：在過帳、核准特採結尾即時重算當批 SQM 成本並更新至 `material.UnitPrice`。
- **前端變更**：
  - `MaterialConfig.tsx`： Table Columns 與 Form Config 全面更名「最後進貨成本」，支援動態鎖頭。
  - `MaterialList.tsx`：取得 `isCostLocked` 狀態、使用者角色、判定解鎖 Callback，並將參數傳入 `mainFormConfig`。

## Answer / Resolution

1. 所有的後端程式碼已成功修改，並且編譯（0 Error）與原有的單元測試（93/93 Passed）完美成功通過。
2. 前端 React + TypeScript 程式碼已完美整合，動態鎖頭與 Tooltip 邏輯已落實，並且 `pnpm build`（型別檢查、Vite 打包、壓縮）順利 100% 成功通過。
3. 所有程式碼已準備進行 Commit！

Part of #62
