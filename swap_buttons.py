import os
import re
import glob

def swap_buttons_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # <Button ...>取消</Button>
    # <Button ...>
    #   儲存
    # </Button>
    
    # We will search for <Button...>取消</Button> and the following <Button...>...</Button> block.
    # Group 1: Cancel Button
    # Group 2: Whitespace
    # Group 3: Save Button (everything up to </Button>)
    
    pattern = re.compile(
        r'(<Button\s+onClick=\{[^}]*\}>\s*取消\s*</Button>)\s*(\n\s*)(<Button\s+type="primary"\s+htmlType="submit".*?>\s*儲存\s*</Button>)',
        re.DOTALL
    )
    
    def replacer(match):
        cancel_btn = match.group(1)
        whitespace = match.group(2)
        save_btn = match.group(3)
        return save_btn + whitespace + cancel_btn

    new_content, count = pattern.subn(replacer, content)
    
    if count > 0:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Swapped buttons in {filepath} ({count} occurrences)")
        return True
    return False

files = glob.glob('src/pages/**/*.tsx', recursive=True)
count = 0
for f in files:
    if swap_buttons_in_file(f):
        count += 1

print(f"Total files updated: {count}")
