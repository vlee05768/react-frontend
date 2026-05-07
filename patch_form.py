import re

with open('src/components/Form/DynamicForm.tsx', 'r') as f:
    content = f.read()

target = """      // 2. 處理必填邏輯 (支援靜態或動態 context function)
      const isRequired = typeof field.required === 'function' ? field.required(context) : field.required;
      
      if (isRequired) {
        // 若設為必填，我們以基礎防呆檢核疊加：不可為 undefined / null / 空字串
        // (如果開發者已提供 Zod schema，我們依舊保留並串接 refine 保證必填不為空)
        fieldSchema = ((fieldSchema || z.any()) as z.ZodTypeAny).refine(
          (val: any) => val !== undefined && val !== null && val !== '', 
          { message: '此欄位為必填' }
        ) as z.ZodTypeAny;
      } else if (!fieldSchema) {
        // 無設定檢核則放行
        fieldSchema = z.any();
      }"""

replace = """      // 2. 處理必填邏輯 (支援靜態或動態 context function)
      if (field.autoGenerate && !isUpdateMode) {
        // 系統自動產生的欄位在新增模式下，免除驗證必填
        if (fieldSchema) {
          fieldSchema = (fieldSchema as any).optional();
        } else {
          fieldSchema = z.any();
        }
      } else {
        const isRequired = typeof field.required === 'function' ? field.required(context) : field.required;
        
        if (isRequired) {
          // 若設為必填，我們以基礎防呆檢核疊加：不可為 undefined / null / 空字串
          // (如果開發者已提供 Zod schema，我們依舊保留並串接 refine 保證必填不為空)
          fieldSchema = ((fieldSchema || z.any()) as z.ZodTypeAny).refine(
            (val: any) => val !== undefined && val !== null && val !== '', 
            { message: '此欄位為必填' }
          ) as z.ZodTypeAny;
        } else if (!fieldSchema) {
          // 無設定檢核則放行
          fieldSchema = z.any();
        }
      }"""

if 'if (field.autoGenerate && !isUpdateMode)' not in content:
    content = content.replace(target, replace)
    with open('src/components/Form/DynamicForm.tsx', 'w') as f:
        f.write(content)
    print("Patched DynamicForm.tsx")
else:
    print("Already patched DynamicForm.tsx")
