# Attachment API generated SDK P1 阻塞報告

日期：2026-10-10

## 結果

依 `openapi-ts.config.ts`，使用實際 `http://127.0.0.1:5160/swagger/v1/swagger.json` 重新產生 SDK。Swagger 取得後已立即終止 `dotnet run`，並確認 `5160`、`5173` 均無監聽程序。

- Swagger：206 paths、310 schemas
- 產生檔案：`src/api/generated/index.ts`、`sdk.gen.ts`、`types.gen.ts`
- 產生 diff：`1277 insertions(+), 999 deletions(-)`
- 未手改 generated 檔案
- 未修改後端、版號或業務頁面
- 未 commit、未 push
- 已恢復 generated 檔案至 `a4e6ed4544b09ce2f3dbf970b529c6bdc52ed279`

## 附件契約變更

Swagger 產生結果包含 AttachmentController 所需契約：

- `GET /api/v1/FileAttachment`：回應改為 `FileAttachmentDtoListApiResponse`，400 改為 `ApiResponse`
- `GET /api/v1/FileAttachment/{id}`：回應改為 `FileAttachmentDtoApiResponse`，404 改為 `ApiResponse`
- `POST /api/v1/FileAttachment/batch-upload`：回應改為 `FileAttachmentDtoListApiResponse`，400 改為 `ApiResponse`
- `DELETE /api/v1/FileAttachment/batch-delete`：200 改為 `ApiResponse`，400 改為 `ApiResponse`
- 同一 Controller 宣告的 `file-attachments` 別名路由與 upload-session 路由也被全量產生

## 非附件漂移

同一份現行 Swagger 同時造成與本批無關的 generated 變更，包括：

- BOM 路由與型別由 `productCode` 漂移為 `outputType/outputCode`，移除既有 BOM 路由
- 移除 SQL monitoring generated endpoints
- 新增 Auth logout、Mold products、ProductionMaterialReceipt、SystemMaintenance endpoints
- 多個既有查詢欄位與回應型別變更

## 根因確認

此阻塞不是附件 Swagger input 損壞，也不是 generated SDK 需要手改；根因是前端 `master` 的 generated baseline 落後 backend `dev` 的近期契約變更：

- backend `b40d59e` 已將 BOM 路由從 `{productCode}` 改為 `{outputType}/{outputCode}`。
- backend `6faac48` 新增 Mold 關聯產品查詢；backend `98fb061`、`f2109e9` 等批次調整多個錯誤回應與路由契約。
- `openapi-ts.config.ts` 目前直接以 `VITE_DEV_API_TARGET/swagger/v1/swagger.json` 為 input；repo 沒有可供本次安全切換的 frozen Swagger snapshot。

因此不能只保留附件差異，也不應刪除路由掩蓋差異；正確處置是以 backend 現行 Swagger 重新產生，再同步實際受影響 consumer。

## 最小修正

- 依現行 backend Swagger 重新產生 `src/api/generated/index.ts`、`sdk.gen.ts`、`types.gen.ts`，未手改 generated 檔案。
- `ProductPricingList.tsx` 改用 generated 的多態 BOM API，產品查詢固定傳 `outputType: 'P'`。
- `moldProducts.ts` 改用 generated 的 `getApiV1MoldByCodeProducts` 與 generated DTO；同步補上 generated optional response 欄位的安全處理。
- `molds.ts`、模具關聯產品元件及其兩組測試同步現行 generated optional/非 readonly 型別與 SDK mock 邊界。
- 未修改 backend 路由、無關業務邏輯、版號或 frozen contract；未刪路由、未 push。

## 驗證結果

- backend Swagger：206 paths、310 schemas；確認 BOM 舊路由不存在、新多態路由存在。
- `dotnet test --no-restore`：395 passed、1 skipped。
- `pnpm test`：通過，23 files / 173 tests。
- `pnpm exec tsc --noEmit`：通過。
- `pnpm run build`：通過。
- `git diff --check`：通過。

## 結論

相容性阻塞已由「後端近期路由／契約變更未同步前端 generated baseline」確認並以最小 consumer 同步修正解除。frozen contract 目前不存在，且本次不新增 snapshot；後續若要避免全量 runtime Swagger 漂移，應另案建立版本化、由 backend 產生並審核的 contract artifact，再由 `openapi-ts` pipeline 固定引用。
