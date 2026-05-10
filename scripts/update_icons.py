import os
import re

directory = '/home/hermes/git_projects/erp-frontend-react/src/pages'
# 我們針對包在 Button 的 icon 做替換，所以先找包含這些關鍵字的檔
icon_pattern = re.compile(r'<(EditOutlined|DeleteOutlined|EyeOutlined|PlusOutlined|LockOutlined|UnlockOutlined|SettingOutlined)\s*/>')

modified_files = 0
for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.tsx') and ('List' in file or 'Tab' in file or 'Form' in file):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()

            if icon_pattern.search(content):
                # Add import if needed
                if 'TABLE_ACTION_ICON_SIZE' not in content:
                    import_ui = "import { TABLE_ACTION_ICON_SIZE } from '@/constants/ui';\n"
                    # Put it after the last import
                    lines = content.split('\n')
                    last_import_idx = 0
                    for i, line in enumerate(lines):
                        if line.startswith('import '):
                            last_import_idx = i
                    
                    lines.insert(last_import_idx + 1, import_ui)
                    content = '\n'.join(lines)
                
                # Replace icons
                def replace_icon(match):
                    icon_name = match.group(1)
                    return f'<{icon_name} style={{{{ fontSize: TABLE_ACTION_ICON_SIZE }}}} />'

                new_content = icon_pattern.sub(replace_icon, content)
                
                if new_content != content:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Updated: {filepath}")
                    modified_files += 1

print(f"Total modified files: {modified_files}")
