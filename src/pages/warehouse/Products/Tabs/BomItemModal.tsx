import { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, message, Row, Col } from 'antd';
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
        form.setFieldsValue({ quantity: undefined, scrapPercentage: 0 });
      }
    }
  }, [open, initialData, form]);

  const handleMaterialChange = (_val: any, opt: any) => {
    if (opt?.raw) {
      form.setFieldsValue({
        materialName: opt.raw.name,
        width: opt.raw.width || undefined
      });
    } else {
      form.setFieldsValue({
        materialName: '',
        width: undefined
      });
    }
  };

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
      onOk={() => form.submit()}
      confirmLoading={loading}
      destroyOnClose
      width={700}
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="materialCode" label="原料編號" rules={[{ required: true, message: '請選擇原料' }]}>
              <MaterialSelect onChange={handleMaterialChange} disabled={!isCreate} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="materialName" label="原料名稱">
              <Input disabled placeholder={isCreate ? '自動帶入' : ''} />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item name="quantity" label="需求用量" rules={[{ required: true, message: '請輸入需求用量' }]}>
              <InputNumber className="w-full" min={0} precision={4} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="scrapPercentage" label="預計損耗率 (%)">
              <InputNumber className="w-full" min={0} max={100} precision={2} />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item name="width" label="幅寬 (mm)">
              <InputNumber className="w-full" min={0} precision={2} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="specification" label="規格">
              <Input />
            </Form.Item>
          </Col>

          <Col span={24}>
            <Form.Item name="notes" label="備註">
              <Input.TextArea rows={3} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}