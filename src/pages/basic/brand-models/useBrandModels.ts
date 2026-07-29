import { useState, useEffect } from 'react';
import { Form, message, Modal } from 'antd';
import { useAuthStore } from '@/stores/useAuthStore';
import { 
  getApiV1GeneralTypes, 
  deleteApiV1GeneralTypesById, 
  putApiV1GeneralTypesById, 
  postApiV1GeneralTypes 
} from '@/api/generated';

export function useBrandModels() {
  const [brands, setBrands] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<any | null>(null);
  
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  
  const [brandSearch, setBrandSearch] = useState('');
  const [modelSearch, setModelSearch] = useState('');

  // Modals state
  const [brandModalVisible, setBrandModalVisible] = useState(false);
  const [modelModalVisible, setModelModalVisible] = useState(false);
  const [editingBrand, setEditingBrand] = useState<any | null>(null);
  const [editingModel, setEditingModel] = useState<any | null>(null);

  const [brandForm] = Form.useForm();
  const [modelForm] = Form.useForm();

  const { hasPermission } = useAuthStore();
  const canCreate = hasPermission('BasicData.BrandModels.Create');
  const canUpdate = hasPermission('BasicData.BrandModels.Update');
  const canDelete = hasPermission('BasicData.BrandModels.Delete');

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    if (selectedBrand) {
      fetchModels(selectedBrand.code);
    } else {
      setModels([]);
    }
  }, [selectedBrand]);

  const fetchBrands = async () => {
    setLoadingBrands(true);
    try {
      const res = await getApiV1GeneralTypes({
        query: {
          Type: ['MaterialBrand'],
          Code: brandSearch || undefined,
          pageSize: -1, 
        }
      });
      if ((res.data as any)?.success) {
        setBrands((res.data?.data as any)?.data || []);
        // 若當前選擇的廠牌已被刪除，則清除選擇
        if (selectedBrand && !(res.data?.data as any)?.data?.find((b: any) => b.code === selectedBrand.code)) {
          setSelectedBrand(null);
        }
      } else {
        message.error((res.data as any)?.message || '載入廠牌失敗');
      }
    } catch (error: any) {
      message.error(error.message || '載入廠牌失敗');
    } finally {
      setLoadingBrands(false);
    }
  };

  const fetchModels = async (brandCode: string) => {
    setLoadingModels(true);
    try {
      const res = await getApiV1GeneralTypes({
        query: {
          Type: ['MaterialModel'],
          Code2: brandCode, 
          Code: modelSearch || undefined,
          pageSize: -1,
        }
      });
      if ((res.data as any)?.success) {
        setModels((res.data?.data as any)?.data || []);
      } else {
        message.error((res.data as any)?.message || '載入型號失敗');
      }
    } catch (error: any) {
      message.error(error.message || '載入型號失敗');
    } finally {
      setLoadingModels(false);
    }
  };

  // --- Brand Actions ---
  const handleAddBrand = () => {
    setEditingBrand(null);
    brandForm.resetFields();
    setBrandModalVisible(true);
  };

  const handleEditBrand = (e: React.MouseEvent, record: any) => {
    e.stopPropagation(); 
    setEditingBrand(record);
    brandForm.setFieldsValue({
      code: record.code,
      desc: record.desc,
    });
    setBrandModalVisible(true);
  };

  const handleDeleteBrand = (e: React.MouseEvent, record: any) => {
    e.stopPropagation();
    Modal.confirm({
      title: '確定要刪除廠牌嗎？',
      content: `您確定要刪除「${record.desc || record.code}」嗎？若該廠牌下還有綁定型號則無法刪除。`,
      okText: '刪除',
      okType: 'danger',
      cancelText: '取消',
      async onOk() {
        try {
          // 檢查該廠牌下是否仍有型號
          const checkRes = await getApiV1GeneralTypes({
             query: {
               Type: ['MaterialModel'],
               Code2: record.code,
               pageSize: 1
             }
          });
          if ((checkRes.data as any)?.data?.data && (checkRes.data as any)?.data?.data.length > 0) {
             message.error('此廠牌下仍有綁定型號，請先清空型號後再刪除。');
             return;
          }

          const res = await deleteApiV1GeneralTypesById({ path: { id: record.id } });
          // 💡 後端 DELETE 成功預設回傳 204 (No Content)，此時 res.data 為 null，需同時判斷狀態碼
          if (res.status === 204 || (res.data as any)?.success) {
            message.success('廠牌刪除成功');
            if (selectedBrand?.id === record.id) setSelectedBrand(null);
            fetchBrands();
          } else {
            message.error((res.data as any)?.message || '廠牌刪除失敗');
          }
        } catch (error: any) {
          message.error(error.message || '廠牌刪除失敗');
        }
      },
    });
  };

  const onBrandModalOk = async () => {
    try {
      const values = await brandForm.validateFields();
      
      const payload = {
        type: 'MaterialBrand',
        code: values.code?.toUpperCase(),
        desc: values.desc,
      };

      if (editingBrand) {
        const res = await putApiV1GeneralTypesById({
          path: { id: editingBrand.id },
          body: payload
        });
        if ((res.data as any)?.success) {
          message.success('廠牌更新成功');
          setBrandModalVisible(false);
          fetchBrands();
          if (selectedBrand?.id === editingBrand.id) {
             setSelectedBrand({ ...selectedBrand, ...payload });
          }
        } else {
          message.error((res.data as any)?.message || '廠牌更新失敗');
        }
      } else {
        const res = await postApiV1GeneralTypes({
          body: payload
        });
        if ((res.data as any)?.success) {
          message.success('廠牌新增成功');
          setBrandModalVisible(false);
          fetchBrands();
        } else {
          message.error((res.data as any)?.message || '廠牌新增失敗');
        }
      }
    } catch (error: any) {
      console.error(error);
    }
  };

  // --- Model Actions ---
  const handleAddModel = () => {
    if (!selectedBrand) {
      message.warning('請先選擇左側廠牌');
      return;
    }
    setEditingModel(null);
    modelForm.resetFields();
    setModelModalVisible(true);
  };

  const handleEditModel = (e: React.MouseEvent, record: any) => {
    e.stopPropagation();
    setEditingModel(record);
    modelForm.setFieldsValue({
      code: record.code,
      desc: record.desc,
    });
    setModelModalVisible(true);
  };

  const handleDeleteModel = (e: React.MouseEvent, record: any) => {
    e.stopPropagation();
    Modal.confirm({
      title: '確定要刪除型號嗎？',
      content: `您確定要刪除「${record.code}」嗎？`,
      okText: '刪除',
      okType: 'danger',
      cancelText: '取消',
      async onOk() {
        try {
          const res = await deleteApiV1GeneralTypesById({ path: { id: record.id } });
          // 💡 後端 DELETE 成功預設回傳 204 (No Content)，此時 res.data 為 null，需同時判斷狀態碼
          if (res.status === 204 || (res.data as any)?.success) {
            message.success('型號刪除成功');
            fetchModels(selectedBrand.code);
          } else {
            message.error((res.data as any)?.message || '型號刪除失敗');
          }
        } catch (error: any) {
          message.error(error.message || '型號刪除失敗');
        }
      },
    });
  };

  const onModelModalOk = async () => {
    try {
      const values = await modelForm.validateFields();
      
      const payload = {
        type: 'MaterialModel',
        code: values.code?.toUpperCase(),
        desc: values.desc,
        code2: selectedBrand.code 
      };

      if (editingModel) {
        const res = await putApiV1GeneralTypesById({
          path: { id: editingModel.id },
          body: payload
        });
        if ((res.data as any)?.success) {
          message.success('型號更新成功');
          setModelModalVisible(false);
          fetchModels(selectedBrand.code);
        } else {
          message.error((res.data as any)?.message || '型號更新失敗');
        }
      } else {
        const res = await postApiV1GeneralTypes({
          body: payload
        });
        if ((res.data as any)?.success) {
          message.success('型號新增成功');
          setModelModalVisible(false);
          fetchModels(selectedBrand.code);
        } else {
          message.error((res.data as any)?.message || '型號新增失敗');
        }
      }
    } catch (error: any) {
      console.error(error);
    }
  };

  return {
    brands,
    models,
    selectedBrand,
    setSelectedBrand,
    loadingBrands,
    loadingModels,
    brandSearch,
    setBrandSearch,
    modelSearch,
    setModelSearch,
    brandModalVisible,
    setBrandModalVisible,
    modelModalVisible,
    setModelModalVisible,
    editingBrand,
    editingModel,
    brandForm,
    modelForm,
    canCreate,
    canUpdate,
    canDelete,
    fetchBrands,
    fetchModels,
    handleAddBrand,
    handleEditBrand,
    handleDeleteBrand,
    onBrandModalOk,
    handleAddModel,
    handleEditModel,
    handleDeleteModel,
    onModelModalOk
  };
}