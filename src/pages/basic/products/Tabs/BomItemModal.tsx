import { useState } from 'react';
import { Modal, message } from 'antd';
import { DynamicForm } from '@/components/Form/DynamicForm';
import { bomItemFormConfig } from '../ProductConfig';
import { createBomItem, type BomOutputType, updateBomItem } from '@/api/bomCompatibility';

interface Props {
  open: boolean;
  onClose: () => void;
  outputType: BomOutputType;
  outputCode: string;
  initialData: any;
  onSuccess: () => void | Promise<void>;
  existingMaterialCodes?: string[];
}

export default function BomItemModal({ open, onClose, outputType, outputCode, initialData, onSuccess, existingMaterialCodes = [] }: Props) {
  const [loading, setLoading] = useState(false);
  const isCreate = !initialData;

  const handleFinish = async (values: any) => {
    try {
      setLoading(true);
      const payload = {
        materialCode: values.materialCode,
        quantity: values.quantity || 0,
        scrapPercentage: values.scrapPercentage || 0,
        width: values.width || undefined,
        specification: values.specification || '',
        notes: values.notes || '',
      };

      if (isCreate) {
        await createBomItem(outputType, outputCode, payload);
        message.success('新增明細成功');
      } else {
        await updateBomItem(outputType, outputCode, initialData.code, payload);
        message.success('更新明細成功');
      }
      await onSuccess();
    } catch (error: any) {
      message.error(error?.response?.data?.message || '儲存失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={isCreate ? '新增 BOM 物料' : `編輯 BOM 明細原料設定=>${initialData?.materialCode}-(${initialData?.materialName || ''})`}
      open={open}
      onCancel={onClose}
      okButtonProps={{ form: 'bomItemForm', htmlType: 'submit' }}
      cancelButtonProps={{ onClick: onClose }}
      confirmLoading={loading}
      destroyOnHidden
      width="50vw"
    >
      <div className="pt-4">
        <DynamicForm
          formId="bomItemForm"
          fields={bomItemFormConfig(!isCreate, existingMaterialCodes)}
          defaultValues={initialData || { quantity: undefined, scrapPercentage: 0 }}
          onSubmit={handleFinish}
          hideDefaultFooter
          isUpdateMode={!isCreate}
        />
      </div>
    </Modal>
  );
}
