import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Select, Button, Space, Modal, App } from 'antd';
import { PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getApiV1BusinessPartnersByBusinessPartnerCodeContacts,
  postApiV1BusinessPartnersByBusinessPartnerCodeContacts,
  getApiV1CustomersByCode
} from '@/api/generated/sdk.gen';
import { DynamicForm } from '@/components/Form/DynamicForm';
import { contactFormConfig } from '@/pages/basic/BusinessPartner/ContactConfig';
import { getApiErrorMessage } from '@/utils/apiError';

interface ContactSelectWithCreateProps {
  value?: number;
  onChange?: (val: number | undefined) => void;
  disabled?: boolean;
  businessPartnerCode?: string;
}

export const ContactSelectWithCreate: React.FC<ContactSelectWithCreateProps> = ({
  value,
  onChange,
  disabled,
  businessPartnerCode
}) => {
  const { message: messageApi, modal: modalApi } = App.useApp();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 1. 判斷傳入的代碼是否是 C 開頭的客戶代碼
  const isCustomerCode = businessPartnerCode?.startsWith('C');

  // 2. 如果是 C 開頭的客戶代碼，則載入對應客戶的詳細資料以取得真正的商業夥伴代碼 (BP開頭)
  const { data: customerData, isFetching: isFetchingCustomer } = useQuery({
    queryKey: ['customerByCodeForContactSelect', businessPartnerCode],
    queryFn: () => getApiV1CustomersByCode({ path: { code: businessPartnerCode! } }),
    enabled: !!businessPartnerCode && isCustomerCode,
    staleTime: 5 * 60 * 1000, // 快取 5 分鐘
  });

  // 3. 取得實際要傳給 API 的商業夥伴代碼
  const resolvedBpCode = useMemo(() => {
    if (!businessPartnerCode) return undefined;
    if (isCustomerCode) {
      const custInfo = (customerData?.data as any)?.data || (customerData?.data as any);
      return custInfo?.businessPartnerCode || undefined;
    }
    return businessPartnerCode; // 原本即為 BP 或是其他代碼，直接套用
  }, [businessPartnerCode, isCustomerCode, customerData]);

  // 取得該客戶的聯絡人清單
  const { data, isFetching: isFetchingContacts } = useQuery({
    queryKey: ['partnerContactList', resolvedBpCode, 'purchasing'],
    queryFn: () => getApiV1BusinessPartnersByBusinessPartnerCodeContacts({
      path: { businessPartnerCode: resolvedBpCode! },
      query: { pageSize: -1, IsPurchasingContact: true } as any // 鎖定採購聯絡人
    }),
    enabled: !!resolvedBpCode,
  });

  const isFetching = isFetchingContacts || (isCustomerCode && isFetchingCustomer);

  const listData = useMemo(() => {
    return (data?.data as any)?.data?.data || (data?.data as any)?.data || [];
  }, [data]);

  const options = listData.map((contact: any) => ({
    label: `${contact.name} ${contact.jobTitle ? `(${contact.jobTitle})` : ''}`,
    value: contact.id
  }));

  // 記錄前一次執行過自動回填的客戶代碼
  const lastAutoFillBpCodeRef = useRef<string | undefined>(resolvedBpCode);

  // 自動選取邏輯：如果該客戶只有一筆聯絡人，且目前尚未選取，則自動填入
  useEffect(() => {
    // 只有在「切換/載入新客戶」且 API 抓取完成的當下，才嘗試判斷並回填
    if (!isFetching && resolvedBpCode && lastAutoFillBpCodeRef.current !== resolvedBpCode) {
      lastAutoFillBpCodeRef.current = resolvedBpCode;
      if (listData.length === 1 && !value && onChange) {
        onChange(listData[0].id);
      }
    }
  }, [resolvedBpCode, listData, isFetching, value, onChange]);

  // 新增聯絡人
  const createMutation = useMutation({
    mutationFn: (values: any) => postApiV1BusinessPartnersByBusinessPartnerCodeContacts({ 
      path: { businessPartnerCode: resolvedBpCode! }, 
      body: values 
    }),
    onSuccess: (res) => {
      messageApi.success('聯絡人新增成功');
      setIsModalOpen(false);
      
      // 嘗試從回傳值抓取新增的 ID，以自動選取
      const newId = (res?.data as any)?.data?.id || (res?.data as any)?.id;
      if (newId && onChange) {
        onChange(newId);
      }
      
      queryClient.invalidateQueries({ queryKey: ['partnerContactList', resolvedBpCode, 'purchasing'] });
    },
    onError: (error: any) => {
      modalApi.error({ centered: true, title: '錯誤提示', content: `新增失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const handleCreateSubmit = (values: any) => {
    createMutation.mutate({
      ...values,
      isPurchasingContact: true, // 自動將新增人員視為採購
    });
  };

  const hasNoContacts = !!resolvedBpCode && !isFetching && options.length === 0;

  return (
    <>
      <Space.Compact className="w-full">
        <Select
          className="w-full"
          value={value}
          onChange={onChange}
          disabled={disabled || !resolvedBpCode}
          loading={isFetching}
          options={options}
          allowClear
          placeholder={hasNoContacts ? "沒有任何聯絡人，請新增聯絡人" : "請選擇聯絡人"}
          notFoundContent={hasNoContacts ? "沒有任何聯絡人" : undefined}
          showSearch
          filterOption={(input, option) =>
            String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
        />
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          disabled={disabled || !resolvedBpCode || !!value}
          onClick={() => setIsModalOpen(true)}
          title="新增聯絡人"
        />
      </Space.Compact>

      <Modal
        title={`新增客戶聯絡人 (${resolvedBpCode || ''})`}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        destroyOnHidden
        centered
        width={800}
        mask={{ closable: false }}
        keyboard={false}
        footer={[
          <Button key="cancel" onClick={() => setIsModalOpen(false)}>
            取消
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            htmlType="submit" 
            form="contactModalForm"
            loading={createMutation.isPending}
            icon={<SaveOutlined />}
          >
            儲存並選取
          </Button>
        ]}
      >
        <div className="pt-4">
          <DynamicForm
            fields={contactFormConfig()}
            onSubmit={handleCreateSubmit}
            formId="contactModalForm"
            hideDefaultFooter={true}
            defaultValues={{
              isSalesContact: false,
              isPurchasingContact: true,
              isOutsourcingContact: false,
              isAccountingContact: false,
            } as any}
          />
        </div>
      </Modal>
    </>
  );
};
