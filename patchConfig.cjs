const fs = require('fs');
const path = 'src/pages/basic/BusinessPartner/BusinessPartnerConfig.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('SearchFieldConfig')) {
  content = content.replace('import type {', 'import type { SearchFieldConfig,');
}

const searchConfig = `
export const bpSearchFormConfig = (): SearchFieldConfig[] => [
  {
    name: "CodeOrName",
    label: "代碼/名稱/統編",
    componentType: "Input",
    colSpan: 24,
  },
  {
    name: "Types",
    label: "夥伴類型",
    componentType: "Select",
    componentProps: { 
      mode: 'multiple', 
      options: bpTypeOptions 
    },
    colSpan: 24,
  },
  {
    name: "IsTYCustomer",
    label: "是否為東裕客戶",
    componentType: "Select",
    componentProps: {
      options: [
        { label: "是", value: true },
        { label: "否", value: false },
      ]
    },
    colSpan: 12,
  },
  {
    name: "Others",
    label: "其他雜項",
    componentType: "Input",
    colSpan: 12,
  },
];
`;

if (!content.includes('bpSearchFormConfig')) {
  content += '\n' + searchConfig;
  fs.writeFileSync(path, content);
}
