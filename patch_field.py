import re

with open('src/components/Form/DynamicField.tsx', 'r') as f:
    content = f.read()

# Add autoGenerate logic for calcDisabled
calc_disabled_target = """  const finalDisabled = isViewMode || calcDisabled;"""
calc_disabled_replace = """  // 處理 autoGenerate 邏輯：自動產生的欄位強制唯讀
  if (config.autoGenerate) calcDisabled = true;

  const finalDisabled = isViewMode || calcDisabled;"""

if 'if (config.autoGenerate) calcDisabled = true;' not in content:
    content = content.replace(calc_disabled_target, calc_disabled_replace)

# Add placeholder logic
component_props_target = """  const componentProps = typeof config.componentProps === 'function' ? config.componentProps(context) : (config.componentProps || {});"""
component_props_replace = """  const componentProps = typeof config.componentProps === 'function' ? config.componentProps(context) : { ...(config.componentProps || {}) };
  
  // 新增模式下，如果是自動產生的文字框，加上 placeholder
  if (config.autoGenerate && !isUpdateMode && resolvedComponentType === 'Input') {
    if (!componentProps.placeholder) {
      componentProps.placeholder = '系統自動產生';
    }
  }"""

if "componentProps.placeholder = '系統自動產生';" not in content:
    content = content.replace(component_props_target, component_props_replace)

with open('src/components/Form/DynamicField.tsx', 'w') as f:
    f.write(content)
print("Patched DynamicField.tsx")
