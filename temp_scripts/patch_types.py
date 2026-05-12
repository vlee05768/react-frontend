import re

with open('src/components/Form/types.ts', 'r') as f:
    content = f.read()

if 'autoGenerate?: boolean;' not in content:
    content = re.sub(
        r'editable\?: DynamicProp<EditableType \| boolean, TValues>;',
        'editable?: DynamicProp<EditableType | boolean, TValues>;\n  // 是否為系統自動產生 (若為 true，新增時不驗證必填並提示「系統自動產生」，且強制唯讀)\n  autoGenerate?: boolean;',
        content
    )
    with open('src/components/Form/types.ts', 'w') as f:
        f.write(content)
    print("Patched types.ts")
else:
    print("Already patched types.ts")
