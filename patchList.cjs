const fs = require('fs');
const path = 'src/pages/basic/BusinessPartner/BusinessPartnerList.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add imports
if (!content.includes('DynamicSearchForm')) {
  content = content.replace(
    "import { DynamicForm } from '@/components/Form/DynamicForm';",
    "import { DynamicForm } from '@/components/Form/DynamicForm';\nimport DynamicSearchForm from '@/components/Form/DynamicSearchForm';\nimport DynamicSearchTags from '@/components/Form/DynamicSearchTags';"
  );
}

if (!content.includes('bpSearchFormConfig')) {
  content = content.replace(
    "import { mainFormConfig, mainTableColumns, bpTypeOptions } from './BusinessPartnerConfig';",
    "import { mainFormConfig, mainTableColumns, bpTypeOptions, bpSearchFormConfig } from './BusinessPartnerConfig';"
  );
}

// Replace renderSearchTags
const newRenderSearchTags = `
  const renderSearchTags = () => {
    return (
      <DynamicSearchTags 
        config={bpSearchFormConfig()} 
        params={params} 
        onClose={(key) => {
          setParams({ [key]: undefined, pageNumber: 1 });
        }} 
      />
    );
  };
`;

content = content.replace(/const renderSearchTags = \(\) => {[\s\S]*?return <Space.*?<\/Space>;\n  };/, newRenderSearchTags);

// Replace form in Modal
const newFormContent = `
        <DynamicSearchForm 
          config={bpSearchFormConfig()} 
          form={searchForm} 
          onSearch={handleSearch} 
        />
`;

content = content.replace(/<Form form={searchForm} layout="vertical" onFinish={handleSearch}>[\s\S]*?<\/Form>/, newFormContent);

fs.writeFileSync(path, content);
