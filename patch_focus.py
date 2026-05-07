import re

with open('src/components/Form/DynamicForm.tsx', 'r') as f:
    content = f.read()

# Add ref definition
ref_target = """  const schemaRef = useRef<z.ZodTypeAny>(z.object({}));"""
ref_replace = """  const formWrapperRef = useRef<HTMLDivElement>(null);
  const schemaRef = useRef<z.ZodTypeAny>(z.object({}));"""

if 'const formWrapperRef = useRef<HTMLDivElement>(null);' not in content:
    content = content.replace(ref_target, ref_replace)

# Add useEffect for auto-focus
focus_effect = """
  // 處理自動 Focus (所有 form 在編輯或新增模式時, 一出現當下應該把 focus 停留在第一個可以輸入的元件)
  useEffect(() => {
    if (!isViewMode) {
      // 延遲 300ms 等待 Ant Design 的 Drawer/Modal 動畫完成
      const timer = setTimeout(() => {
        if (formWrapperRef.current) {
          // 找出第一個可以輸入且沒有被 disabled/readonly 的元素
          const focusableElements = formWrapperRef.current.querySelectorAll(
            'input:not([disabled]):not([readonly]):not([type="hidden"]), textarea:not([disabled]):not([readonly])'
          );
          
          for (let i = 0; i < focusableElements.length; i++) {
            const el = focusableElements[i] as HTMLElement;
            // 確保元素是可見的
            if (el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0) {
              el.focus();
              break;
            }
          }
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isViewMode, defaultValues]); // 當進入編輯/新增模式，或是非同步載入資料完成時觸發
"""

# Insert before 'return'
return_target = """  // 判斷是否要啟用群組樣式 (卡片與標題)"""
return_replace = focus_effect + "\n" + return_target

if '// 處理自動 Focus' not in content:
    content = content.replace(return_target, return_replace)

# Add ref to Form
form_target = """<Form layout="vertical" onFinish={handleSubmit(onSubmit)} id={formId} disabled={isViewMode} className={isViewMode ? 'view-mode-form' : ''}>"""
form_replace = """<div ref={formWrapperRef} className="dynamic-form-wrapper">
      <Form layout="vertical" onFinish={handleSubmit(onSubmit)} id={formId} disabled={isViewMode} className={isViewMode ? 'view-mode-form' : ''}>"""

if '<div ref={formWrapperRef} className="dynamic-form-wrapper">' not in content:
    content = content.replace(form_target, form_replace)
    
    # Close the div at the end
    end_target = """    </Form>
  );"""
    end_replace = """    </Form>
    </div>
  );"""
    content = content.replace(end_target, end_replace)

with open('src/components/Form/DynamicForm.tsx', 'w') as f:
    f.write(content)
print("Patched DynamicForm.tsx for auto-focus")
