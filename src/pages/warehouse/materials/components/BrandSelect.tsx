import React, { useState, useMemo } from 'react';
import { Select, Button, Space, Modal, Input, Form, message } from 'antd';
import { PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiV1GeneralTypes, postApiV1GeneralTypes } from '@/api/generated/sdk.gen';

interface BrandSelectProps {
  value?: string;
  onChange?: (val: string | undefined) => void;
  disabled?: boolean;
}

export const BrandSelect: React.FC<BrandSelectProps> = ({ value, onChange, disabled }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  
  // 從 GeneralTypes 取得所有廠牌 (Type = MaterialBrand)
  const { data, isFetching } = useQuery({
    queryKey: ['materialBrandList'],
    queryFn: () => getApiV1GeneralTypes({ query: { Type: ['MaterialBrand'], pageSize: -1 } as any }),
    staleTime: 5 * 60 * 1000,
  });

  const listData = useMemo(() => {
    return (data?.data as any)?.data?.data || (data?.data as any)?.data || [];
  }, [data]);

  const options = useMemo(() => {
    return listData.map((item: any) => ({ 
      label: item.desc ? `${item.code} - ${item.desc}` : item.code, 
      value: item.code 
    }));
  }, [listData]);

  const createMutation = useMutation({
    mutationFn: (values: any) => postApiV1GeneralTypes({ body: values }),
    onSuccess: (res, variables) => {
      if ((res.data as any)?.success) {
        message.success('廠牌新增成功');
        if (onChange) {
          onChange(variables.code);
        }
        setIsModalOpen(false);
        form.resetFields();
        queryClient.invalidateQueries({ queryKey: ['materialBrandList'] });
      } else {
        message.error((res.data as any)?.message || '廠牌新增失敗');
      }
    },
    onError: (error: any) => {
      message.error(error.message || '廠牌新增失敗');
    }
  });

  const handleCreateSubmit = () => {
    form.validateFields().then(values => {
      const payload = {
        type: 'MaterialBrand',
        code: values.code?.toUpperCase(),
        desc: values.desc,
      };
      createMutation.mutate(payload);
    });
  };

  return (
    <>
      <Space.Compact className="w-full">
        <Select
          className="w-full"
          value={value}
          onChange={onChange}
          disabled={disabled}
          loading={isFetching}
          options={options}
          allowClear
          placeholder="請選擇廠牌"
          showSearch
          filterOption={(input, option) =>
            String(option?.label ?? '').toLowerCase().includes(input.toLowerCase()) ||
            String(option?.value ?? '').toLowerCase().includes(input.toLowerCase())
          }
        />
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          disabled={disabled}
          onClick={() => {
            form.resetFields();
            setIsModalOpen(true);
          }}
          title="新增廠牌"
        />
      </Space.Compact>

      <Modal
        title="新增廠牌"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        destroyOnHidden
        centered
        width={400}
        mask={{ closable: false }}
        footer={[
          <Button key="cancel" onClick={() => setIsModalOpen(false)} disabled={createMutation.isPending}>
            取消
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            onClick={handleCreateSubmit}
            icon={<SaveOutlined />}
            loading={createMutation.isPending}
          >
            確定
          </Button>
        ]}
      >
        <div className="pt-4">
          <Form form={form} layout="vertical">
            <Form.Item 
              name="code" 
              label="廠牌代碼" 
              rules={[
                { required: true, message: '請輸入廠牌代碼' },
                { max: 5, message: '廠牌代碼最多 5 碼' },
                { pattern: /^[A-Za-z0-9]+$/, message: '廠牌代碼僅限輸入英文字母與數字' }
              ]}
              normalize={(val) => (val || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase()}
              extra="儲存時將自動轉大寫。最多 5 碼。"
            >
              <Input placeholder="請輸入廠牌代碼(英數字)" maxLength={5} />
            </Form.Item>
            <Form.Item 
              name="desc" 
              label="廠牌名稱" 
              rules={[{ required: true, message: '請輸入廠牌名稱' }]}
            >
              <Input placeholder="請輸入中英文廠牌名稱" />
            </Form.Item>
          </Form>
        </div>
      </Modal>
    </>
  );
};
