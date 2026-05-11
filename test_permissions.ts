const workOrderFieldPermissions = {
  // basic
  workOrderDate: { create: true, update: false, work: false, prepare: false },
  customerCode: { create: true, update: false, work: false, prepare: false },
  productCode: { create: true, update: false, work: false, prepare: false },
  productName: { create: true, update: false, work: false, prepare: false },
  customerProductCode: { create: true, update: false, work: false, prepare: false },
  orderLineNumber: { create: true, update: false, work: false, prepare: false },
  orderQuantity: { create: false, update: false, work: false, prepare: false },
  plannedQuantity: { create: true, update: true, work: false, prepare: true },
  pcsPerSheet: { create: true, update: false, work: false, prepare: false },
  productSpecification: { create: true, update: false, work: false, prepare: false },
  workMethod: { create: true, update: true, work: false, prepare: false },
  notes: { create: true, update: true, work: true, prepare: true },
  
  // production
  productionDate: { create: true, update: true, work: true, prepare: true },
  projectTag: { create: true, update: false, work: false, prepare: false },
  moldsCode: { create: true, update: false, work: false, prepare: false },
  machineCode: { create: true, update: false, work: false, prepare: false },
  pitch: { create: true, update: false, work: false, prepare: false },
  punchCavities: { create: true, update: false, work: false, prepare: false },
  actualQuantity: { create: false, update: false, work: true, prepare: false },
  pcsPerPackage: { create: true, update: false, work: false, prepare: false },
  storageCode: { create: true, update: true, work: true, prepare: true },
  defectReason: { create: false, update: false, work: true, prepare: false },
}
