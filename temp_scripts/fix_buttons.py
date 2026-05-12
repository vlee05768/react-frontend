import re

with open('src/pages/production/workorders/WorkOrderDrawer.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the status checks
old_status_checks = """    const isDraft = record.status === 'Draft';
    const isPrepCompleted = record.status === 'PreparationCompleted';
    const isInProduction = record.status === 'InProduction'; // Lamination Confirmed equivalent
    const isProdCompleted = record.status === 'ProductionCompleted';
    const isWarehousingCompleted = record.status === 'WarehousingCompleted';"""

new_status_checks = """    const isDraft = !record.preparationConfirmDate;
    const isPrepCompleted = !!record.preparationConfirmDate && !record.laminationConfirmDate;
    const isInProduction = !!record.laminationConfirmDate && !record.productionCompleteDate;
    const isProdCompleted = !!record.productionCompleteDate && !record.warehousingCompleteDate;
    const isWarehousingCompleted = !!record.warehousingCompleteDate;"""

content = content.replace(old_status_checks, new_status_checks)

with open('src/pages/production/workorders/WorkOrderDrawer.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
