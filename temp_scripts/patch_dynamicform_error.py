import re

with open('/home/hermes/git_projects/erp-frontend-react/src/components/Form/DynamicForm.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'const handleInternalError = (errors: any) => {',
    'const handleInternalError = (errors: any) => {\n    console.error("DynamicForm validation errors:", errors);'
)

with open('/home/hermes/git_projects/erp-frontend-react/src/components/Form/DynamicForm.tsx', 'w') as f:
    f.write(content)
