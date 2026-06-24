// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Drawer, Card, Table, InputNumber, Radio, Select, Button, Tag, Space, Form, Input, Typography, Divider, Badge, Alert, Row, Col, message, Spin } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined, SaveOutlined, WarningOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiV1IqcInspectionByIqcRecordId, postApiV1IqcInspectionByIqcRecordIdEscalate, postApiV1IqcInspectionByIqcRecordIdComplete } from '@/api/generated';

const { Title, Text } = Typography;

interface IqcDrawerProps {
  iqcRecordId: string | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function IqcDrawer({ iqcRecordId, open, onClose, onSuccess }: IqcDrawerProps) {
  const queryClient = useQueryClient();
  const [rolls, setRolls] = useState<any[]>([]);
  const [activeRollNo, setActiveRollNo] = useState<string | null>(null);
  const [overallResult, setOverallResult] = useState<'AllPass' | 'Partial' | 'Reject'>('AllPass');
  const [inspectorId, setInspectorId] = useState('');
  const [notes, setNotes] = useState('');
  const [responsibleParty, setResponsibleParty] = useState('');

  // 1. 取得品檢單詳情 (含隔離待檢時，後端動態生成的待品檢卷卡列表與品檢範本)
  const { data: response, isLoading, refetch } = useQuery({
    queryKey: ['iqc-detail', iqcRecordId],
    queryFn: () => getApiV1IqcInspectionByIqcRecordId({ path: { iqcRecordId: iqcRecordId! } }),
    enabled: !!iqcRecordId && open,
  });

  const detail = response?.data?.data;
  const isReadOnly = detail?.inspectionStatus !== 'Pending' && detail?.inspectionStatus !== 'FullInspecting';
  const isRollMaterial = detail?.materialForm === 'R'; // R=捲材, S=片材

  // 當資料載入時，初始化 rolls
  useEffect(() => {
    if (detail?.rolls) {
      // 為每一卷卷卡加上預設值與輔助 state
      const initialRolls = detail.rolls.map((r: any) => ({
        ...r,
        actualQtyAux: r.actualQtyAux,
        isOk: r.isOk ?? true,
        measuredThicknessMm: r.measuredThicknessMm ?? detail.standardThickness ?? 0.0500,
        measuredCoreDiaMm: r.measuredCoreDiaMm ?? (isRollMaterial ? 76.20 : null),
        lengthMm: r.lengthMm ?? (isRollMaterial ? null : detail.standardLength),
        disposition: r.disposition || 'Rejected',
        responsibleParty: r.responsibleParty || detail.supplierCode,
        inspectionItems: r.inspectionItems || []
      }));
      setRolls(initialRolls);
      setInspectorId(detail.inspectorId === 'PENDING' ? '' : detail.inspectorId);
      setOverallResult(detail.inspectionStatus === 'Pending' ? 'AllPass' : (detail.inspectionStatus === 'Reject' ? 'Reject' : 'Partial'));
    }
  }, [detail, isRollMaterial]);

  // 2. 升級加嚴 100% 全檢之 Mutation
  const escalateMutation = useMutation({
    mutationFn: () => postApiV1IqcInspectionByIqcRecordIdEscalate({ path: { iqcRecordId: iqcRecordId! } }),
    onSuccess: () => {
      message.success('已成功將品檢單解鎖並升級為加嚴 100% 全檢狀態！');
      refetch();
    },
    onError: (err: any) => message.error(err.response?.data?.message || '升級全檢失敗'),
  });

  // 3. 品檢結案最終過帳之 Mutation
  const completeMutation = useMutation({
    mutationFn: (payload: any) => postApiV1IqcInspectionByIqcRecordIdComplete({
      path: { iqcRecordId: iqcRecordId! },
      body: payload
    }),
    onSuccess: () => {
      message.success('品質檢驗過帳完成！良品已正式產生 LPN 卷卡入庫，不合格品已成功從採購已到貨量扣除。');
      onSuccess();
    },
    onError: (err: any) => message.error(err.response?.data?.message || '過帳失敗，請重試'),
  });

  // 4. 事件處理器
  const handleStatusChange = (rollNo: string, isOk: boolean) => {
    if (isReadOnly) return;
    const updated = rolls.map(r => {
      if (r.rollNo === rollNo) {
        return { 
          ...r, 
          isOk,
          disposition: isOk ? undefined : 'Rejected',
          responsibleParty: isOk ? undefined : detail?.supplierCode
        };
      }
      return r;
    });
    setRolls(updated);

    const hasNg = updated.some(r => !r.isOk);
    setOverallResult(hasNg ? 'Partial' : 'AllPass');

    if (!isOk) {
      setActiveRollNo(rollNo);
    } else if (activeRollNo === rollNo) {
      setActiveRollNo(null);
    }
  };

  const handleQtyChange = (rollNo: string, val: number | null) => {
    if (isReadOnly || val === null) return;
    setRolls(rolls.map(r => r.rollNo === rollNo ? { ...r, actualQtyAux: val } : r));
  };

  const handleMeasuredItemChange = (rollNo: string, itemCode: string, field: string, val: any) => {
    if (isReadOnly) return;
    setRolls(rolls.map(r => {
      if (r.rollNo === rollNo) {
        const updatedItems = r.inspectionItems.map((i: any) => {
          if (i.itemCode === itemCode) {
            return { ...i, [field]: val };
          }
          return i;
        });
        return { ...r, inspectionItems: updatedItems };
      }
      return r;
    }));
  };

  const handleSubmit = () => {
    if (!inspectorId) {
      message.warning('請輸入品檢人員員工工號');
      return;
    }

    const hasNg = rolls.some(r => !r.isOk);
    if (hasNg && overallResult === 'AllPass') {
      message.warning('明細中存有異常卷料，判定結果不可為 AllPass (全部通過)！');
      return;
    }

    // 組裝過帳 Payloads
    const payload = {
      overallResult,
      inspectorId: inspectorId.toUpperCase(),
      responsibleParty: overallResult !== 'AllPass' ? (responsibleParty || detail?.supplierCode) : undefined,
      notes,
      rolls: rolls.map(r => ({
        seq: r.seq,
        rollNo: r.rollNo,
        actualQtyAux: r.actualQtyAux,
        isOk: r.isOk,
        measuredThicknessMm: r.measuredThicknessMm,
        measuredCoreDiaMm: r.measuredCoreDiaMm,
        lengthMm: r.lengthMm,
        disposition: r.isOk ? undefined : r.disposition,
        responsibleParty: r.isOk ? undefined : r.responsibleParty,
        inspectionItems: r.inspectionItems.map((i: any) => ({
          itemCode: i.itemCode,
          itemName: i.itemName,
          specification: i.specification,
          measuredValue: i.measuredValue || '',
          isOk: i.isOk
        }))
      }))
    };

    completeMutation.mutate(payload);
  };

  // 5. 數據與看板計算
  const totalRolls = rolls.length;
  const okCount = rolls.filter(r => r.isOk).length;
  const ngCount = totalRolls - okCount;

  // 計算動態退貨總量 (㎡ 或 M 或 PCS)
  const isPoUnitArea = rolls[0]?.isOk ? false : true; // 預計單位
  const totalRejectedQty = rolls
    .filter(r => !r.isOk && r.disposition === 'Rejected')
    .reduce((sum, r) => {
      if (isRollMaterial) {
        // 捲材退長度 (m)，或者退面積 (sqm)
        const area = (r.widthMm / 1000) * r.actualQtyAux;
        return sum + (detail?.unitPrice ? area : r.actualQtyAux);
      } else {
        // 片材退張數
        const area = ((r.widthMm / 1000) * ((r.lengthMm || 0) / 1000)) * r.actualQtyAux;
        return sum + area;
      }
    }, 0);

  const selectedRollData = rolls.find(r => r.rollNo === activeRollNo);

  const columns = [
    {
      title: '卷序 / 卷號',
      dataIndex: 'rollNo',
      key: 'rollNo',
      render: (text: string, record: any) => (
        <Space>
          <Badge status={record.isOk ? 'success' : 'error'} />
          <Text strong={!record.isOk} className={record.isOk ? 'text-slate-700' : 'text-red-500 font-bold'}>
            {text}
          </Text>
        </Space>
      )
    },
    {
      title: '寬度 (mm)',
      dataIndex: 'widthMm',
      key: 'widthMm',
      render: (val: number, record: any) => `${record.widthMm || detail?.standardWidth} mm`
    },
    {
      title: isRollMaterial ? '標準長度 (M)' : '標準包裝量 (PCS)',
      key: 'standardQty',
      render: () => isRollMaterial ? `${detail?.standardLength} M` : `${detail?.standardLength} PCS`
    },
    {
      title: isRollMaterial ? '實際到貨長度 (M)' : '實際到貨張數 (PCS)',
      dataIndex: 'actualQtyAux',
      key: 'actualQtyAux',
      render: (val: number, record: any) => (
        <InputNumber
          value={val}
          controls={false}
          disabled={isReadOnly}
          className="w-32 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all duration-200"
          onFocus={(e) => e.target.select()}
          onChange={(v) => handleQtyChange(record.rollNo, v)}
        />
      )
    },
    {
      title: '實際面積 (㎡)',
      key: 'area',
      render: (_, record: any) => {
        const area = isRollMaterial
          ? ((record.widthMm || detail?.standardWidth) / 1000) * record.actualQtyAux
          : ((record.widthMm || detail?.standardWidth) / 1000) * ((record.lengthMm || detail?.standardLength) / 1000) * record.actualQtyAux;
        return <Text strong className="text-slate-800">{area.toFixed(2)} ㎡</Text>;
      }
    },
    {
      title: '檢驗判定',
      key: 'isOk',
      render: (_, record: any) => (
        <Radio.Group
          value={record.isOk}
          disabled={isReadOnly}
          onChange={(e) => handleStatusChange(record.rollNo, e.target.value)}
          optionType="button"
          buttonStyle="solid"
        >
          <Radio.Button value={true}>合格 (G)</Radio.Button>
          <Radio.Button value={false} className="hover:bg-red-50">異常 (R)</Radio.Button>
        </Radio.Group>
      )
    },
    {
      title: '操作 / 細項',
      key: 'actions',
      render: (_, record: any) => (
        <Button 
          type={activeRollNo === record.rollNo ? 'primary' : 'default'}
          size="small"
          className="rounded"
          onClick={() => setActiveRollNo(activeRollNo === record.rollNo ? null : record.rollNo)}
        >
          {record.isOk ? '查看測量值' : '異常登記 (NCR)'}
        </Button>
      )
    }
  ];

  return (
    <Drawer
      title={
        <div className="flex justify-between items-center w-full pr-8">
          <span>{isReadOnly ? '品質檢驗記錄單備查' : 'IQC 抽樣進料檢驗錄入'}</span>
          {detail?.inspectionStatus && (
            <Tag color={
              detail.inspectionStatus === 'AllPass' ? 'success' : 
              (detail.inspectionStatus === 'Partial' ? 'orange' : 
              (detail.inspectionStatus === 'Reject' ? 'error' : 'warning'))
            }>
              目前狀態：{detail.inspectionStatus}
            </Tag>
          )}
        </div>
      }
      width="85%"
      onClose={onClose}
      open={open}
      destroyOnClose
      maskClosable={false} // 💡 UX規範：Drawer禁止點擊背景關閉，防數據遺失
      footer={
        <div className="flex justify-end gap-3 p-2 bg-white">
          <Button onClick={onClose} size="large" className="rounded-md">返回列表</Button>
          {!isReadOnly && (
            <Button 
              type="primary" 
              size="large" 
              icon={<SaveOutlined />} 
              loading={completeMutation.isPending}
              className="bg-blue-600 hover:bg-blue-500 rounded-md text-white px-8"
              onClick={handleSubmit}
            >
              完成品檢過帳
            </Button>
          )}
        </div>
      }
    >
      <Spin spinning={isLoading}>
        {detail && (
          <div className="space-y-6">
            {/* 上半部：基本資料單頭 */}
            <Card bordered={false} className="bg-slate-50 border border-slate-100 rounded-lg">
              <Row gutter={[16, 16]}>
                <Col span={6}>
                  <Text type="secondary">品檢單號</Text>
                  <div><Text strong className="text-base text-slate-800">{detail.iqcRecordId}</Text></div>
                </Col>
                <Col span={6}>
                  <Text type="secondary">來源進貨單 / 批次</Text>
                  <div><Text strong className="text-base text-slate-800">{detail.sourceDocNumber} / {detail.lotNo}</Text></div>
                </Col>
                <Col span={6}>
                  <Text type="secondary">供應商</Text>
                  <div><Text strong className="text-base text-slate-800">[{detail.supplierCode}] {detail.supplierName}</Text></div>
                </Col>
                <Col span={6}>
                  <Text type="secondary">原料料號 / 品名</Text>
                  <div><Text strong className="text-base text-slate-800">[{detail.materialCode}] {detail.materialName}</Text></div>
                </Col>
              </Row>
              <Divider className="my-3 border-slate-200" />
              <Row gutter={[16, 16]}>
                <Col span={6}>
                  <Text type="secondary">到貨型態 / 標準規格</Text>
                  <div>
                    <Text strong className="text-slate-800">
                      {isRollMaterial ? '捲材 (Coil)' : '片材 (Sheet)'} | 寬 {detail.standardWidth} mm × {isRollMaterial ? `${detail.standardLength} M` : `${detail.standardLength} mm`}
                    </Text>
                  </div>
                </Col>
                <Col span={6}>
                  <Text type="secondary">到貨總包裝量 / 單位單價</Text>
                  <div><Text strong className="text-slate-800">{detail.rollCount} 卷 | NTD {detail.unitPrice?.toFixed(2)} / ㎡</Text></div>
                </Col>
                <Col span={6}>
                  <Text type="secondary">關聯採購單號 / 項次</Text>
                  <div><Text strong className="text-slate-800">{detail.purchaseOrderNumber} | {detail.poLineNumber}</Text></div>
                </Col>
                <Col span={6}>
                  <Text type="secondary">品檢員員工工號</Text>
                  <div className="mt-1">
                    <Input 
                      placeholder="請輸入品檢工號" 
                      value={inspectorId} 
                      disabled={isReadOnly}
                      className="w-48 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                      onChange={(e) => setInspectorId(e.target.value)} 
                    />
                  </div>
                </Col>
              </Row>
            </Card>

            {/* 中部：到貨卷料一卷一列 */}
            <Card title="品質檢驗抽樣與長度測量表" bordered={false} className="shadow-sm rounded-lg">
              <div className="mb-4 flex justify-between items-center bg-slate-50 p-3 rounded border border-slate-100">
                <Text type="secondary">品質抽樣規則：AQL 檢驗（本批 {detail.rollCount} 卷/包，錄入實測值並填寫檢驗數據）。</Text>
                <Space>
                  <Badge status="default" text={`總到貨: ${totalRolls}`} />
                  <Badge status="success" text={`合格: ${okCount}`} />
                  <Badge status="error" text={`異常: ${ngCount}`} />
                </Space>
              </div>

              <Table
                dataSource={rolls}
                columns={columns}
                rowKey="rollNo"
                pagination={false}
                rowClassName={(record) => record.isOk ? 'bg-white' : 'bg-red-50/30'}
              />
            </Card>

            {/* 下半部 (左)：當前選擇卷的「動態品質項目實測」 + (右)「QE決策與採購對帳警告」 */}
            <Row gutter={16}>
              <Col span={14}>
                {selectedRollData && (
                  <Card 
                    title={
                      <Space>
                        <ExclamationCircleOutlined className={selectedRollData.isOk ? "text-blue-500" : "text-red-500"} />
                        <span>卷 <Text code className="font-bold">{selectedRollData.rollNo}</Text> {selectedRollData.isOk ? '品質項目實測錄入' : '進料異常單 (NCR)'}</span>
                      </Space>
                    } 
                    bordered={false} 
                    className={`shadow-sm border-t-4 rounded-lg ${selectedRollData.isOk ? "border-blue-500 bg-blue-50/5" : "border-red-500 bg-red-50/5"}`}
                  >
                    <Form layout="vertical">
                      {/* 動態品檢項目適配 */}
                      {selectedRollData.inspectionItems?.map((item: any, idx: number) => (
                        <div key={item.itemCode} className="grid grid-cols-12 gap-3 mb-3 items-center bg-white p-2 rounded border border-slate-100">
                          <div className="col-span-3">
                            <Text strong className="text-slate-800 text-sm">{item.itemName}</Text>
                          </div>
                          <div className="col-span-3">
                            <Text type="secondary" className="text-xs">規格: {item.specification}</Text>
                          </div>
                          <div className="col-span-4">
                            <Input 
                              placeholder="輸入實測值" 
                              value={item.measuredValue}
                              disabled={isReadOnly}
                              className="focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all duration-200"
                              onChange={(e) => handleMeasuredItemChange(selectedRollData.rollNo, item.itemCode, 'measuredValue', e.target.value)}
                            />
                          </div>
                          <div className="col-span-2 text-right">
                            <Radio.Group 
                              size="small" 
                              value={item.isOk}
                              disabled={isReadOnly}
                              onChange={(e) => handleMeasuredItemChange(selectedRollData.rollNo, item.itemCode, 'isOk', e.target.value)}
                            >
                              <Radio.Button value={true}>OK</Radio.Button>
                              <Radio.Button value={false}>NG</Radio.Button>
                            </Radio.Group>
                          </div>
                        </div>
                      ))}

                      {/* 異常卷的處置與責任歸屬填寫 */}
                      {!selectedRollData.isOk && (
                        <div className="mt-4 p-3 bg-red-50/40 rounded border border-red-100">
                          <Row gutter={16}>
                            <Col span={12}>
                              <Form.Item label="單卷判定不合格處置" required className="mb-0">
                                <Radio.Group 
                                  value={selectedRollData.disposition}
                                  disabled={isReadOnly}
                                  onChange={(e) => {
                                    setRolls(rolls.map(r => r.rollNo === selectedRollData.rollNo ? { ...r, disposition: e.target.value } : r));
                                  }}
                                >
                                  <Radio value="Rejected">退貨 (Rejected)</Radio>
                                  <Radio value="Concession">特採 (Concession)</Radio>
                                </Radio.Group>
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item label="責任歸屬" required className="mb-0">
                                <Select 
                                  value={selectedRollData.responsibleParty}
                                  disabled={isReadOnly}
                                  onChange={(v) => {
                                    setRolls(rolls.map(r => r.rollNo === selectedRollData.rollNo ? { ...r, responsibleParty: v } : r));
                                  }}
                                  options={[
                                    { value: detail.supplierCode, label: `供應商: ${detail.supplierName}` },
                                    { value: 'LOG-DELIVERY', label: '物流商責任' },
                                    { value: 'INTERNAL-OP', label: '內部責任' },
                                  ]}
                                />
                              </Form.Item>
                            </Col>
                          </Row>
                        </div>
                      )}
                    </Form>
                  </Card>
                )}
              </Col>

              <Col span={10}>
                {/* 右側：主管最終品質判定中心與採購扣帳警告 */}
                <Card 
                  title={
                    <Space>
                      <ExclamationCircleOutlined className={ngCount > 0 ? "text-amber-500" : "text-green-500"} />
                      <span>最終品質判定 (QE Disposition)</span>
                    </Space>
                  }
                  bordered={false}
                  className={`shadow-sm border-t-4 rounded-lg ${ngCount > 0 ? "border-amber-500 bg-amber-50/5" : "border-green-500 bg-green-50/5"}`}
                >
                  <Space direction="vertical" className="w-full" size="middle">
                    <div>
                      <Text type="secondary" className="block mb-2">請選擇此批品質檢驗最終判定結果：</Text>
                      <Radio.Group 
                        value={overallResult}
                        disabled={isReadOnly}
                        onChange={(e) => {
                          setOverallResult(e.target.value);
                          if (e.target.value === 'Reject') {
                            setResponsibleParty(detail?.supplierCode);
                          }
                        }}
                        className="w-full flex flex-col gap-3"
                      >
                        <Radio.Button value="AllPass" disabled={ngCount > 0} className="w-full py-2 h-auto flex flex-col items-center">
                          <CheckCircleOutlined className="text-green-500 text-lg mb-1" />
                          <Text strong className="text-green-700">AllPass (全部通過)</Text>
                          <Text type="secondary" className="text-xs">整批無異常，全數建卡並正式入庫。</Text>
                        </Radio.Button>

                        <Radio.Button value="Partial" className="w-full py-2 h-auto flex flex-col items-center">
                          <ExclamationCircleOutlined className="text-amber-500 text-lg mb-1" />
                          <Text strong className="text-amber-700">Partial (部分入庫)</Text>
                          <Text type="secondary" className="text-xs">僅良品/特採建卡入庫。NG卷拒收退回，自動扣除採購到貨量。</Text>
                        </Radio.Button>

                        <Radio.Button value="Reject" className="w-full py-2 h-auto flex flex-col items-center">
                          <CloseCircleOutlined className="text-red-500 text-lg mb-1" />
                          <Text strong className="text-red-700">Reject (全部退回)</Text>
                          <Text type="secondary" className="text-xs">整批拒收，12卷全數不建卡不入庫，採購量全額扣回。</Text>
                        </Radio.Button>
                      </Radio.Group>
                    </div>

                    {/* 當有 NG 卷判定退貨時，彈出剛性對帳與扣款警告 */}
                    {ngCount > 0 && overallResult !== 'AllPass' && (
                      <Alert
                        type="warning"
                        showIcon
                        icon={<WarningOutlined className="text-amber-600 text-lg" />}
                        message={<Text strong className="text-amber-800">採購對帳與扣款安全防護</Text>}
                        description={
                          <Text type="secondary" className="text-xs block mt-1">
                            系統偵測到您將有 <Text strong type="danger">{ngCount}</Text> 卷/包標記為不合格退貨。
                            過帳後將自動扣減採購單 <Text code>{detail?.purchaseOrderNumber}</Text> 
                            已到貨量共 <Text strong type="danger">{totalRejectedQty.toFixed(2)} ㎡</Text>，
                            未交量自動釋放，財務將自動扣款，避免企業資產流失。
                          </Text>
                        }
                      />
                    )}

                    {/* 升級全檢加嚴控制 */}
                    {!isReadOnly && detail?.inspectionStatus === 'Pending' && (
                      <div className="bg-blue-50/50 p-3 rounded border border-blue-100 flex flex-col gap-2">
                        <Text strong className="text-blue-800 text-sm">品質判定模糊？啟動全檢升級</Text>
                        <Text type="secondary" className="text-xs">
                          當抽驗結果不確定時，點擊「啟動 100% 全檢」將使此品檢單解鎖，品檢員必須填寫全部 12 卷實測數據後才能結案。
                        </Text>
                        <Button 
                          type="dashed" 
                          danger 
                          icon={<ArrowRightOutlined />} 
                          className="mt-1"
                          loading={escalateMutation.isPending}
                          onClick={() => escalateMutation.mutate()}
                        >
                          改為全部都驗 (100% Full Inspection)
                        </Button>
                      </div>
                    )}

                    <div>
                      <Text type="secondary" className="block mb-1">品質異常判定責任歸屬 (若有):</Text>
                      <Select 
                        className="w-full"
                        value={responsibleParty} 
                        disabled={isReadOnly || overallResult === 'AllPass'}
                        onChange={setResponsibleParty}
                        options={[
                          { value: detail.supplierCode, label: `供應商: ${detail.supplierName}` },
                          { value: 'LOG-EXPRESS', label: '物流商責任' },
                          { value: 'INTERNAL-OP', label: '內部責任' },
                        ]}
                      />
                    </div>

                    <div>
                      <Text type="secondary" className="block mb-1">品檢判定說明 / NCR 處置備註:</Text>
                      <Input.TextArea 
                        placeholder="請輸入判定與備註" 
                        value={notes} 
                        disabled={isReadOnly}
                        onChange={(e) => setNotes(e.target.value)} 
                        rows={3} 
                      />
                    </div>
                  </Space>
                </Card>
              </Col>
            </Row>
          </div>
        )}
      </Spin>
    </Drawer>
  );
}
