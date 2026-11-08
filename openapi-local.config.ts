import { defineConfig } from '@hey-api/openapi-ts';
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

// 離線重產：不讀取 .env，僅接受已核對 SHA-256 的本機 OpenAPI JSON 文件。
const source = process.env.OPENAPI_INPUT;
const expectedHash = process.env.OPENAPI_SHA256;
if (!source || /^[a-z][a-z\d+.-]*:/i.test(source) || /^[/\\]{2}/.test(source)) {
  throw new Error('OPENAPI_INPUT 必須指定本機檔案路徑，不接受 URL 或網路路徑。');
}
if (!expectedHash || !/^[a-f\d]{64}$/i.test(expectedHash)) {
  throw new Error('OPENAPI_SHA256 必須指定已核對的文件 SHA-256。');
}
const input = resolve(source);
if (!statSync(input).isFile()) {
  throw new Error('OPENAPI_INPUT 必須指定本機一般檔案。');
}
const document = readFileSync(input);
if (createHash('sha256').update(document).digest('hex') !== expectedHash.toLowerCase()) {
  throw new Error('本機 OpenAPI 文件的 SHA-256 與預期值不符。');
}
const parsed: unknown = JSON.parse(document.toString('utf8'));
if (typeof parsed !== 'object' || parsed === null || !('openapi' in parsed) || !('paths' in parsed)) {
  throw new Error('本機文件必須是 OpenAPI JSON。');
}
// 防止已雜湊的本機文件經由外部 $ref 觸發額外下載。
function requireLocalReferences(value: unknown): void {
  if (typeof value !== 'object' || value === null) return;
  for (const [key, child] of Object.entries(value)) {
    if (key === '$ref' && (typeof child !== 'string' || !child.startsWith('#/'))) {
      throw new Error('離線 OpenAPI 文件不得包含外部 $ref。');
    }
    requireLocalReferences(child);
  }
}
requireLocalReferences(parsed);
export default defineConfig({
  plugins: ['@hey-api/client-axios'],
  input,
  output: 'src/api/generated',
});
