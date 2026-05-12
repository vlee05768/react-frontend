import re

with open('src/config/autoCompleteRegistry.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("Keyword: keyword", "EmployeeNo: keyword")
content = content.replace("Keyword: String(idOrCode)", "EmployeeNo: String(idOrCode)")
content = content.replace("value: 'employeeNo'", "value: 'employeeNo'")

with open('src/config/autoCompleteRegistry.ts', 'w', encoding='utf-8') as f:
    f.write(content)
