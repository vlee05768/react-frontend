import { useState } from 'react';
import { Modal, message } from 'antd';
import { postApiV1BomByProductCodeItems, putApiV1BomByProductCodeItemsByCode } from '@/api/generated/sdk.gen';
import { DynamicForm } from '@/components/Form/DynamicForm';
import { bomItemFormConfig } from '../ProductConfig';

interface Props {
  open: boolean;
  onClose: () => void;
  productCode: string;
  initialData: any;
  onSuccess: () => void;
}

export default function BomItemModal({ open, onClose, productCode, initialData, onSuccess }: Props) {
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
        notes: values.notes || ''
      };

      if (isCreate) {
        await postApiV1BomByProductCodeItems({
          path: { productCode },
          body: { ...payload, productCode } as any
        });
        message.success('新增明細成功');
      } else {
        await putApiV1BomByProductCodeItemsByCode({
          path: { productCode, code: initialData.code },
          body: payload
        });
        message.success('更新明細成功');
      }
      onSuccess();
    } catch (e: any) {
      message.error(e?.response?.data?.message || '儲存失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={isCreate ? '新增 BOM 物料' : '編輯 BOM 物料'}
      open={open}
      onCancel={onClose}
      okButtonProps={{ form: 'bomItemForm', htmlType: 'submit' }}
      cancelButtonProps={{ onClick: onClose }}
      confirmLoading={loading}
      destroyOnClose
      width={700}
    >
      <div className="pt-4">
        <DynamicForm
          formId="bomItemForm"
          fields={bomItemFormConfig()}
          defaultValues={initialData || { quantity: undefined, scrapPercentage: 0 }}
          onSubmit={handleFinish}
          hideDefaultFooter={true}
          isUpdateMode={!isCreate}
        />
      </div>
    </Modal>
  );
}