import re
import sys
import glob

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the Drawer section
    drawer_pattern = re.compile(
        r'(open=\{!!viewId \|\| isCreateDrawerOpen\}\s*\n)\s*extra=\{(.*?)\}\n\s*footer=\{(.*?)\n\s*\}\n\s*>',
        re.DOTALL
    )
    
    match = drawer_pattern.search(content)
    if not match:
        print(f"Skipped {filepath}: Pattern not found")
        return False

    prefix = match.group(1)
    extra_content = match.group(2)
    footer_content = match.group(3)

    # Extract the condition for extra
    # e.g. (!isDrawerEditing && !isCreateDrawerOpen && hasPermission('BasicData.Employees.Update'))
    cond_match = re.search(r'\((!isDrawerEditing && !isCreateDrawerOpen.*?)\) &&', extra_content)
    if cond_match:
        edit_cond = cond_match.group(1)
    else:
        edit_cond = "!isDrawerEditing && !isCreateDrawerOpen"
        print(f"Warning: Could not extract edit condition in {filepath}")

    # Extract form ID
    form_id_match = re.search(r'form="([^"]+)"', footer_content)
    form_id = form_id_match.group(1) if form_id_match else "crud-form"

    # Extract loading condition
    loading_match = re.search(r'loading=\{([^}]+)\}', footer_content)
    loading_expr = loading_match.group(1) if loading_match else "isCreateDrawerOpen ? createMutation.isPending : updateMutation.isPending"

    new_block = f"""{prefix}        extra={{
          <Space>
            {{({edit_cond}) && (
              <Button type="primary" icon={{<EditOutlined />}} onClick={{startEditMode}}>編輯</Button>
            )}}
            {{(isDrawerEditing || isCreateDrawerOpen) && (
              <>
                <Button onClick={{handleCancel}}>取消</Button>
                <Button 
                  type="primary" 
                  htmlType="submit"
                  form="{form_id}"
                  icon={{<SaveOutlined />}} 
                  loading={{{loading_expr}}}
                >
                  儲存
                </Button>
              </>
            )}}
          </Space>
        }}
      >"""

    new_content = content[:match.start()] + new_block + content[match.end():]
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"Successfully updated {filepath}")
    return True

files = [
    'src/pages/warehouse/StorageList.tsx',
    'src/pages/system/UserList.tsx',
    'src/pages/system/RoleList.tsx',
    'src/pages/production/MoldList.tsx',
    'src/pages/production/MachineList.tsx',
    'src/pages/basic/Employee.tsx'
]

for f in files:
    process_file(f)

