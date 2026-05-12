import re
import os

def insert_auto_tab_logic(filepath, item_field, tab_key):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if "hasAutoSwitchedRef" in content:
        return
        
    # Ensure useRef is imported
    if "useRef" not in content:
        content = content.replace('useState, useEffect', 'useState, useEffect, useRef')
        content = content.replace('useState,', 'useState, useRef,')
        if "useRef" not in content: # If replacement failed
            content = content.replace("import React, {", "import React, { useRef,")

    # The block to insert
    block = f"""
  const hasAutoSwitchedRef = useRef(false);

  // 當開啟不同的單據時重置自動切換狀態
  useEffect(() => {{
    hasAutoSwitchedRef.current = false;
  }}, [id]);

  // 若為檢視模式且無明細資料，自動切換至明細頁籤
  useEffect(() => {{
    if (!isCreating && isViewMode && {item_field.split('.')[0]}) {{
      if (!hasAutoSwitchedRef.current) {{
        const items = {item_field};
        if (Array.isArray(items) && items.length === 0) {{
          setActiveTab('{tab_key}');
        }}
        hasAutoSwitchedRef.current = true;
      }}
    }}
  }}, [isCreating, isViewMode, {item_field.split('.')[0]}]);
"""

    # We need to insert this just before `const createMutation = useMutation(` or something similar
    # Find `const [activeTab, setActiveTab] = useState('master_info');`
    pattern = r"const \[activeTab, setActiveTab\] = useState\('master_info'\);"
    
    if re.search(pattern, content):
        content = re.sub(pattern, r"const [activeTab, setActiveTab] = useState('master_info');\n" + block, content)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Patched {filepath}")
    else:
        print(f"Could not find activeTab state in {filepath}")

