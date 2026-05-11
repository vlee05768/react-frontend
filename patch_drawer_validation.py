import re

with open('src/pages/production/workorders/WorkOrderDrawer.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the handleSubmit
old_handle_submit = """    } else if (editMode === 'work') {
      try {
        const productDto = {
          actualQuantity: values.actualQuantity,
          defectReason: values.defectReason,
          productionDate: values.productionDate?.format ? values.productionDate.format('YYYY-MM-DD') : values.productionDate,
          storageCode: values.storageCode,
          notes: values.notes,
        };"""

new_handle_submit = """    } else if (editMode === 'work') {
      // 驗證人員工時
      const hours = values.personnelWorkingHours || [];
      const validHours = hours.filter(
        (item: any) => item.employeeNumber && item.employeeNumber.trim() && item.hours != null && item.hours > 0
      );

      if (validHours.length === 0) {
        modal.error({ 
          title: '驗證失敗', 
          content: '請至少輸入一筆有效的人員工時（需包含員工帳號和工時大於 0）', 
          centered: true 
        });
        return;
      }

      try {
        const productDto = {
          actualQuantity: values.actualQuantity,
          defectReason: values.defectReason,
          productionDate: values.productionDate?.format ? values.productionDate.format('YYYY-MM-DD') : values.productionDate,
          storageCode: values.storageCode,
          notes: values.notes,
          personnelWorkingHours: validHours,
        };"""

content = content.replace(old_handle_submit, new_handle_submit)

with open('src/pages/production/workorders/WorkOrderDrawer.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
