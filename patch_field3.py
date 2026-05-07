import re

with open('src/components/Form/DynamicField.tsx', 'r') as f:
    content = f.read()

target = """        // 判斷是否顯示必填紅星號：若是明確要求 (isRequired) 或 validation 中非 optional 皆視為必填
        const showRequiredMark = isRequired || 
          (!!config.validation && !config.validation.isOptional() && !(config.validation instanceof z.ZodOptional) && !(config.validation instanceof z.ZodNullable)) || 
          (config.dynamicValidation && !config.dynamicValidation(context)?.isOptional());"""

replace = """        // 判斷是否顯示必填紅星號：若是明確要求 (isRequired) 或 validation 中非 optional 皆視為必填
        let showRequiredMark = isRequired || 
          (!!config.validation && !config.validation.isOptional() && !(config.validation instanceof z.ZodOptional) && !(config.validation instanceof z.ZodNullable)) || 
          (config.dynamicValidation && !config.dynamicValidation(context)?.isOptional());
          
        // 系統自動產生的欄位在新增模式下，隱藏必填紅星號
        if (config.autoGenerate && !isUpdateMode) {
          showRequiredMark = false;
        }"""

if 'if (config.autoGenerate && !isUpdateMode) {' not in content:
    content = content.replace(target, replace)
    with open('src/components/Form/DynamicField.tsx', 'w') as f:
        f.write(content)
    print("Patched DynamicField.tsx for required mark")
else:
    print("Already patched DynamicField.tsx for required mark")
