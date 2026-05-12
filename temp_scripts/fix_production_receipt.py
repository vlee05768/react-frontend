import re

with open('/home/hermes/git_projects/erp-frontend-react/src/pages/quality/productionreceipt/ProductionReceiptDrawer.tsx', 'r') as f:
    content = f.read()

# Add isCreating and isEditing
content = content.replace(
    'const isVisible = !!id;',
    "const isCreating = id === 'create';\n  const [isEditing, setIsEditing] = useState(isCreating);\n  const isVisible = !!id;"
)

content = content.replace(
    'isCreateMode={false}\n          isEditMode={false}',
    'isCreateMode={isCreating}\n          isEditMode={isEditing}'
)

# Add createMutation and updateMutation
mutation_str = """
  const createMutation = useMutation({
    mutationFn: (body: any) => postApiV1ProductionReceipt({ body }),
    onSuccess: (res) => {
      message.success('新增成功');
      queryClient.invalidateQueries({ queryKey: ['productionReceipts'] });
      const newId = (res.data?.data as any)?.documentNumber || (res.data as any)?.documentNumber;
      navigate(`/production-quality/production-receipts/${newId}`, { replace: true });
    },
    onError: (err) => message.error(err.response?.data?.message || '新增失敗'),
  });

  const updateMutation = useMutation({
    mutationFn: (body: any) => putApiV1ProductionReceiptByMovementNumber({ path: { movementNumber: id! }, body }),
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries({ queryKey: ['productionReceipt'] });
      queryClient.invalidateQueries({ queryKey: ['productionReceipts'] });
      setIsEditing(false);
    },
    onError: (err) => message.error(err.response?.data?.message || '更新失敗'),
  });

  const handleFinish = (values: any) => {
    const payload = {
      documentDate: values.documentDate ? values.documentDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
      workOrderNumber: values.workOrderNumber,
      notes: values.notes || null,
      responsibleEmployeeCode: values.responsibleEmployeeCode || null,
    };

    if (isCreating) {
      createMutation.mutate(payload);
    } else {
      updateMutation.mutate(payload);
    }
  };

  const handleClose = () => {
    navigate('/production-quality/production-receipts');
  };
"""

content = content.replace(
    'const confirmMutation = useMutation({',
    mutation_str + '\n  const confirmMutation = useMutation({'
)

# Replace getActionBarActions
action_bar_actions = """
  const getActionBarActions = () => {
    if (isCreating || isEditing) {
      return (
        <Space>
          <Button key="save" type="primary" htmlType="submit" form="production-receipt-form" loading={createMutation.isPending || updateMutation.isPending}>
            儲存主檔
          </Button>
          <Button key="cancel" onClick={(e) => {
            e.preventDefault();
            isCreating ? handleClose() : setIsEditing(false)
          }}>
            取消
          </Button>
        </Space>
      );
    }
    
    if (!formData) return null;
    const isViewMode = !isEditing;
    const isConfirmed = formData.status === 'Confirmed' || formData.status === 'Closed';
    
    return (
      <Space>
        {isViewMode && !isConfirmed && (
          <Button key="edit" type="primary" onClick={(e) => { e.preventDefault(); setIsEditing(true); }}>
            編輯主檔
          </Button>
        )}
      </Space>
    );
  };
"""

content = re.sub(r'const getActionBarActions = \(\) => \{\n\s*return null;\n\s*\};', action_bar_actions, content)

# update DynamicForm props
content = content.replace(
    'isViewMode={false}\n              isUpdateMode={false}',
    'isViewMode={!isEditing || (formData?.status === "Confirmed" || formData?.status === "Closed")}\n              isUpdateMode={isEditing && !isCreating}\n              onSubmit={handleFinish}\n              hideDefaultFooter'
)

# Fix API imports
content = content.replace(
    'getApiV1ProductionReceiptByMovementNumber,',
    'getApiV1ProductionReceiptByMovementNumber,\n  postApiV1ProductionReceipt,\n  putApiV1ProductionReceiptByMovementNumber,'
)

with open('/home/hermes/git_projects/erp-frontend-react/src/pages/quality/productionreceipt/ProductionReceiptDrawer.tsx', 'w') as f:
    f.write(content)
