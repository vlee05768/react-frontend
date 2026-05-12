import re

with open('src/config/autoCompleteRegistry.ts', 'r', encoding='utf-8') as f:
    content = f.read()

new_employee = """
  // 員工 (Employee)
  EMPLOYEE: {
    queryFn: async (keyword: string) => {
      const { getApiV1Employee } = await import('@/api/generated/sdk.gen');
      const res = await getApiV1Employee({
        query: {
          Keyword: keyword || undefined,
          pageSize: 100
        } as any
      });
      return (res.data as any)?.data?.data || (res.data as any)?.data || [];
    },
    fetchByValue: async (idOrCode: any) => {
      // Because employee uses ID for fetch but we need employeeNo for value
      // Just fallback to listing if fetchByValue by employeeNo is needed
      const { getApiV1Employee } = await import('@/api/generated/sdk.gen');
      const res = await getApiV1Employee({
        query: {
          Keyword: String(idOrCode),
          pageSize: 10
        } as any
      });
      const list = (res.data as any)?.data?.data || (res.data as any)?.data || [];
      return list.find((e: any) => e.employeeNo === idOrCode || e.employeeCode === idOrCode);
    },
    fieldNames: {
      label: (item: any) => `${item.name || ''} (${item.employeeNo || item.employeeCode || ''})`,
      value: 'employeeNo'
    },
    triggerLength: 0
  },
"""

content = content.replace("  // (未來可擴充其他如: VENDOR, MATERIAL, PRODUCT 等)", new_employee + "  // (未來可擴充其他如: VENDOR, MATERIAL, PRODUCT 等)")

with open('src/config/autoCompleteRegistry.ts', 'w', encoding='utf-8') as f:
    f.write(content)
