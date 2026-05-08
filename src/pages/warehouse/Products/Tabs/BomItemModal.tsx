import { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, message } from 'antd';
import { postApiV1BomByProductCodeItems, putApiV1BomByProductCodeItemsByCode } from '@/api/generated/sdk.gen';
import { MaterialSelect } from '@/components/Form/MaterialSelect';

interface Props {
  open: boolean;
  onClose: () => void;
  productCode: string;
  initialData: any;
  onSuccess: () => void;
}

export default function BomItemModal({ open, onClose, productCode, initialData, onSuccess }: Props) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const isCreate = !initialData;

  useEffect(() => {
    if (open) {
      if (initialData) {
        form.setFieldsValue(initialData);
      } else {
        form.resetFields();
        form.setFieldsValue({ quantity: 1, scrapRate: 0 });
      }
    }
  }, [open, initialData, form]);

  const handleFinish = async (values: any) => {
    try {
      setLoading(true);
      if (isCreate) {
        await postApiV1BomByProductCodeItems({
          path: { productCode },
          body: { ...values, productCode }
        });
        message.success('新增明細成功');
      } else {
        await putApiV1BomByProductCodeItemsByCode({
          path: { productCode, code: initialData.code },
          body: values
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
      onOk={() => form.submit()}
      confirmLoading={loading}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item name="materialCode" label="原料" rules={[{ required: true, message: '請選擇原料' }]}>
          <MaterialSelect />
        </Form.Item>
        <Form.Item name="quantity" label="需求用量" rules={[{ required: true }]}>
          <InputNumber className="w-full" min={0.0001} step={1} />
        </Form.Item>
        <Form.Item name="scrapRate" label="損耗率 (%)">
          <InputNumber className="w-full" min={0} max={100} step={1} />
        </Form.Item>
        <Form.Item name="notes" label="備註">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
