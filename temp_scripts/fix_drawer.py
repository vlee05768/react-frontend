import re

with open('src/pages/sales/orders/OrderDrawer.tsx', 'r') as f:
    content = f.read()

# remove locationState
content = content.replace("const locationState = window.history.state; // We'll just rely on the effect for 'items' if empty\n  ", "")

# move isViewMode up
view_mode_code = "const isViewMode = !isEditing && !isCreating && !isDetailEditing;"
content = content.replace("  const isViewMode = !isEditing && !isCreating && !isDetailEditing;\n", "")

content = content.replace("const hasAutoSwitchedRef = useRef(false);", view_mode_code + "\n  const hasAutoSwitchedRef = useRef(false);")

with open('src/pages/sales/orders/OrderDrawer.tsx', 'w') as f:
    f.write(content)
