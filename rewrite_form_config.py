import re

file_path = "src/pages/production/workorders/WorkOrderConfig.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix the broken ones. I'll just restore the whole file from before and apply cleaner regex.
