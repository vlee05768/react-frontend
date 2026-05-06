import { z } from "zod";

const customErrorMap: any = (issue: any, ctx: any) => {
  let message = ctx.defaultError;

  switch (issue.code) {
    case "invalid_type":
      if (issue.received === "undefined" || issue.received === "null") {
        message = "此欄位為必填";
      } else {
        message = `格式錯誤，預期為 ${issue.expected}，但收到 ${issue.received}`;
      }
      break;

    case "too_small":
      if (issue.type === "string") {
        message = issue.exact
          ? `必須剛好為 ${issue.minimum} 個字元`
          : `最少必須為 ${issue.minimum} 個字元`;
      } else if (issue.type === "number") {
        message = issue.exact
          ? `必須等於 ${issue.minimum}`
          : `必須大於或等於 ${issue.minimum}`;
      } else if (issue.type === "array") {
        message = issue.exact
          ? `必須包含剛好 ${issue.minimum} 個項目`
          : `至少需要 ${issue.minimum} 個項目`;
      }
      break;

    case "too_big":
      if (issue.type === "string") {
        message = issue.exact
          ? `必須剛好為 ${issue.maximum} 個字元`
          : `最多不可超過 ${issue.maximum} 個字元`;
      } else if (issue.type === "number") {
        message = issue.exact
          ? `必須等於 ${issue.maximum}`
          : `必須小於或等於 ${issue.maximum}`;
      } else if (issue.type === "array") {
        message = issue.exact
          ? `必須包含剛好 ${issue.maximum} 個項目`
          : `最多不可超過 ${issue.maximum} 個項目`;
      }
      break;

    case "invalid_format":
      if (typeof issue.validation === "string") {
        if (issue.validation === "email") {
          message = "電子郵件格式無效";
        } else if (issue.validation === "url") {
          message = "網址格式無效";
        } else if (issue.validation === "uuid") {
          message = "無效的 UUID";
        } else if (issue.validation === "regex") {
          message = "不符合規定的格式";
        } else {
          message = "格式錯誤";
        }
      } else {
        message = "字串格式無效";
      }
      break;

    case "custom":
      message = issue.message || "輸入無效";
      break;

    case "invalid_value":
      if (issue.options) {
        message = `無效的選項，請從下列選項中選擇：${issue.options.join(", ")}`;
      } else {
        message = "無效的值";
      }
      break;

    default:
      message = ctx.defaultError;
  }

  return { message };
};

z.setErrorMap(customErrorMap);
