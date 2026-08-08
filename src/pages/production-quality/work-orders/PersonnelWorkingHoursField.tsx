import { useState, useMemo } from 'react';
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

type PersonnelWorkingHourDraft = {
  employeeNumber: string | null;
  minutes: number | null;
};

export function PersonnelWorkingHoursField({
  value = [],
  onChange,
  disabled = false,
}: PersonnelWorkingHoursFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempList, setTempList] = useState<PersonnelWorkingHourDraft[]>([]);
  
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
    setTempList(value.map((item) => ({
      employeeNumber: item.employeeNumber ?? null,
      minutes: item.minutes,
    })));
    setIsOpen(true);
  };

  const isValidDraftRow = (
    item: PersonnelWorkingHourDraft,
  ): item is PersonnelWorkingHourDraft & { employeeNumber: string; minutes: number } =>
    Boolean(item.employeeNumber?.trim())
    && typeof item.minutes === 'number'
    && Number.isInteger(item.minutes)
    && item.minutes > 0;

  const handleSave = () => {
    // 檢查是否有無效的工時分鐘數（人員有填，但分鐘數沒填或是 0）
    const hasInvalidMinutes = tempList.some(
      (item) => Boolean(item.employeeNumber?.trim()) && !isValidDraftRow(item)
    );

    if (hasInvalidMinutes) {
      Modal.error({
        title: '資料驗證錯誤',
        content: '人員工時分鐘數不可為空或 0，請修正後再試。',
        centered: true,
      });
      return;
    }

    const validList: WorkOrderPersonnelHourDto[] = tempList
      .filter(isValidDraftRow)
      .map(({ employeeNumber, minutes }) => ({ employeeNumber, minutes }));
    
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
    setTempList([...tempList, { employeeNumber: null, minutes: 0 }]);

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

  const handleEmployeeNumberChange = (index: number, employeeNumber: string | null) => {
    setTempList((current) => current.map((item, itemIndex) =>
      itemIndex === index ? { ...item, employeeNumber } : item
    ));
  };

  const handleMinutesChange = (index: number, minutes: number | null) => {
    setTempList((current) => current.map((item, itemIndex) =>
      itemIndex === index ? { ...item, minutes } : item
    ));
  };

  const totalMinutes = value?.reduce((sum, item) => sum + (item.minutes || 0), 0) || 0;
  const count = value?.length || 0;
  const summaryText = count > 0 ? `${count} 人 / 總計 ${totalMinutes.toLocaleString()} 分鐘` : '';

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
              handleEmployeeNumberChange(index, newVal);
              if (newVal) {
                setTimeout(() => {
                  const minutesInput = document.getElementById(`minutes-input-${index}`) as HTMLInputElement;
                  if (minutesInput) {
                    minutesInput.focus();
                    if (typeof minutesInput.select === 'function') {
                      minutesInput.select();
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
      title: '工時（分鐘）',
      dataIndex: 'minutes',
      key: 'minutes',
      width: 150,
      render: (val: number | null, _: any, index: number) => {
        return (
          <InputNumber
            id={`minutes-input-${index}`}
            min={1}
            precision={0}
            controls={false}
            value={val}
            disabled={disabled}
            onChange={(newVal) => handleMinutesChange(index, newVal)}
            placeholder="分鐘"
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
        title="編輯人員工時（分鐘）"
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
            總計: <strong>{tempList.reduce((sum, item) => sum + (item.minutes || 0), 0).toLocaleString()}</strong> 分鐘
          </div>
        </div>
        
        <div className="max-h-[400px] overflow-y-auto">
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
}
