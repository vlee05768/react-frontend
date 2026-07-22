# ERP 系統規格書：原料「最後進貨成本」同步與動態解鎖機制

## Status: ready-for-agent

## Problem Statement

目前原物料管理畫面中的「標準成本 (元/㎡)」(對應資料庫 Material.UnitPrice 欄位) 需由人工手動維護。然而：
1. 模切業原物料成本受「分條代工費分攤」、「PO 超收容差 10% 封頂」等複雜進貨因素影響，人工極難實時精準計算。
2. 標準成本與「帳實一致（物理與財務同步）」原則存在落差，財務滾算時缺乏最真實、最新的最後一次合格進貨成本。
3. 新開帳或無實際進貨交易的原料需要手動維護預估初始成本，但日常營運中若被使用者隨意改動進貨成本，會造成嚴重的財務和定價估算失誤。

## Solution

將原物料基本資料表中的「標準成本 (元/㎡)」更名並轉型為「最後進貨成本 (元/㎡)」：
1. **自動即時回寫**：在進料檢驗（IQC）確認過帳（合格入庫）或主管核准特採入庫當下，系統即時重算當批 SQM 實質成本，並自動回寫至原料主檔的 `UnitPrice`。
2. **動態自動鎖定**：系統自動偵測原料是否已有實際進貨交易，若無（開帳期/無交易期）開放手動編輯；若已有，則自動唯讀置灰（Disabled）。
3. **特權安全解鎖**：僅限系統管理員 (Admin) 與財務角色 (Finance)，可點選小鎖頭 🔒，在彈出強烈財務一致性二確警告並確認後，臨時解除鎖定開放手動微調。
4. **極致相容性**：維持資料庫物理 Schema 的 `Material.UnitPrice` 名稱不變，僅在 UI 顯示、語意、註解與回寫時機上進行轉變，保證既有的 BOM 與成本滾算模組 100% 相容。

## User Stories

1. As an inventory manager, I want to manually enter an initial estimated cost in the "Last Inflow Cost" field when creating new materials or opening the account, so that the system can perform preliminary finished product cost rollups before any actual purchase receipt transactions.
2. As a system administrator, I want the system to automatically lock the "Last Inflow Cost" field (making it read-only and grayed out) once the material has its first actual IQC pass-and-post transaction, to prevent accidental manual modifications in daily operations.
3. As a QC inspector, when I pass and post an IQC inspection (AllPass/PartialPass), I want the system to automatically backfill the calculated real SQM cost into the material master's "Last Inflow Cost" at the moment of establishing roll/sheet LPNs, ensuring the pricing basis remains up to date.
4. As an approving manager, when I approve concession (ApproveConcession) for a material and post it into inventory, I want the system to immediately update the material master's cost, keeping data synchronized.
5. As a finance manager, under special account adjustment needs, I want to click a small lock icon 🔒 next to the locked cost field and bypass the read-only restriction after confirming a strong financial consistency warning dialog, to adjust the cost manually.
6. As a shop-floor employee, when I view the material edit page, I want to see the lock icon indicating the cost is automatically managed, but I should not be allowed to unlock it, ensuring strict financial control.

## Implementation Decisions

### 1. Database & Domain Models (No Schema Change)
- Keep `Material.UnitPrice` database property unchanged. Update C# XML comments to "Last Inflow Cost".
- Add `IsCostLocked` boolean property in `MaterialDto`:
  - Determined by a subquery in `MaterialService.EntityToDtoSelector` checking whether there are active `"IQC"` transactions in `MaterialInventoryTransactions`.

### 2. Service Layer (IQC Backfilling - EF Core Tracking Safe)
- Append cost backfilling logic inside `IqcInspectionService.CompleteIqcInspectionAsync` (品檢過帳) and `ApproveConcessionAsync` (特採核准) right before calling `SaveChangesAsync`.
- To avoid tracking conflicts, modify the tracked `material` entity directly within the current transaction context instead of executing redundant queries or `Update()` calls:
  ```csharp
  decimal incomingCost = await CalculateReceiptItemUnitCostPerSqmAsync(prItem);
  material.UnitPrice = Math.Round(incomingCost, 4, MidpointRounding.AwayFromZero);
  ```

### 3. Frontend UI Components (Dynamic Lockout Component)
- Update all columns, tables, labels, and forms in `MaterialConfig.tsx` to read "最後進貨成本 (元/㎡)".
- Upgrade `mainFormConfig` to receive `isCostLocked`, `isAdminOrFinance`, `isUnlocked`, and `onUnlock` arguments.
- Dynamically render 🔒 lock icon when `isCostLocked === true`:
  - Allow `isAdminOrFinance` roles to click and trigger a confirmation dialog. Upon OK, the lock switches to 🔓 green, temporarily unlocking the field for manual edits.

## Testing Decisions

- **Backend Integration Tests**: Utilize existing seams in high-level service integration tests (`IqcInspectionAutoLotSplittingTests.cs` and `IqcInspectionSheetMaterialTests.cs`). Assert that `Material.UnitPrice` is updated immediately following pass-all or concession-approval postings.
- **Frontend Verification**: Verify with staging/production builds that different materials dynamically toggle editability and lock states depending on presence of transactions and user role credentials.

## Out of Scope

- Automatic undoing/rolling back of `Material.UnitPrice` to the second-to-last cost when an IQC posting is cancelled (IQC Cancel).
- Re-writing raw material cost master on work order reports or production consumption stages (reads only, no writes).
