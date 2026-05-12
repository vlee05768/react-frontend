import re

with open('src/components/Form/DynamicField.tsx', 'r') as f:
    content = f.read()

content = content.replace("""  const componentProps = typeof config.componentProps === 'function' ? config.componentProps(context) : { ...(config.componentProps || {}) };
  
  // 新增模式下，如果是自動產生的文字框，加上 placeholder
  if (config.autoGenerate && !isUpdateMode && resolvedComponentType === 'Input') {
    if (!componentProps.placeholder) {
      componentProps.placeholder = '系統自動產生';
    }
  }
  const resolvedLabel = typeof config.label === 'function' ? config.label(context) : config.label;
  const resolvedComponentType = typeof config.componentType === 'function' ? config.componentType(context) : config.componentType;""", 
"""  const resolvedLabel = typeof config.label === 'function' ? config.label(context) : config.label;
  const resolvedComponentType = typeof config.componentType === 'function' ? config.componentType(context) : config.componentType;

  const componentProps = typeof config.componentProps === 'function' ? config.componentProps(context) : { ...(config.componentProps || {}) };
  
  // 新增模式下，如果是自動產生的文字框，加上 placeholder
  if (config.autoGenerate && !isUpdateMode && resolvedComponentType === 'Input') {
    if (!componentProps.placeholder) {
      componentProps.placeholder = '系統自動產生';
    }
  }""")

with open('src/components/Form/DynamicField.tsx', 'w') as f:
    f.write(content)
print("Fixed DynamicField.tsx")
