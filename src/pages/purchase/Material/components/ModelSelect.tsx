import React, { useState, useMemo } from 'react';
import { Select, Button, Space, Modal, Input, Form, message } from 'antd';
import { PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiV1GeneralTypes, postApiV1GeneralTypes } from '@/api/generated/sdk.gen';

interface ModelSelectProps {
  value?: string;
  onChange?: (val: string | undefined) => void;
  disabled?: boolean;
  brand?: string;
}

export const ModelSelect: React.FC<ModelSelectProps> = ({ value, onChange, disabled, brand }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  
  // 從 GeneralTypes 取得指定廠牌的所有型號 (Type = MaterialModel, Code2 = brand)
  const { data, isFetching } = useQuery({
    queryKey: ['materialModelList', brand],
    queryFn: () => getApiV1GeneralTypes({ query: { Type: ['MaterialModel'], Code2: brand, pageSize: -1 } as any }),
    enabled: !!brand, // 只有在有選擇廠牌時才去抓取
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
        message.success('型號新增成功');
        if (onChange) {
          onChange(variables.code);
        }
        setIsModalOpen(false);
        form.resetFields();
        queryClient.invalidateQueries({ queryKey: ['materialModelList', brand] });
      } else {
        message.error((res.data as any)?.message || '型號新增失敗');
      }
    },
    onError: (error: any) => {
      message.error(error.message || '型號新增失敗');
    }
  });

  const handleCreateSubmit = () => {
    form.validateFields().then(values => {
      const payload = {
        type: 'MaterialModel',
        code: values.code?.toUpperCase(),
        desc: values.desc,
        code2: brand,
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
          disabled={disabled || !brand}
          loading={isFetching}
          options={options}
          allowClear
          placeholder={brand ? "請選擇型號" : "請先選擇廠牌"}
          showSearch
          filterOption={(input, option) =>
            String(option?.label ?? '').toLowerCase().includes(input.toLowerCase()) ||
            String(option?.value ?? '').toLowerCase().includes(input.toLowerCase())
          }
        />
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          disabled={disabled || !brand}
          onClick={() => {
            form.resetFields();
            setIsModalOpen(true);
          }}
          title="新增型號"
        />
      </Space.Compact>

      <Modal
        title={`新增型號 (${brand || ''})`}
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
              label="型號代碼" 
              rules={[
                { required: true, message: '請輸入型號代碼' },
                { pattern: /^[A-Za-z0-9\-_]+$/, message: '型號代碼不可輸入中文，僅限英數字與符號' }
              ]}
              normalize={(val) => (val || '').toUpperCase()}
              extra="儲存時英文將自動轉大寫。"
            >
              <Input placeholder="請輸入型號代碼(英數字)" />
            </Form.Item>
            <Form.Item 
              name="desc" 
              label="型號名稱" 
            >
              <Input placeholder="請輸入型號名稱" />
            </Form.Item>
          </Form>
        </div>
      </Modal>
    </>
  );
};
