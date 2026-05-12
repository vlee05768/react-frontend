import os
import re

def fix_drawer_width(root_dir):
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if not file.endswith('.tsx'):
                continue
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()

            # Find all <Drawer ...> elements using regex
            drawer_pattern = re.compile(r'<Drawer([^>]*?)>', re.DOTALL)
            
            def replace_width(match):
                inner = match.group(1)
                # Replace width={xxx} with size={xxx as any}
                new_inner = re.sub(r'\bwidth={([^}]+)}', r'size={\1 as any}', inner)
                # Also replace width="xxx" with size="xxx"
                new_inner = re.sub(r'\bwidth="([^"]+)"', r'size="\1"', new_inner)
                return f'<Drawer{new_inner}>'

            new_content = drawer_pattern.sub(replace_width, content)
            
            if new_content != content:
                print(f"Fixed {path}")
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)

fix_drawer_width('/home/hermes/git_projects/erp-frontend-react/src/')
