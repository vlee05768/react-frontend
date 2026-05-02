with open('/home/hermes/git_projects/erp-frontend-react/generate_crud_v2.py', 'r') as f:
    content = f.read()

# Fix I18N_MAP: change 'name': '姓名' back to 'name': '名稱', and add explicit logic to 't' function.
old_i18n = "'name': '姓名',"
new_i18n = "'name': '名稱',"
content = content.replace(old_i18n, new_i18n)

old_t = """def t(c):
    return I18N_MAP.get(c, c)"""
new_t = """def t(c, is_employee=False):
    if is_employee and c == 'name':
        return '姓名'
    return I18N_MAP.get(c, c)"""
content = content.replace(old_t, new_t)

# Fix make_col, make_search, make_desc, make_form to accept is_employee
old_make_col = "def make_col(c):"
new_make_col = "def make_col(c, is_employee=False):"
content = content.replace(old_make_col, new_make_col)

old_make_search = "def make_search(c):"
new_make_search = "def make_search(c, is_employee=False):"
content = content.replace(old_make_search, new_make_search)

old_make_desc = "def make_desc(c):"
new_make_desc = "def make_desc(c, is_employee=False):"
content = content.replace(old_make_desc, new_make_desc)

old_make_form = "def make_form(c):"
new_make_form = "def make_form(c, is_employee=False):"
content = content.replace(old_make_form, new_make_form)

# Replace t(c) with t(c, is_employee) inside these functions
content = content.replace("t(c)", "t(c, is_employee)")

# Update build function to pass is_employee
old_build = """def build(e):
    cols_str = "\\n".join(make_col(c) for c in e["cols"])
    search_str = "\\n".join(make_search(c) for c in e["search"])
    desc_str = "\\n".join(make_desc(c) for c in e["fields"])
    form_str = "\\n".join(make_form(c) for c in e["fields"])"""
new_build = """def build(e):
    is_emp = e["Entity"] == "Employee"
    cols_str = "\\n".join(make_col(c, is_emp) for c in e["cols"])
    search_str = "\\n".join(make_search(c, is_emp) for c in e["search"])
    desc_str = "\\n".join(make_desc(c, is_emp) for c in e["fields"])
    form_str = "\\n".join(make_form(c, is_emp) for c in e["fields"])"""
content = content.replace(old_build, new_build)

with open('/home/hermes/git_projects/erp-frontend-react/generate_crud_v2.py', 'w') as f:
    f.write(content)
