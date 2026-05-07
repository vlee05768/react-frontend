const fs = require('fs');
const file = 'src/components/Form/types.ts';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('autoGenerate?: boolean;')) {
  code = code.replace(
    /editable\?: DynamicProp<EditableType \| boolean, TValues>;/,
    `editable?: DynamicProp<EditableType | boolean, TValues>;\n  // 是否為系統自動產生 (若為 true，新增時不驗證必填並提示「系統自動產生」，且強制唯讀)\n  autoGenerate?: boolean;`
  );
  fs.writeFileSync(file, code);
  console.log('Patched types.ts');
} else {
  console.log('types.ts already patched');
}
