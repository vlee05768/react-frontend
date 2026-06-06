import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Select, Button, Space, Modal, App } from 'antd';
import { PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getApiV1BusinessPartnersByBusinessPartnerCodeContacts,
  postApiV1BusinessPartnersByBusinessPartnerCodeContacts,
  getApiV1CustomersByCode,
  getApiV1MaterialSuppliersByCode,
  getApiV1OutsourceVendorsByCode,
  getApiV1ToolingSuppliersByCode
} from '@/api/generated/sdk.gen';
import { DynamicForm } from '@/components/Form/DynamicForm';
import { contactFormConfig } from '@/pages/basic/business-partners/ContactConfig';
import { getApiErrorMessage } from '@/utils/apiError';

interface ContactSelectWithCreateProps {
  value?: number;
  onChange?: (val: number | undefined) => void;
  disabled?: boolean;
  businessPartnerCode?: string;
  onContactChange?: (contact: any) => void;
  contactType?: 'purchasing' | 'sales' | 'outsourcing' | 'accounting';
}

export const ContactSelectWithCreate: React.FC<ContactSelectWithCreateProps> = ({
  value,
  onChange,
  disabled,
  businessPartnerCode,
  onContactChange,
  contactType = 'purchasing'
}) => {
  const { message: messageApi, modal: modalApi } = App.useApp();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 1. 判斷傳入代碼的類型
  const isCustomerCode = businessPartnerCode?.startsWith('C');
  const isSupplierCode = businessPartnerCode?.startsWith('S');
  const isOutsourceCode = businessPartnerCode?.startsWith('O');
  const isToolingCode = businessPartnerCode?.startsWith('T');

  // 2. 針對不同類型載入對應詳細資料，取得真正的商業夥伴代碼 (BP開頭)
  const { data: customerData, isFetching: isFetchingCustomer } = useQuery({
    queryKey: ['customerByCodeForContactSelect', businessPartnerCode],
    queryFn: () => getApiV1CustomersByCode({ path: { code: businessPartnerCode! } }),
    enabled: !!businessPartnerCode && isCustomerCode,
    staleTime: 5 * 60 * 1000, // 快取 5 分鐘
  });

  const { data: supplierData, isFetching: isFetchingSupplier } = useQuery({
    queryKey: ['supplierByCodeForContactSelect', businessPartnerCode],
    queryFn: () => getApiV1MaterialSuppliersByCode({ path: { code: businessPartnerCode! } }),
    enabled: !!businessPartnerCode && isSupplierCode,
    staleTime: 5 * 60 * 1000, // 快取 5 分鐘
  });

  const { data: outsourceData, isFetching: isFetchingOutsource } = useQuery({
    queryKey: ['outsourceByCodeForContactSelect', businessPartnerCode],
    queryFn: () => getApiV1OutsourceVendorsByCode({ path: { code: businessPartnerCode! } }),
    enabled: !!businessPartnerCode && isOutsourceCode,
    staleTime: 5 * 60 * 1000, // 快取 5 分鐘
  });

  const { data: toolingData, isFetching: isFetchingTooling } = useQuery({
    queryKey: ['toolingByCodeForContactSelect', businessPartnerCode],
    queryFn: () => getApiV1ToolingSuppliersByCode({ path: { code: businessPartnerCode! } }),
    enabled: !!businessPartnerCode && isToolingCode,
    staleTime: 5 * 60 * 1000, // 快取 5 分鐘
  });

  // 3. 取得實際要傳給 API 的商業夥伴代碼
  const resolvedBpCode = useMemo(() => {
    if (!businessPartnerCode) return undefined;
    if (isCustomerCode) {
      const custInfo = (customerData?.data as any)?.data || (customerData?.data as any);
      return custInfo?.businessPartnerCode || undefined;
    }
    if (isSupplierCode) {
      const supInfo = (supplierData?.data as any)?.data || (supplierData?.data as any);
      return supInfo?.businessPartnerCode || undefined;
    }
    if (isOutsourceCode) {
      const outInfo = (outsourceData?.data as any)?.data || (outsourceData?.data as any);
      return outInfo?.businessPartnerCode || undefined;
    }
    if (isToolingCode) {
      const toolInfo = (toolingData?.data as any)?.data || (toolingData?.data as any);
      return toolInfo?.businessPartnerCode || undefined;
    }
    return businessPartnerCode; // 原本即為 BP 或是其他代碼，直接套用
  }, [
    businessPartnerCode, 
    isCustomerCode, isSupplierCode, isOutsourceCode, isToolingCode, 
    customerData, supplierData, outsourceData, toolingData
  ]);

  // 取得該客戶的聯絡人清單
  const { data, isFetching: isFetchingContacts } = useQuery({
    queryKey: ['partnerContactList', resolvedBpCode, contactType],
    queryFn: () => getApiV1BusinessPartnersByBusinessPartnerCodeContacts({
      path: { businessPartnerCode: resolvedBpCode! },
      query: { 
        pageSize: -1, 
        IsPurchasingContact: contactType === 'purchasing' ? true : undefined,
        IsSalesContact: contactType === 'sales' ? true : undefined,
        IsOutsourcingContact: contactType === 'outsourcing' ? true : undefined,
        IsAccountingContact: contactType === 'accounting' ? true : undefined,
      } as any
    }),
    enabled: !!resolvedBpCode,
  });

  const isFetchingDetails = 
    (isCustomerCode && isFetchingCustomer) ||
    (isSupplierCode && isFetchingSupplier) ||
    (isOutsourceCode && isFetchingOutsource) ||
    (isToolingCode && isFetchingTooling);

  const isFetching = isFetchingContacts || isFetchingDetails;

  const listData = useMemo(() => {
    return (data?.data as any)?.data?.data || (data?.data as any)?.data || [];
  }, [data]);

  const options = listData.map((contact: any) => ({
    label: `${contact.name} ${contact.jobTitle ? `(${contact.jobTitle})` : ''}`,
    value: contact.id
  }));

  // 記錄前一次執行過自動回填的客戶代碼
  const lastAutoFillBpCodeRef = useRef<string | undefined>(undefined);

  // 自動選取邏輯：如果該客戶只有一筆聯絡人，且目前尚未選取，則自動填入
  useEffect(() => {
    // 只有在「切換/載入新客戶」且 API 抓取完成的當下，才嘗試判斷並回填
    if (!isFetching && resolvedBpCode && lastAutoFillBpCodeRef.current !== resolvedBpCode) {
      lastAutoFillBpCodeRef.current = resolvedBpCode;
      if (listData.length === 1 && !value && onChange) {
        onChange(listData[0].id);
        if (onContactChange) {
          onContactChange(listData[0]);
        }
      }
    }
  }, [resolvedBpCode, listData, isFetching, value, onChange, onContactChange]);

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
      
      queryClient.invalidateQueries({ queryKey: ['partnerContactList', resolvedBpCode, contactType] });
    },
    onError: (error: any) => {
      modalApi.error({ centered: true, title: '錯誤提示', content: `新增失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const handleCreateSubmit = (values: any) => {
    createMutation.mutate({
      ...values,
      isPurchasingContact: contactType === 'purchasing',
      isSalesContact: contactType === 'sales',
      isOutsourcingContact: contactType === 'outsourcing',
      isAccountingContact: contactType === 'accounting',
    });
  };

  const handleSelectChange = (val: number | undefined) => {
    if (onChange) onChange(val);
    if (onContactChange) {
      const selected = listData.find((c: any) => c.id === val);
      onContactChange(selected || null);
    }
  };

  const hasNoContacts = !!resolvedBpCode && !isFetching && options.length === 0;

  return (
    <>
      <Space.Compact className="w-full">
        <Select
          className="w-full"
          value={value}
          onChange={handleSelectChange}
          disabled={disabled || !resolvedBpCode}
          loading={isFetching}
          options={options}
          allowClear
          placeholder={(disabled && (value === null || value === undefined)) ? "" : (hasNoContacts ? "沒有任何聯絡人，請新增聯絡人" : "請選擇聯絡人")}
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
        title={`新增聯絡人 (${resolvedBpCode || ''})`}
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
              isSalesContact: contactType === 'sales',
              isPurchasingContact: contactType === 'purchasing',
              isOutsourcingContact: contactType === 'outsourcing',
              isAccountingContact: contactType === 'accounting',
            } as any}
          />
        </div>
      </Modal>
    </>
  );
};
