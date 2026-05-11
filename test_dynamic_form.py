content = open('src/components/Form/DynamicForm.tsx', 'r', encoding='utf-8').read()

import re

# We want to replace `onFinish={handleSubmit(onSubmit)}` with `onFinish={handleSubmit(handleInternalSubmit)}`
# and define handleInternalSubmit above it.

handle_internal = """
  // Global Interceptor for DatePicker fields to format dayjs -> YYYY-MM-DD
  const handleInternalSubmit = (values: TValues) => {
    const payload = { ...values };
    fields.forEach(field => {
      // 處理 Form 動態隱藏邏輯，若 showInForm 顯式設定為 false，不渲染該欄位
      if (field.showInForm === false) return;
      
      const componentType = typeof field.componentType === 'function' 
        ? field.componentType(context) 
        : field.componentType;
        
      if (componentType === 'DatePicker') {
        const val = payload[field.name as keyof TValues];
        if (val && typeof val.format === 'function') {
           payload[field.name as keyof TValues] = val.format('YYYY-MM-DD') as any;
        }
      } else if (componentType === 'DateRangePicker') {
        const val = payload[field.name as keyof TValues];
        if (Array.isArray(val) && val.length === 2) {
          payload[field.name as keyof TValues] = val.map(d => d && typeof d.format === 'function' ? d.format('YYYY-MM-DD') : d) as any;
        }
      }
    });
    onSubmit(payload);
  };
"""

pattern = r'(\s*const hasGroups = fields\.some.*?;)'
replacement = r'\1\n' + handle_internal

content = re.sub(pattern, replacement, content)

content = content.replace('onFinish={handleSubmit(onSubmit)}', 'onFinish={handleSubmit(handleInternalSubmit)}')

with open('src/components/Form/DynamicForm.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

