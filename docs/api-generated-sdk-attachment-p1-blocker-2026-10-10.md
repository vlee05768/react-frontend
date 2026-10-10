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

## 驗證結果

- `pnpm test`：通過，23 files / 173 tests
- `pnpm exec tsc --noEmit`：失敗
  - `src/api/molds.test.ts(29,65): error TS2554: Expected 1 arguments, but got 0.`
  - `src/pages/sales/pricing/ProductPricingList.tsx(13,3): error TS2724: ... has no exported member named 'getApiV1BomByProductCode'.`
- `pnpm run build`：失敗，同上述 TypeScript 錯誤
- 全量產生 diff 執行 `git diff --check`：通過

## 阻塞原因與後續

目前 API contract pipeline 以執行時 Swagger 為全量 input，但該 Swagger 混入非附件路由漂移；不能手改 generated SDK，也不能刪除不相關路由掩蓋問題。需由 API contract pipeline 固定相容 Swagger input／重新產生並提交正確基線，或同步所有受影響 consumer 後再重跑完整驗證。此次不提交 generated SDK，保留前端既有驗證基線 `a4e6ed4`。
