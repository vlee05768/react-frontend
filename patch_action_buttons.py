import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    modified = False

    pattern1 = re.compile(
        r'<Button\s+type="primary"\s+style=\{\{\s*backgroundColor:\s*\'#52c41a\'\s*\}\}(.*?)>(.*?)確認\s*</Button>',
        re.DOTALL
    )
    if pattern1.search(content):
        content = pattern1.sub(r'<ActionButton intent="success"\1>\2確認</ActionButton>', content)
        modified = True

    pattern1b = re.compile(
        r'<Button([^>]*?)style=\{\{\s*backgroundColor:\s*\'#52c41a\'\s*\}\}(.*?)>(.*?)</Button>',
        re.DOTALL
    )
    while pattern1b.search(content):
        content = pattern1b.sub(r'<ActionButton intent="success"\1\2>\3</ActionButton>', content)
        modified = True

    pattern2 = re.compile(
        r'<Button\s+([^>]*?)(icon=\{<SyncOutlined\s*/>\})([^>]*?)>(.*?)取消確認\s*</Button>',
        re.DOTALL
    )
    while pattern2.search(content):
        content = pattern2.sub(r'<ActionButton intent="warning" \1\2\3>\4取消確認</ActionButton>', content)
        modified = True

    if modified:
        if 'ActionButton' not in content:
            import_stmt = "import { ActionButton } from '@/components/common/ActionButton';\n"
            imports = list(re.finditer(r'^import\s+.*?;?$', content, re.MULTILINE))
            if imports:
                last_import = imports[-1]
                idx = last_import.end()
                content = content[:idx] + '\n' + import_stmt + content[idx:]
            else:
                content = import_stmt + content

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx'):
            process_file(os.path.join(root, file))
