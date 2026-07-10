import React, { useState, useEffect } from "react";
import { Card, Table, Tag, Space, Button, Select, DatePicker, Input, InputNumber, Empty, App, Spin, Badge, Tooltip } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined, SaveOutlined, CheckCircleOutlined, SyncOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getApiV1WorkOrderRequisitionWoByWorkOrderNumber,
  getApiV1WorkOrderRequisitionByDocumentNumber,
  postApiV1WorkOrderRequisition,
  putApiV1WorkOrderRequisitionByDocumentNumber,
  postApiV1WorkOrderRequisitionByDocumentNumberConfirm,
  postApiV1WorkOrderRequisitionByDocumentNumberCancel,
  deleteApiV1WorkOrderRequisitionByDocumentNumber,
  getApiV1WorkOrderRequisitionFifo
} from "@/api/generated/sdk.gen";
import { getApiErrorMessage } from "@/utils/apiError";
import dayjs from "dayjs";
import { RollSubstitutionPicker } from "./RollSubstitutionPicker";
import type { WorkOrderDto } from "@/api/generated/types.gen";

interface WorkOrderRequisitionTabProps {
  masterData: WorkOrderDto;
}

export const WorkOrderRequisitionTab: React.FC<WorkOrderRequisitionTabProps> = ({
  masterData,
}) => {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();

  const [activeDocNo, setActiveDocNo] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isHeaderEditing, setIsHeaderEditing] = useState(false);

  // 領料主檔表頭編輯狀態
  const [docDate, setDocDate] = useState<dayjs.Dayjs>(dayjs());
  const [docNotes, setDocNotes] = useState("");

  // 明細項目狀態
  const [items, setItems] = useState<any[]>([]);
  const [selectedMaterialIndex, setSelectedMaterialIndex] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // 1. 取得該製令所有的領料單列表
  const { data: requisitionsResponse, isLoading: listLoading, refetch: refetchList } = useQuery({
    queryKey: ["requisitions", masterData.workOrderNumber],
    queryFn: () => getApiV1WorkOrderRequisitionWoByWorkOrderNumber({
      path: { workOrderNumber: masterData.workOrderNumber! },
    }),
    enabled: !!masterData.workOrderNumber,
  });

  const requisitionList = (requisitionsResponse?.data as any)?.data || [];

  // 2. 取得當前選定領料單詳情
  const { data: detailResponse, isLoading: detailLoading, refetch: refetchDetail } = useQuery({
    queryKey: ["requisition", activeDocNo],
    queryFn: () => getApiV1WorkOrderRequisitionByDocumentNumber({ path: { documentNumber: activeDocNo! } }),
    enabled: !!activeDocNo && activeDocNo !== "new",
  });

  const activeRecord = (detailResponse?.data as any)?.data || undefined;

  // 3. 自動設定預設選中最新的一張
  useEffect(() => {
    if (requisitionList.length > 0 && !activeDocNo && !isCreating) {
      setActiveDocNo(requisitionList[0].documentNumber);
    }
  }, [requisitionList, activeDocNo, isCreating]);

  // 當選中單據變更時，初始化表頭與明細欄位
  useEffect(() => {
    if (activeRecord && activeDocNo !== "new") {
      setDocDate(dayjs(activeRecord.documentDate));
      setDocNotes(activeRecord.notes || "");
      setIsHeaderEditing(false);

      // 解析 items
      const mappedItems = (activeRecord.items || []).map((it: any) => {
        let extra = [];
        try {
          if (it.extraDataJson) {
            extra = JSON.parse(it.extraDataJson);
          }
        } catch (e) {
          extra = [];
        }
        return {
          materialCode: it.materialCode,
          materialName: it.materialName,
          unit: it.unit,
          quantity: it.quantity,
          referenceQuantity1: it.referenceQuantity1,
          sourceStorageCode: it.sourceStorageCode || "TW-GEN-INV",
          notes: it.notes || "",
          extra,
        };
      });
      setItems(mappedItems);
    }
  }, [activeRecord, activeDocNo]);

  // 4. Mutations
  const createMutation = useMutation({
    mutationFn: (values: any) => postApiV1WorkOrderRequisition({ body: values }),
    onSuccess: (res: any) => {
      message.success("新增領料單草稿成功");
      queryClient.invalidateQueries({ queryKey: ["requisitions", masterData.workOrderNumber] });
      setIsCreating(false);
      const newDocNo = res.data?.data?.documentNumber;
      if (newDocNo) {
        setActiveDocNo(newDocNo);
      }
      refetchList();
    },
    onError: (error) => {
      modal.error({ title: "儲存失敗", content: getApiErrorMessage(error), centered: true });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: any) => putApiV1WorkOrderRequisitionByDocumentNumber({ path: { documentNumber: activeDocNo! }, body: values }),
    onSuccess: () => {
      message.success("更新領料單主檔與明細成功");
      queryClient.invalidateQueries({ queryKey: ["requisition", activeDocNo] });
      queryClient.invalidateQueries({ queryKey: ["requisitions", masterData.workOrderNumber] });
      setIsHeaderEditing(false);
      refetchDetail();
      refetchList();
    },
    onError: (error) => {
      modal.error({ title: "儲存失敗", content: getApiErrorMessage(error), centered: true });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteApiV1WorkOrderRequisitionByDocumentNumber({ path: { documentNumber: activeDocNo! } }),
    onSuccess: () => {
      message.success("刪除領料單成功");
      queryClient.invalidateQueries({ queryKey: ["requisitions", masterData.workOrderNumber] });
      setActiveDocNo(null);
      setIsCreating(false);
      refetchList();
    },
    onError: (error) => {
      modal.error({ title: "刪除失敗", content: getApiErrorMessage(error), centered: true });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => postApiV1WorkOrderRequisitionByDocumentNumberConfirm({ path: { documentNumber: activeDocNo! } }),
    onSuccess: () => {
      message.success("領料過帳確認成功！一卷一卡已流轉至 WIP 狀態");
      queryClient.invalidateQueries({ queryKey: ["requisition", activeDocNo] });
      queryClient.invalidateQueries({ queryKey: ["requisitions", masterData.workOrderNumber] });
      refetchDetail();
      refetchList();
    },
    onError: (error) => {
      modal.error({ title: "過帳失敗", content: getApiErrorMessage(error), centered: true });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => postApiV1WorkOrderRequisitionByDocumentNumberCancel({ path: { documentNumber: activeDocNo! } }),
    onSuccess: () => {
      message.success("取消領料過帳成功！WIP 卷料已安全退回倉庫");
      queryClient.invalidateQueries({ queryKey: ["requisition", activeDocNo] });
      queryClient.invalidateQueries({ queryKey: ["requisitions", masterData.workOrderNumber] });
      refetchDetail();
      refetchList();
    },
    onError: (error) => {
      modal.error({ title: "取消失敗", content: getApiErrorMessage(error), centered: true });
    },
  });

  const handleCreateNewClick = () => {
    setActiveDocNo("new");
    setIsCreating(true);
    setDocDate(dayjs());
    setDocNotes("");
    setItems([]);
  };

  const handleSave = () => {
    if (items.length === 0) {
      message.warning("請至少加入一筆領料明細項目！");
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.materialCode) {
        message.warning("明細中的物料代碼不得為空！");
        return;
      }
      if (it.quantity <= 0) {
        message.warning(`物料 ${it.materialCode} 的領用數量必須大於 0！`);
        return;
      }
    }

    const postData = {
      referenceNumber: masterData.workOrderNumber!,
      documentDate: docDate.format("YYYY-MM-DD"),
      notes: docNotes || "",
      items: items.map((it) => ({
        materialCode: it.materialCode,
        sourceStorageCode: it.sourceStorageCode,
        notes: it.notes,
        extraDataJson: JSON.stringify(it.extra),
      })),
    };

    if (isCreating) {
      createMutation.mutate(postData);
    } else {
      updateMutation.mutate(postData);
    }
  };

  // 💡 FIFO 自動配料一鍵完成
  const handleFifoAutoAllocate = async (index: number, materialCode: string, requiredQty: number, widthMm: number) => {
    if (!requiredQty || requiredQty <= 0) {
      message.warning("請先輸入所需長度，再點擊 FIFO 配料！");
      return;
    }
    try {
      const res: any = await getApiV1WorkOrderRequisitionFifo({
        query: {
          materialCode,
          requiredLength: requiredQty,
          requiredWidth: widthMm || undefined,
        } as any
      });
      const allocated = res.data?.data || [];
      if (allocated.length === 0) {
        message.error("原料倉庫中無足夠的可用 LPN 卷卡可供 FIFO 配料！");
        return;
      }

      const updated = [...items];
      updated[index].extra = allocated;
      const totalLen = allocated.reduce((sum: number, r: any) => sum + r.qtyAux, 0);
      const totalArea = allocated.reduce((sum: number, r: any) => sum + r.qtyAux * (r.widthMm / 1000), 0);

      updated[index].quantity = totalLen;
      updated[index].referenceQuantity1 = totalArea;
      setItems(updated);
      message.success(`FIFO 自動配料成功！共為您選中了 ${allocated.length} 卷可用卷卡`);
    } catch (e) {
      message.error("自動配料失敗：" + getApiErrorMessage(e));
    }
  };

  const handleAddNewItem = () => {
    setItems([
      ...items,
      {
        materialCode: "",
        materialName: "",
        unit: "M",
        quantity: 0,
        referenceQuantity1: 0,
        sourceStorageCode: "TW-GEN-INV",
        notes: "",
        extra: [],
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    const updated = [...items];
    updated.splice(index, 1);
    setItems(updated);
  };

  const handleMaterialChange = (index: number, val: string) => {
    const matched = materialsList.find((x) => x.materialCode === val);
    const updated = [...items];
    updated[index].materialCode = val;
    updated[index].materialName = matched?.materialName || "";
    updated[index].unit = matched?.materialForm === "R" ? "M" : "PCS";
    updated[index].quantity = 0;
    updated[index].referenceQuantity1 = 0;
    updated[index].extra = matched?.materialForm === "R" ? [] : [{ widthMm: matched?.widthMm || 0, lengthMm: 0, thicknessMm: 0 }];
    setItems(updated);
  };

  const handleSheetSpecChange = (index: number, field: string, val: number) => {
    const updated = [...items];
    const spec = updated[index].extra[0] || { widthMm: 0, lengthMm: 0, thicknessMm: 0 };
    spec[field] = val;
    updated[index].extra = [spec];

    const qty = updated[index].quantity || 0;
    const area = (spec.widthMm / 1000) * (spec.lengthMm / 1000) * qty;
    updated[index].referenceQuantity1 = parseFloat(area.toFixed(4));
    setItems(updated);
  };

  const handleSheetQuantityChange = (index: number, val: number | null) => {
    const updated = [...items];
    updated[index].quantity = val || 0;
    const spec = updated[index].extra[0] || { widthMm: 0, lengthMm: 0, thicknessMm: 0 };

    const area = (spec.widthMm / 1000) * (spec.lengthMm / 1000) * (val || 0);
    updated[index].referenceQuantity1 = parseFloat(area.toFixed(4));
    setItems(updated);
  };

  const openRollPicker = (index: number) => {
    setSelectedMaterialIndex(index);
    setPickerOpen(true);
  };

  const handleRollsSelected = (selectedRolls: any[]) => {
    if (selectedMaterialIndex === null) return;
    const updated = [...items];
    const item = updated[selectedMaterialIndex];

    const mappedExtra = selectedRolls.map((r) => ({
      rollNo: r.rollNo,
      widthMm: r.widthMm,
      qtyAux: r.currentQtyAux,
    }));

    item.extra = mappedExtra;
    const totalLen = mappedExtra.reduce((sum: number, r: any) => sum + r.qtyAux, 0);
    const totalArea = mappedExtra.reduce((sum: number, r: any) => sum + r.qtyAux * (r.widthMm / 1000), 0);

    item.quantity = parseFloat(totalLen.toFixed(4));
    item.referenceQuantity1 = parseFloat(totalArea.toFixed(4));

    setItems(updated);
  };

  // 整理製令的應發料號列表
  const materialsList = Array.isArray(masterData.items)
    ? masterData.items.map((x: any) => ({
        materialCode: x.materialCode,
        materialName: x.materialName,
        materialForm: x.materialForm,
        widthMm: x.materialWidth,
      }))
    : [];

  const showHeaderForm = isCreating || !!activeDocNo;
  const isEditable = isCreating || isHeaderEditing;
  const isPosted = activeRecord && !!activeRecord.confirmDate;

  return (
    <div className="flex flex-col gap-4">
      {/* 頂部單據篩選與建立控制區 */}
      <div className="flex justify-between items-center py-2 px-3" style={{ backgroundColor: "var(--ant-color-fill-alter)", borderRadius: "6px" }}>
        <Space>
          <span style={{ fontWeight: "bold", color: "var(--ant-color-text-secondary)" }}>📋 選擇領料單：</span>
          <Select
            style={{ width: "240px" }}
            placeholder="請選擇或新增領料單"
            value={activeDocNo || undefined}
            onChange={(val) => {
              setActiveDocNo(val);
              setIsCreating(false);
              setIsHeaderEditing(false);
            }}
            disabled={isCreating || isHeaderEditing}
          >
            {requisitionList.map((r: any) => (
              <Select.Option key={r.documentNumber} value={r.documentNumber}>
                {r.documentNumber} ({r.confirmDate ? "已過帳" : "草稿"})
              </Select.Option>
            ))}
          </Select>
          {(isCreating || isHeaderEditing) && (
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => {
                setIsCreating(false);
                setIsHeaderEditing(false);
                setActiveDocNo(requisitionList.length > 0 ? requisitionList[0].documentNumber : null);
              }}
            >
              返回
            </Button>
          )}
        </Space>
        {!isCreating && !isHeaderEditing && (
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleCreateNewClick}>
            🆕 新增領料單
          </Button>
        )}
      </div>

      <Spin spinning={listLoading || detailLoading}>
        {!showHeaderForm ? (
          <Empty description="此製令尚未建立任何領料單記錄，請點擊右上方按鈕建立。" className="mt-10" />
        ) : (
          <div className="flex flex-col gap-4">
            {/* 類似產品與 BOM 的表頭配置 */}
            <Card
              size="small"
              title={
                <Space>
                  <strong>{isCreating ? "🆕 新增領料單表頭" : `📄 領料單表頭 - ${activeDocNo}`}</strong>
                  {activeRecord && (
                    activeRecord.confirmDate ? (
                      <Tag color="success">🟢 已確認過帳</Tag>
                    ) : (
                      <Tag color="default">⚪ 草稿 (Draft)</Tag>
                    )
                  )}
                </Space>
              }
              extra={
                <Space>
                  {isEditable ? (
                    <>
                      <Button type="primary" size="small" icon={<SaveOutlined />} onClick={handleSave} loading={createMutation.isPending || updateMutation.isPending}>
                        儲存草稿
                      </Button>
                      <Button size="small" onClick={() => (isCreating ? setActiveDocNo(requisitionList.length > 0 ? requisitionList[0].documentNumber : null) : setIsHeaderEditing(false))}>
                        取消
                      </Button>
                    </>
                  ) : (
                    <>
                      {!isPosted && (
                        <>
                          <Button type="primary" size="small" icon={<EditOutlined />} onClick={() => setIsHeaderEditing(true)}>
                            編輯表頭/明細
                          </Button>
                          <Button type="primary" size="small" className="bg-green-600 hover:bg-green-700 border-green-600" icon={<CheckCircleOutlined />} onClick={() => confirmMutation.mutate()} loading={confirmMutation.isPending}>
                            確認過帳
                          </Button>
                          <Button danger size="small" icon={<DeleteOutlined />} onClick={() => {
                            modal.confirm({
                              title: "刪除確認",
                              content: "確定要刪除這張領料單草稿嗎？此操作不可逆。",
                              centered: true,
                              onOk: () => deleteMutation.mutate(),
                            });
                          }} loading={deleteMutation.isPending}>
                            刪除草稿
                          </Button>
                        </>
                      )}
                      {isPosted && (
                        <Button danger size="small" icon={<SyncOutlined />} onClick={() => {
                          modal.confirm({
                            title: "取消過帳確認",
                            content: "確定要取消此領料單過帳嗎？這會把 WIP 卷卡重新退回倉庫 Available 狀態。",
                            centered: true,
                            onOk: () => cancelMutation.mutate(),
                          });
                        }} loading={cancelMutation.isPending}>
                          取消領料過帳
                        </Button>
                      )}
                    </>
                  )}
                </Space>
              }
            >
              <div className="grid grid-cols-3 gap-4 py-2">
                <div>
                  <label className="text-gray-400 block mb-1">單據日期</label>
                  <DatePicker style={{ width: "100%" }} value={docDate} onChange={(d) => d && setDocDate(d)} disabled={!isEditable} size="small" />
                </div>
                <div className="col-span-2">
                  <label className="text-gray-400 block mb-1">備註說明</label>
                  <Input value={docNotes} onChange={(e) => setDocNotes(e.target.value)} disabled={!isEditable} placeholder="請輸入領料備註事項..." size="small" />
                </div>
              </div>
            </Card>

            {/* 類似 BOM tab 設計的領料明細面板 */}
            <Card
              size="small"
              title={<strong>📋 領料物料明細 (材料明細)</strong>}
              extra={
                isEditable && (
                  <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={handleAddNewItem}>
                    新增領用物料
                  </Button>
                )
              }
            >
              <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                {items.length === 0 ? (
                  <Empty description="尚未加入任何領用物料項目，請點選右上方新增項目。" style={{ padding: "20px 0" }} />
                ) : (
                  items.map((it, idx) => {
                    const matchedMaterial = materialsList.find((x) => x.materialCode === it.materialCode);
                    const isRoll = matchedMaterial ? matchedMaterial.materialForm === "R" : it.unit === "M";

                    return (
                      <Card
                        key={idx}
                        size="small"
                        type="inner"
                        title={
                          <div className="flex justify-between items-center">
                            <Space>
                              <Badge count={idx + 1} style={{ backgroundColor: "#1677ff" }} />
                              <strong>{it.materialName || "請選擇料號"}</strong>
                              {it.materialCode && <Tag color="blue">{it.materialCode}</Tag>}
                            </Space>
                            {isEditable && (
                              <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => handleRemoveItem(idx)} />
                            )}
                          </div>
                        }
                      >
                        <div className="grid grid-cols-4 gap-4 mb-3">
                          <div>
                            <label className="text-gray-400 block mb-1 text-xs">領用原料料號</label>
                            <Select
                              style={{ width: "100%" }}
                              placeholder="請選擇需求原料"
                              value={it.materialCode || undefined}
                              onChange={(val) => handleMaterialChange(idx, val)}
                              disabled={!isEditable}
                              size="small"
                            >
                              {materialsList.map((m) => (
                                <Select.Option key={m.materialCode} value={m.materialCode}>
                                  {m.materialCode} ({m.materialForm === "R" ? "捲材" : "片材"})
                                </Select.Option>
                              ))}
                            </Select>
                          </div>
                          <div>
                            <label className="text-gray-400 block mb-1 text-xs">來源儲位</label>
                            <Select
                              style={{ width: "100%" }}
                              value={it.sourceStorageCode}
                              onChange={(v) => {
                                const updated = [...items];
                                updated[idx].sourceStorageCode = v;
                                setItems(updated);
                              }}
                              disabled={!isEditable}
                              size="small"
                            >
                              <Select.Option value="TW-GEN-INV">原料主倉 (TW-GEN-INV)</Select.Option>
                              <Select.Option value="TW-WIP-GEN">現場車間倉 (TW-WIP-GEN)</Select.Option>
                            </Select>
                          </div>
                          <div>
                            <label className="text-gray-400 block mb-1 text-xs">領用數量 ({it.unit})</label>
                            {isRoll ? (
                              <Tooltip title="捲材為一卷一卡控制，此數值由下方選用卷卡自動累計">
                                <InputNumber style={{ width: "100%" }} value={it.quantity} disabled={true} size="small" />
                              </Tooltip>
                            ) : (
                              <InputNumber
                                style={{ width: "100%" }}
                                placeholder="請輸入領用片數"
                                value={it.quantity}
                                min={1}
                                onChange={(val) => handleSheetQuantityChange(idx, val)}
                                disabled={!isEditable}
                                size="small"
                              />
                            )}
                          </div>
                          <div>
                            <label className="text-gray-400 block mb-1 text-xs">領用面積 (SQM)</label>
                            <InputNumber style={{ width: "100%" }} value={it.referenceQuantity1} disabled={true} size="small" />
                          </div>
                        </div>

                        {/* 捲材：一卷一卡 LPN 卷卡選擇器 */}
                        {isRoll && it.materialCode && (
                          <div style={{ backgroundColor: "var(--ant-color-fill-alter)", padding: "12px", borderRadius: "6px" }}>
                            <div className="flex justify-between items-center mb-2">
                              <span style={{ fontSize: "12px", fontWeight: "bold", color: "var(--ant-color-text-secondary)" }}>
                                🌀 捲材實體卡追溯 LPN (已選 {it.extra?.length || 0} 卷)
                              </span>
                              {isEditable && (
                                <Space>
                                  <Button
                                    size="small"
                                    type="primary"
                                    ghost
                                    icon={<PlusOutlined />}
                                    onClick={() => openRollPicker(idx)}
                                  >
                                    智慧挑選卷卡
                                  </Button>
                                  <InputNumber
                                    size="small"
                                    style={{ width: "120px" }}
                                    placeholder="FIFO 需求(米)"
                                    id={`tab-fifo-input-${idx}`}
                                  />
                                  <Button
                                    size="small"
                                    type="dashed"
                                    onClick={() => {
                                      const reqLen = (document.getElementById(`tab-fifo-input-${idx}`) as HTMLInputElement)?.value;
                                      handleFifoAutoAllocate(idx, it.materialCode, parseFloat(reqLen), matchedMaterial?.widthMm || 0);
                                    }}
                                  >
                                    一鍵 FIFO 配料
                                  </Button>
                                </Space>
                              )}
                            </div>
                            {it.extra && it.extra.length > 0 ? (
                              <Table
                                size="small"
                                dataSource={it.extra}
                                pagination={false}
                                rowKey="rollNo"
                                columns={[
                                  { title: "物料卷卡號 (LPN)", dataIndex: "rollNo", key: "rollNo" },
                                  { title: "實體規格寬度", dataIndex: "widthMm", key: "widthMm", render: (v) => `${v} mm` },
                                  { title: "領用長度 (M)", dataIndex: "qtyAux", key: "qtyAux", render: (v) => <strong>{v} M</strong> },
                                ]}
                              />
                            ) : (
                              <div style={{ padding: "8px 0", textAlign: "center", color: "var(--ant-color-text-placeholder)", fontSize: "12px" }}>
                                目前尚未選擇任何實體物料卷卡，請點選上方按鈕挑選！
                              </div>
                            )}
                          </div>
                        )}

                        {/* 片材：規格參數設定 */}
                        {!isRoll && it.materialCode && (
                          <div style={{ backgroundColor: "var(--ant-color-fill-alter)", padding: "12px", borderRadius: "6px" }}>
                            <div style={{ fontSize: "12px", fontWeight: "bold", color: "var(--ant-color-text-secondary)", marginBottom: "8px" }}>
                              🔮 片材規格參數
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <label className="text-gray-400 block mb-1 text-xs">片料寬度 (mm)</label>
                                <InputNumber
                                  style={{ width: "100%" }}
                                  value={it.extra[0]?.widthMm}
                                  onChange={(val) => handleSheetSpecChange(idx, "widthMm", val || 0)}
                                  disabled={!isEditable}
                                  size="small"
                                />
                              </div>
                              <div>
                                <label className="text-gray-400 block mb-1 text-xs">片料長度 (mm)</label>
                                <InputNumber
                                  style={{ width: "100%" }}
                                  value={it.extra[0]?.lengthMm}
                                  onChange={(val) => handleSheetSpecChange(idx, "lengthMm", val || 0)}
                                  disabled={!isEditable}
                                  size="small"
                                />
                              </div>
                              <div>
                                <label className="text-gray-400 block mb-1 text-xs">厚度 (mm)</label>
                                <InputNumber
                                  style={{ width: "100%" }}
                                  value={it.extra[0]?.thicknessMm}
                                  onChange={(val) => handleSheetSpecChange(idx, "thicknessMm", val || 0)}
                                  disabled={!isEditable}
                                  size="small"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })
                )}
              </Space>
            </Card>
          </div>
        )}
      </Spin>

      {/* 智慧 LPN 卷卡選擇 Modal */}
      {pickerOpen && selectedMaterialIndex !== null && (
        <RollSubstitutionPicker
          visible={pickerOpen}
          materialCode={items[selectedMaterialIndex]?.materialCode}
          requiredWidth={materialsList.find((x) => x.materialCode === items[selectedMaterialIndex]?.materialCode)?.widthMm}
          selectedRollNos={(items[selectedMaterialIndex]?.extra || []).map((x: any) => x.rollNo)}
          onCancel={() => setPickerOpen(false)}
          onSelect={handleRollsSelected}
        />
      )}
    </div>
  );
};
