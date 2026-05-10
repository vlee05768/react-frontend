import glob

files = glob.glob('/home/hermes/git_projects/vue-front-end/src/views/**/*.vue', recursive=True)

for f in files:
    with open(f, 'r') as file:
        content = file.read()
    
    modified = False
    
    if "responsibleById" in content:
        content = content.replace("responsibleById", "responsibleEmployeeCode")
        modified = True
        
    if "responsibleByUser" in content:
        content = content.replace("responsibleByUser", "responsibleEmployee")
        modified = True
        
    if modified:
        with open(f, 'w') as file:
            file.write(content)
        print(f"Updated {f}")

