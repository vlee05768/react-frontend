import re

with open('src/config/dictionaryRegistry.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Insert ORDER_STATUS under IsActive
new_dict = """
  // 訂單狀態
  ORDER_STATUS: {
    queryFn: async () => [
      { text: '新單據', val: 'Draft' },
      { text: '已確認', val: 'Confirmed' },
      { text: '已完成', val: 'Finished' },
    ],
    fieldNames: { label: 'text', value: 'val' }
  },
"""

content = content.replace("  // 角色選單", new_dict + "  // 角色選單")

with open('src/config/dictionaryRegistry.ts', 'w', encoding='utf-8') as f:
    f.write(content)
