import React, { useState } from 'react';
import { Card, Button, Modal, Typography, Divider, Row, Col, Descriptions, Input, Upload } from 'antd';
import { 
  ExclamationCircleFilled, 
  CalculatorOutlined, 
  SettingOutlined, 
  SyncOutlined, 
  ReloadOutlined,
  UploadOutlined,
  FileExcelOutlined
} from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { 
  postApiV1StorageCalculateInventory, 
  postApiV1SystemMaintenanceSyncSequenceRules,
  postApiV1SystemMaintenanceRebuildMaterialInventory
} from '@/api/generated/sdk.gen';
import { useThemeStore } from '@/stores/useThemeStore';
import { apiClient } from '@/api/client';

const { Title, Text } = Typography;

const SystemMaintenance: React.FC = () => {
  const mode = useThemeStore((state) => state.mode);
  const isDarkMode = mode === 'dark';

  const [materialCode, setMaterialCode] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleUploadOpeningInventory = async (file: File) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiClient.post('/api/v1/SystemMaintenance/import-opening-inventory', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const apiResponse = response.data;
      if (apiResponse?.success) {
        Modal.success({
          title: '開帳匯入成功',
          centered: true,
          content: (
            <div className="space-y-2">
              <div className="text-sm">{apiResponse.message || '原料期初開帳數據與物料主檔已成功導入系統！'}</div>
              <div className="p-3 rounded bg-amber-50 text-amber-800 border border-amber-200 text-xs mt-2">
                ⚠️ 重要：請立即點擊「執行全量 LPN 重建」按鈕，同步校正最新倉庫儲位的邏輯庫存量！
              </div>
            </div>
          ),
        });
      }
    } catch (error: any) {
      console.error('Import opening inventory error:', error);
      const resData = error?.response?.data;
      const errorMsg = resData?.message || '匯入開帳資料失敗，請檢查格式。';
      const rowErrors: string[] = resData?.errors || [];

      Modal.error({
        title: '開帳匯入未通過',
        width: 500,
        centered: true,
        content: (
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            <div className="font-semibold text-red-600">{errorMsg}</div>
            {rowErrors.length > 0 && (
              <div className="space-y-1 bg-red-50 p-3 rounded border border-red-200 text-xs text-red-800 font-mono mt-2">
                {rowErrors.map((err, idx) => (
                  <div key={idx}>• {err}</div>
                ))}
              </div>
            )}
          </div>
        ),
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Mutation for LPN raw material inventory rebuilding
  const { mutateAsync: rebuildLogicalInventory, isPending: isRebuilding } = useMutation({
    mutationFn: (variables?: { materialCode?: string }) => 
      postApiV1SystemMaintenanceRebuildMaterialInventory({
        query: {
          materialCode: variables?.materialCode || undefined
        }
      }),
    onSuccess: (res: any) => {
      const apiResponse = res.data;
      if (!apiResponse?.success) {
        Modal.error({ 
          centered: true, 
          title: '庫存校正失敗', 
          content: apiResponse?.message || '伺服器回傳失敗狀態。' 
        });
        return;
      }
      Modal.success({
        centered: true,
        title: '庫存校正完成',
        content: apiResponse?.message || '校正程序已成功執行完畢！'
      });
      setMaterialCode('');
    },
    onError: (error: any) => {
      console.error('Rebuild material inventory error:', error);
      const errorMsg = error?.response?.data?.message || '校正失敗，請稍後再試或聯繫系統管理員。';
      Modal.error({
        centered: true,
        title: '庫存校正發生錯誤',
        content: errorMsg,
      });
    },
  });

  const handleSingleRebuild = async () => {
    if (!materialCode) return;
    await rebuildLogicalInventory({ materialCode });
  };

  const handleAllRebuild = () => {
    Modal.confirm({
      title: '確定要重建全量捲材邏輯庫存嗎？',
      icon: <ExclamationCircleFilled className="text-red-500" />,
      content: '此操作將清除資料庫中所有現存的捲材邏輯庫存，並依據所有實體一卷一卡(LPN)當前位置和長度重新加總。執行期間會鎖定邏輯庫存表，您確定要繼續嗎？',
      okText: '確認重建',
      cancelText: '取消',
      okType: 'danger',
      centered: true,
      onOk: async () => {
        await rebuildLogicalInventory(undefined);
      },
    });
  };

  // Mutation for calculating inventory
  const { mutateAsync: calculateInventory, isPending: isCalculating } = useMutation({
    mutationFn: () => postApiV1StorageCalculateInventory(),
    onSuccess: (res) => {
      const apiResponse = res.data;
      const resultData = apiResponse?.data;
      
      if (!apiResponse?.success) {
        Modal.error({ 
          centered: true, 
          title: '重算庫存失敗', 
          content: apiResponse?.message || '伺服器回傳失敗狀態。' 
        });
        return;
      }

      if (resultData) {
        const { totalCalculatedItems, itemsToUpdate, updatedItems, isSuccess, errorMessage } = resultData;
        
        if (isSuccess) {
          Modal.success({
            title: '重算庫存完成',
            width: 400,
            centered: true,
            content: (
              <div className="mt-4">
                <Descriptions 
                  column={1} 
                  bordered 
                  size="small"
                  items={[
                    { label: "總檢查項目數", children: totalCalculatedItems ?? 0 },
                    { label: "需更新項目數", children: itemsToUpdate ?? 0 },
                    { label: "實際更新數", children: updatedItems ?? 0 }
                  ]}
                />
                <div className="mt-4 text-gray-500 text-sm">
                  {apiResponse.message || '庫存資料已重新計算並覆寫完成。'}
                </div>
              </div>
            ),
          });
        } else {
          Modal.warning({
            title: '重算庫存未完全成功',
            width: 400,
            centered: true,
            content: (
              <div className="mt-4">
                <p className="text-red-500 mb-4">{errorMessage || '執行過程中發生部分錯誤。'}</p>
                <Descriptions 
                  column={1} 
                  bordered 
                  size="small"
                  items={[
                    { label: "總檢查項目數", children: totalCalculatedItems ?? 0 },
                    { label: "需更新項目數", children: itemsToUpdate ?? 0 },
                    { label: "實際更新數", children: updatedItems ?? 0 }
                  ]}
                />
              </div>
            ),
          });
        }
      } else {
        Modal.success({
          centered: true,
          title: '重算庫存完成',
          content: '重算庫存已成功完成！'
        });
      }
    },
    onError: (error: any) => {
      console.error('Calculate inventory error:', error);
      const errorMsg = error?.response?.data?.message || '重算庫存失敗，請稍後再試或聯繫系統管理員。';
      Modal.error({
        centered: true,
        title: '重算庫存發生錯誤',
        content: errorMsg,
      });
    },
  });

  const handleCalculateInventory = () => {
    Modal.confirm({
      title: '確認重算庫存',
      icon: <ExclamationCircleFilled />,
      content: '此操作將會重新計算並更新所有庫位的淨庫存量，執行過程可能需要一些時間。您確定要繼續嗎？',
      okText: '確認重算',
      cancelText: '取消',
      okType: 'danger', // Use danger for destructive/heavy operations as requested
      centered: true,   // Ensure it's centered per UI preferences
      onOk: async () => {
        await calculateInventory();
      },
    });
  };

  // Mutation for syncing sequence rules
  const { mutateAsync: syncSequenceRules, isPending: isSyncingSequences } = useMutation({
    mutationFn: () => postApiV1SystemMaintenanceSyncSequenceRules(),
    onSuccess: (res: any) => {
      const apiResponse = res.data;
      if (!apiResponse?.success) {
        Modal.error({ 
          centered: true, 
          title: '校正失敗', 
          content: apiResponse?.message || '伺服器回傳失敗狀態。' 
        });
        return;
      }
      
      const updatedCount = apiResponse.data || 0;
      Modal.success({
        centered: true,
        title: '校正完成',
        content: `單號跳號規則已成功校正！共更新了 ${updatedCount} 筆規則。`
      });
    },
    onError: (error: any) => {
      console.error('Sync sequence rules error:', error);
      const errorMsg = error?.response?.data?.message || '校正失敗，請稍後再試或聯繫系統管理員。';
      Modal.error({
        centered: true,
        title: '單號校正發生錯誤',
        content: errorMsg,
      });
    },
  });

  const handleSyncSequenceRules = () => {
    Modal.confirm({
      title: '確認單號校正',
      icon: <ExclamationCircleFilled />,
      content: '此操作將會掃描所有系統單據，重新校正自動跳號產生器的最新流水號，用於修復單號重複或 500 錯誤。您確定要繼續嗎？',
      okText: '確認校正',
      cancelText: '取消',
      okType: 'danger',
      centered: true,
      onOk: async () => {
        await syncSequenceRules();
      },
    });
  };

  return (
    <div className={`p-6 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} min-h-[calc(100vh-64px)]`}>
      <div className="mb-6">
        <Title level={3} className={isDarkMode ? '!text-gray-100' : '!text-gray-800'}>
          系統維護
        </Title>
        <Text type="secondary" className={isDarkMode ? '!text-gray-400' : ''}>
          提供系統管理員執行各項後台維護與資料校正功能。
        </Text>
      </div>

      <Row gutter={[16, 16]} className="flex-row">
        {/* 重算庫存功能卡片 */}
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card 
            hoverable 
            className={`h-full ${isDarkMode ? 'bg-gray-800 border-gray-700' : ''}`}
            styles={{ body: { padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' } }}
          >
            <div className="flex flex-col justify-between h-full">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className={`p-4 rounded-full ${isDarkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-50 text-blue-600'}`}>
                  <CalculatorOutlined className="text-3xl" />
                </div>
                <div>
                  <Title level={5} className={isDarkMode ? '!text-gray-200' : ''}>庫存重算</Title>
                  <Text type="secondary" className={`text-sm ${isDarkMode ? '!text-gray-400' : ''}`}>
                    根據歷史交易紀錄，重新計算並覆寫所有庫位的當前淨庫存量。
                  </Text>
                </div>
              </div>
              <div>
                <Divider className="my-2" />
                <Button 
                  type="primary" 
                  danger
                  icon={<CalculatorOutlined />} 
                  onClick={handleCalculateInventory}
                  loading={isCalculating}
                  className="w-full"
                >
                  執行重算
                </Button>
              </div>
            </div>
          </Card>
        </Col>

        {/* 單號跳號校正功能卡片 */}
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card 
            hoverable 
            className={`h-full ${isDarkMode ? 'bg-gray-800 border-gray-700' : ''}`}
            styles={{ body: { padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' } }}
          >
            <div className="flex flex-col justify-between h-full">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className={`p-4 rounded-full ${isDarkMode ? 'bg-amber-900 text-amber-300' : 'bg-amber-50 text-amber-600'}`}>
                  <SettingOutlined className="text-3xl" />
                </div>
                <div>
                  <Title level={5} className={isDarkMode ? '!text-gray-200' : ''}>單號跳號校正</Title>
                  <Text type="secondary" className={`text-sm ${isDarkMode ? '!text-gray-400' : ''}`}>
                    掃描系統所有單據，校正跳號產生器 (SequenceRule) 至實際最大流水號，修復單號衝突。
                  </Text>
                </div>
              </div>
              <div>
                <Divider className="my-2" />
                <Button 
                  type="primary" 
                  danger
                  icon={<SettingOutlined />} 
                  onClick={handleSyncSequenceRules}
                  loading={isSyncingSequences}
                  className="w-full"
                >
                  執行校正
                </Button>
              </div>
            </div>
          </Card>
        </Col>

        {/* 一卷一卡 LPN 原料邏輯庫存重算校正卡片 */}
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card 
            hoverable 
            className={`h-full ${isDarkMode ? 'bg-gray-800 border-gray-700' : ''}`}
            styles={{ body: { padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' } }}
          >
            <div className="flex flex-col justify-between h-full">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className={`p-4 rounded-full ${isDarkMode ? 'bg-emerald-900 text-emerald-300' : 'bg-emerald-50 text-emerald-600'}`}>
                  <SyncOutlined className="text-3xl" />
                </div>
                <div>
                  <Title level={5} className={isDarkMode ? '!text-gray-200' : ''}>LPN 捲材庫存校正</Title>
                  <Text type="secondary" className={`text-xs ${isDarkMode ? '!text-gray-400' : ''}`}>
                    依一卷一卡 (LPN) 實物加總邏輯庫存，已排除消耗與作廢卷卡。
                  </Text>
                </div>
              </div>
              
              <div className="space-y-3">
                <Divider className="my-1" />
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-gray-500 text-left">指定單一原料：</div>
                  <div className="flex space-x-1">
                    <Input 
                      size="small"
                      placeholder="原料品編 (大寫)"
                      value={materialCode}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase().replace(/[\u4e00-\u9fa5]/g, '');
                        setMaterialCode(val);
                      }}
                      className={isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}
                    />
                    <Button 
                      size="small"
                      type="primary"
                      onClick={handleSingleRebuild}
                      loading={isRebuilding}
                      disabled={!materialCode}
                      className="bg-emerald-600 hover:bg-emerald-500 border-none"
                    >
                      校正
                    </Button>
                  </div>
                </div>

                <Divider className="my-1" />

                <Button 
                  type="primary" 
                  danger
                  icon={<ReloadOutlined />} 
                  onClick={handleAllRebuild}
                  loading={isRebuilding && !materialCode}
                  className="w-full"
                >
                  執行全量 LPN 重建
                </Button>
              </div>
            </div>
          </Card>
        </Col>

        {/* 原料期初開帳匯入 (Excel) */}
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card 
            hoverable 
            className={`h-full ${isDarkMode ? 'bg-gray-800 border-gray-700' : ''}`}
            styles={{ body: { padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' } }}
          >
            <div className="flex flex-col justify-between h-full">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className={`p-4 rounded-full ${isDarkMode ? 'bg-indigo-900 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>
                  <FileExcelOutlined className="text-3xl" />
                </div>
                <div>
                  <Title level={5} className={isDarkMode ? '!text-gray-200' : ''}>原料期初開帳導入</Title>
                  <Text type="secondary" className={`text-xs ${isDarkMode ? '!text-gray-400' : ''}`}>
                    上線期初原料主檔動態建立與實物 LPN 庫存覆寫導入。
                  </Text>
                </div>
              </div>

              <div className="space-y-3 mt-3">
                <Divider className="my-1" />
                
                <Button 
                  type="link" 
                  icon={<FileExcelOutlined />} 
                  href="/templates/Template_Material_Opening.xlsx"
                  download="Template_Material_Opening.xlsx"
                  className="w-full text-indigo-600 hover:text-indigo-500 font-semibold p-0 h-auto text-xs"
                >
                  下載標準開帳 Excel 範本
                </Button>

                <Divider className="my-1" />

                <Upload
                  accept=".xlsx, .xls"
                  showUploadList={false}
                  beforeUpload={(file) => {
                    handleUploadOpeningInventory(file);
                    return false; // Block auto-upload by AntD Upload, we submit manually
                  }}
                >
                  <Button 
                    type="primary" 
                    icon={<UploadOutlined />} 
                    loading={isUploading}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 border-none"
                  >
                    選擇並上傳開帳 Excel
                  </Button>
                </Upload>
              </div>
            </div>
          </Card>
        </Col>
        
        {/* 未來可在此擴充其他維護功能 */}
      </Row>
    </div>
  );
};

export default SystemMaintenance;