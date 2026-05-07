with open('/home/hermes/git_projects/erp-frontend-react/src/pages/auth/Login.tsx', 'r') as f:
    content = f.read()

content = content.replace('onClick={(e) => { /* 交給 onFinish 處理 */ }} ', '')

with open('/home/hermes/git_projects/erp-frontend-react/src/pages/auth/Login.tsx', 'w') as f:
    f.write(content)
