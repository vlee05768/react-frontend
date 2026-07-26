import React, { useState, useMemo } from 'react';
import { Modal, Input, Button, Table, Space, InputNumber, message, Select } from 'antd';
import { EditOutlined, EyeOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getApiV1Employee } from '@/api/generated/sdk.gen';
import type { WorkOrderPersonnelHourDto } from '@/api/generated/types.gen';

interface PersonnelWorkingHoursFieldProps {
  value?: WorkOrderPersonnelHourDto[];
  onChange?: (val: WorkOrderPersonnelHourDto[]) => void;
  disabled?: boolean;
}

export const PersonnelWorkingHoursField: React.FC<PersonnelWorkingHoursFieldProps> = ({
  value = [],
  onChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempList, setTempList] = useState<WorkOrderPersonnelHourDto[]>([]);
  
  // 靜態查詢所有員工（因為員工數不多，一次性載入提升極致效能與操作手感）
  const { data: employeeData, isLoading: isEmployeesLoading } = useQuery({
    queryKey: ['all-employees'],
    queryFn: () => getApiV1Employee({ query: { pageSize: -1 } as any }),
    enabled: isOpen, // 僅在 Modal 開啟時進行查詢
  });

  const employeeOptions = useMemo(() => {
    const rawList = (employeeData?.data as any)?.data?.data || (employeeData?.data as any)?.data || [];
    return rawList.map((emp: any) => ({
      label: `${emp.name || ''} (${emp.employeeNo || emp.employeeCode || ''})`,
      value: emp.employeeNo || emp.employeeCode || '',
    }));
  }, [employeeData]);

  const handleOpen = () => {
    setTempList(JSON.parse(JSON.stringify(value || [])));
    setIsOpen(true);
  };

  const handleSave = () => {
    // 檢查是否有無效的工時（人員有填，但工時沒填或是0）
    const hasInvalidHours = tempList.some(
      (item) => item.employeeNumber && (typeof item.hours !== 'number' || item.hours <= 0)
    );

    if (hasInvalidHours) {
      Modal.error({
        title: '資料驗證錯誤',
        content: '人員工時不可為空或 0，請修正後再試。',
        centered: true,
      });
      return;
    }

    // 過濾掉沒有選擇人員的項目
    const validList = tempList.filter((item) => item.employeeNumber);
    
    if (onChange) {
      onChange(validList);
    }
    setIsOpen(false);
  };

  const handleAdd = () => {
    if (tempList.some((item) => !item.employeeNumber)) {
      message.warning('請先為空白項目選擇員工後，再新增下一筆');
      return;
    }
    const nextIndex = tempList.length;
    setTempList([...tempList, { employeeNumber: null, hours: 0 }]);

    // 延遲等待 React 渲染完新的 Table 橫列後，自動 focus 到剛建立的員工選擇框
    setTimeout(() => {
      const container = document.getElementById(`employee-select-${nextIndex}`);
      if (container) {
        // Ant Design 的 Select 內部會有一個隱藏/實際負責輸入的 input
        const input = container.tagName === 'INPUT' ? container : container.querySelector('input');
        if (input) {
          (input as HTMLElement).focus();
        }
      }
    }, 100);
  };

  const handleRemove = (index: number) => {
    const newList = [...tempList];
    newList.splice(index, 1);
    setTempList(newList);
  };

  const handleUpdate = (index: number, field: keyof WorkOrderPersonnelHourDto, val: any) => {
    const newList = [...tempList];
    newList[index] = { ...newList[index], [field]: val };
    setTempList(newList);
  };

  const totalHours = value?.reduce((sum, item) => sum + (item.hours || 0), 0) || 0;
  const count = value?.length || 0;
  const summaryText = count > 0 ? `${count} 人 / 總計 ${totalHours.toFixed(2)} 小時` : '';

  const columns = [
    {
      title: '員工',
      dataIndex: 'employeeNumber',
      key: 'employeeNumber',
      render: (val: string | null, _: any, index: number) => {
        // filter out already selected ones from other rows
        const excludeValues = tempList
          .map((item, i) => i !== index ? item.employeeNumber : null)
          .filter(Boolean) as string[];

        // Note: AntD Select inside Table
        const filteredOptions = employeeOptions.filter(
          (opt: any) => !excludeValues.includes(opt.value)
        );

        return (
          <Select
            id={`employee-select-${index}`}
            showSearch
            loading={isEmployeesLoading}
            value={val || undefined}
            disabled={disabled}
            placeholder="請選擇員工"
            className="w-full"
            filterOption={(input, option) =>
              String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={filteredOptions}
            onChange={(newVal) => {
              handleUpdate(index, 'employeeNumber', newVal);
              if (newVal) {
                setTimeout(() => {
                  const hoursInput = document.getElementById(`hours-input-${index}`) as HTMLInputElement;
                  if (hoursInput) {
                    hoursInput.focus();
                    if (typeof hoursInput.select === 'function') {
                      hoursInput.select();
                    }
                  }
                }, 100);
              }
            }}
          />
        );
      }
    },
    {
      title: '工時 (小時)',
      dataIndex: 'hours',
      key: 'hours',
      width: 150,
      render: (val: number | undefined, _: any, index: number) => {
        const InputNumberComponent: any = InputNumber;
        return (
          <InputNumberComponent
            id={`hours-input-${index}`}
            min={0}
            precision={2}
            controls={false}
            value={val}
            disabled={disabled}
            onChange={(newVal: any) => handleUpdate(index, 'hours', newVal)}
            placeholder="工時"
            className="w-full"
          />
        );
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: any, __: any, index: number) => (
        <Button 
          type="text" 
          danger 
          icon={<DeleteOutlined />} 
          onClick={() => handleRemove(index)} 
          disabled={disabled}
        />
      )
    }
  ];

  return (
    <>
      <Input
        readOnly
        value={summaryText}
        placeholder={disabled ? '無人員工時' : '點擊編輯人員工時'}
        onClick={handleOpen}
        style={{ cursor: 'pointer' }}
        suffix={
          disabled ? (
            <EyeOutlined style={{ cursor: 'pointer', color: 'rgba(0,0,0,0.45)' }} onClick={handleOpen} />
          ) : (
            <EditOutlined style={{ cursor: 'pointer', color: '#1677ff' }} onClick={handleOpen} />
          )
        }
      />

      <Modal
        title="編輯人員工時"
        open={isOpen}
        onCancel={() => setIsOpen(false)}
        width={600}
        style={{ top: 20 }}
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
        footer={
          <Space>
            {!disabled && (
              <Button type="dashed" icon={<PlusOutlined />} onClick={handleAdd}>
                新增人員工時
              </Button>
            )}
            {!disabled && <Button type="primary" onClick={handleSave}>確定</Button>}
            <Button onClick={() => setIsOpen(false)}>{disabled ? '關閉' : '取消'}</Button>
          </Space>
        }
        centered
        destroyOnHidden
      >
        <div className="mb-4">
          <div>
            總計: <strong>{tempList.reduce((sum, item) => sum + (item.hours || 0), 0).toFixed(2)}</strong> 小時
          </div>
        </div>
        
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          <Table
            dataSource={tempList.map((item, idx) => ({ ...item, _key: idx }))}
            columns={disabled ? columns.filter(c => c.key !== 'action') : columns}
            rowKey="_key"
            pagination={false}
            size="small"
            bordered
           scroll={{ x: 'max-content' }} />
        </div>
      </Modal>
    </>
  );
};
