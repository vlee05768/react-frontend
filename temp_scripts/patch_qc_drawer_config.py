import re

file_path = "src/pages/quality/qcreceipt/QcReceiptDrawer.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add mainFormConfig import
content = content.replace(
    "import { qcReceiptSearchConfig, getStatusTagProps } from './QcReceiptConfig';",
    "import { qcReceiptSearchConfig, getStatusTagProps, mainFormConfig } from './QcReceiptConfig';"
)

# Remove inline config
old_config = """  const config = [
    { name: 'documentNumber', label: '單據號碼', componentType: 'Input' as const, colSpan: 12, componentProps: { disabled: true, placeholder: '系統自動產生' } },
    { name: 'documentDate', label: '單據日期', componentType: 'DatePicker' as const, colSpan: 12, rules: [{ required: true, message: '必填' }] },
    { name: 'status', label: '單據狀態', componentType: 'Input' as const, colSpan: 12, componentProps: { disabled: true, value: getStatusTagProps(defaultValues.status || 'Unconfirmed').text } },
    { name: 'responsibleUserName', label: '負責人員', componentType: 'Input' as const, colSpan: 12, componentProps: { disabled: true } },
    { name: 'notes', label: '備註', componentType: 'TextArea' as const, colSpan: 24, componentProps: { rows: 2 } },
    // Hidden field to keep responsibleEmployeeCode
    { name: 'responsibleEmployeeCode', label: '', componentType: 'Input' as const, colSpan: 0, componentProps: { style: { display: 'none' } } },
  ];"""
  
content = content.replace(old_config, "")

# Update DynamicForm to use mainFormConfig()
content = content.replace("fields={config as any}", "fields={mainFormConfig()}")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

