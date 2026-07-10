import React, { useState, useEffect } from "react";
import { Card, Table, Tag, Space, Button, Select, DatePicker, Input, InputNumber, Empty, App, Spin, Badge, Tooltip } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined, SaveOutlined, CheckCircleOutlined, SyncOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getApiV1WorkOrderReturnWoByWorkOrderNumber,
  getApiV1WorkOrderReturnByDocumentNumber,
  postApiV1WorkOrderReturn,
  putApiV1WorkOrderReturnByDocumentNumber,
  postApiV1WorkOrderReturnByDocumentNumberConfirm,
  postApiV1WorkOrderReturnByDocumentNumberCancel,
  deleteApiV1WorkOrderReturnByDocumentNumber,
  getApiV1WorkOrderReturnWipRolls
} from "@/api/generated/sdk.gen";
import { getApiErrorMessage } from "@/utils/apiError";
import dayjs from "dayjs";
import type { WorkOrderDto } from "@/api/generated/types.gen";

interface WorkOrderReturnTabProps {
  masterData: WorkOrderDto;
}

export const WorkOrderReturnTab: React.FC<WorkOrderReturnTabProps> = ({
  masterData,
}) => {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();

  const [activeDocNo, setActiveDocNo] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isHeaderEditing, setIsHeaderEditing] = useState(false);

  // 退料主檔表頭編輯狀態
  const [docDate, setDocDate] = useState<dayjs.Dayjs>(dayjs());
  const [docNotes, setDocNotes] = useState("");

  // 明細項目狀態
  const [items, setItems] = useState<any[]>([]);

  // 1. 取得該製令所有的退料單列表
  const { data: returnsResponse, isLoading: listLoading, refetch: refetchList } = useQuery({
    queryKey: ["returns", masterData.workOrderNumber],
    queryFn: () => getApiV1WorkOrderReturnWoByWorkOrderNumber({
      path: { workOrderNumber: masterData.workOrderNumber! },
    }),
    enabled: !!masterData.workOrderNumber,
  });

  const returnList = (returnsResponse?.data as any)?.data || [];

  // 2. 取得當前選定退料單詳情
  const { data: detailResponse, isLoading: detailLoading, refetch: refetchDetail } = useQuery({
    queryKey: ["return", activeDocNo],
    queryFn: () => getApiV1WorkOrderReturnByDocumentNumber({ path: { documentNumber: activeDocNo! } }),
    enabled: !!activeDocNo && activeDocNo !== "new",
  });

  const activeRecord = (detailResponse?.data as any)?.data || undefined;

  // 3. 自動設定預設選中最新的一張
  useEffect(() => {
    if (returnList.length > 0 && !activeDocNo && !isCreating) {
      setActiveDocNo(returnList[0].documentNumber);
    }
  }, [returnList, activeDocNo, isCreating]);

  // 當選中單據變更時，初始化欄位
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
          targetStorageCode: it.targetStorageCode || "TW-GEN-INV",
          notes: it.notes || "",
          extra,
          wipRolls: [],
          wipLoading: false,
        };
      });
      setItems(mappedItems);
    }
  }, [activeRecord, activeDocNo]);

  // 4. Mutations
  const createMutation = useMutation({
    mutationFn: (values: any) => postApiV1WorkOrderReturn({ body: values }),
    onSuccess: (res: any) => {
      message.success("新增退料單草稿成功");
      queryClient.invalidateQueries({ queryKey: ["returns", masterData.workOrderNumber] });
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
    mutationFn: (values: any) => putApiV1WorkOrderReturnByDocumentNumber({ path: { documentNumber: activeDocNo! }, body: values }),
    onSuccess: () => {
      message.success("更新退料單主檔與明細成功");
      queryClient.invalidateQueries({ queryKey: ["return", activeDocNo] });
      queryClient.invalidateQueries({ queryKey: ["returns", masterData.workOrderNumber] });
      setIsHeaderEditing(false);
      refetchDetail();
      refetchList();
    },
    onError: (error) => {
      modal.error({ title: "儲存失敗", content: getApiErrorMessage(error), centered: true });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteApiV1WorkOrderReturnByDocumentNumber({ path: { documentNumber: activeDocNo! } }),
    onSuccess: () => {
      message.success("刪除退料單成功");
      queryClient.invalidateQueries({ queryKey: ["returns", masterData.workOrderNumber] });
      setActiveDocNo(null);
      setIsCreating(false);
      refetchList();
    },
    onError: (error) => {
      modal.error({ title: "刪除失敗", content: getApiErrorMessage(error), centered: true });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => postApiV1WorkOrderReturnByDocumentNumberConfirm({ path: { documentNumber: activeDocNo! } }),
    onSuccess: () => {
      message.success("退料確認過帳成功！剩餘卷料已還原至倉庫可用狀態");
      queryClient.invalidateQueries({ queryKey: ["return", activeDocNo] });
      queryClient.invalidateQueries({ queryKey: ["returns", masterData.workOrderNumber] });
      refetchDetail();
      refetchList();
    },
    onError: (error) => {
      modal.error({ title: "退料過帳失敗", content: getApiErrorMessage(error), centered: true });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => postApiV1WorkOrderReturnByDocumentNumberCancel({ path: { documentNumber: activeDocNo! } }),
    onSuccess: () => {
      message.success("取消退料過帳成功！LPN 已恢復為車間 WIP 狀態");
      queryClient.invalidateQueries({ queryKey: ["return", activeDocNo] });
      queryClient.invalidateQueries({ queryKey: ["returns", masterData.workOrderNumber] });
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
      message.warning("請至少加入一筆退料明細項目！");
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.materialCode) {
        message.warning("明細中的物料代碼不得為空！");
        return;
      }
      if (it.quantity <= 0) {
        message.warning(`物料 ${it.materialCode} 的退回數量必須大於 0，請勾選下方 WIP 卷卡並輸入退回長度！`);
        return;
      }
    }

    const postData = {
      referenceNumber: masterData.workOrderNumber!,
      documentDate: docDate.format("YYYY-MM-DD"),
      notes: docNotes || "",
      items: items.map((it) => ({
        materialCode: it.materialCode,
        targetStorageCode: it.targetStorageCode,
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

  const handleAddNewItem = () => {
    setItems([
      ...items,
      {
        materialCode: "",
        materialName: "",
        unit: "M",
        quantity: 0,
        referenceQuantity1: 0,
        targetStorageCode: "TW-GEN-INV",
        notes: "",
        extra: [],
        wipRolls: [],
        wipLoading: false,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    const updated = [...items];
    updated.splice(index, 1);
    setItems(updated);
  };

  // 當退料料號變更時，自動獲取該料號在該製令 WIP 狀態中的所有可用卷卡 LPN
  const handleMaterialChange = async (index: number, val: string) => {
    const matched = materialsList.find((x) => x.materialCode === val);
    const updated = [...items];
    updated[index].materialCode = val;
    updated[index].materialName = matched?.materialName || "";
    updated[index].unit = "M";
    updated[index].quantity = 0;
    updated[index].referenceQuantity1 = 0;
    updated[index].extra = [];
    updated[index].wipLoading = true;
    setItems(updated);

    try {
      const res: any = await getApiV1WorkOrderReturnWipRolls({
        query: {
          workOrderNumber: masterData.workOrderNumber!,
          materialCode: val,
        }
      });
      const wipList = res.data?.data || [];
      const updatedAfterFetch = [...items];
      updatedAfterFetch[index].wipRolls = wipList;
      updatedAfterFetch[index].wipLoading = false;
      setItems(updatedAfterFetch);
      if (wipList.length === 0) {
        message.warning(`注意：該料號 ${val} 目前在車間 WIP 現場無任何未結案的物料卷卡！`);
      }
    } catch (e) {
      const updatedAfterFetch = [...items];
      updatedAfterFetch[index].wipLoading = false;
      setItems(updatedAfterFetch);
      message.error("獲取 WIP 卷卡失敗：" + getApiErrorMessage(e));
    }
  };

  const handleWipRollCheck = (index: number, rollNo: string, checked: boolean, defaultQty: number, widthMm: number) => {
    const updated = [...items];
    const item = updated[index];
    if (checked) {
      const exists = item.extra.find((x: any) => x.rollNo === rollNo);
      if (!exists) {
        item.extra.push({
          rollNo,
          widthMm,
          qtyAux: defaultQty,
        });
      }
    } else {
      item.extra = item.extra.filter((x: any) => x.rollNo !== rollNo);
    }

    const totalLen = item.extra.reduce((sum: number, r: any) => sum + r.qtyAux, 0);
    const totalArea = item.extra.reduce((sum: number, r: any) => sum + r.qtyAux * (r.widthMm / 1000), 0);
    item.quantity = parseFloat(totalLen.toFixed(4));
    item.referenceQuantity1 = parseFloat(totalArea.toFixed(4));
    setItems(updated);
  };

  const handleWipRollQtyChange = (index: number, rollNo: string, val: number | null) => {
    const updated = [...items];
    const item = updated[index];
    const roll = item.extra.find((x: any) => x.rollNo === rollNo);
    if (roll) {
      roll.qtyAux = val || 0;
    }

    const totalLen = item.extra.reduce((sum: number, r: any) => sum + r.qtyAux, 0);
    const totalArea = item.extra.reduce((sum: number, r: any) => sum + r.qtyAux * (r.widthMm / 1000), 0);
    item.quantity = parseFloat(totalLen.toFixed(4));
    item.referenceQuantity1 = parseFloat(totalArea.toFixed(4));
    setItems(updated);
  };

  // 篩選製令僅為捲材需求 (退料只支援捲材)
  const filteredMaterials = Array.isArray(masterData.items)
    ? masterData.items.filter((m: any) => m.materialForm === "R").map((x: any) => ({
        materialCode: x.materialCode,
        materialName: x.materialName,
      }))
    : [];

  const materialsList = Array.isArray(masterData.items)
    ? masterData.items.map((x: any) => ({
        materialCode: x.materialCode,
        materialName: x.materialName,
        materialForm: x.materialForm,
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
          <span style={{ fontWeight: "bold", color: "var(--ant-color-text-secondary)" }}>📋 選擇退料單：</span>
          <Select
            style={{ width: "240px" }}
            placeholder="請選擇或新增退料單"
            value={activeDocNo || undefined}
            onChange={(val) => {
              setActiveDocNo(val);
              setIsCreating(false);
              setIsHeaderEditing(false);
            }}
            disabled={isCreating || isHeaderEditing}
          >
            {returnList.map((r: any) => (
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
                setActiveDocNo(returnList.length > 0 ? returnList[0].documentNumber : null);
              }}
            >
              返回
            </Button>
          )}
        </Space>
        {!isCreating && !isHeaderEditing && (
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleCreateNewClick}>
            🆕 新增退料單
          </Button>
        )}
      </div>

      <Spin spinning={listLoading || detailLoading}>
        {!showHeaderForm ? (
          <Empty description="此製令尚未建立任何退料單記錄，請點擊右上方按鈕建立。" className="mt-10" />
        ) : (
          <div className="flex flex-col gap-4">
            {/* 表頭卡片 */}
            <Card
              size="small"
              title={
                <Space>
                  <strong>{isCreating ? "🆕 新增退料單表頭" : `📄 退料單表頭 - ${activeDocNo}`}</strong>
                  {activeRecord && (
                    activeRecord.confirmDate ? (
                      <Tag color="success">🟢 已確認退料</Tag>
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
                      <Button size="small" onClick={() => (isCreating ? setActiveDocNo(returnList.length > 0 ? returnList[0].documentNumber : null) : setIsHeaderEditing(false))}>
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
                            確認退料
                          </Button>
                          <Button danger size="small" icon={<DeleteOutlined />} onClick={() => {
                            modal.confirm({
                              title: "刪除確認",
                              content: "確定要刪除這張退料單草稿嗎？此操作不可逆。",
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
                            content: "確定要取消此退料單過帳嗎？這會把卷卡重新轉回 WIP 現場狀態。",
                            centered: true,
                            onOk: () => cancelMutation.mutate(),
                          });
                        }} loading={cancelMutation.isPending}>
                          取消退料過帳
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
                  <label className="text-gray-400 block mb-1">退料原因 / 備註</label>
                  <Input value={docNotes} onChange={(e) => setDocNotes(e.target.value)} disabled={!isEditable} placeholder="請輸入退料原因與備註說明..." size="small" />
                </div>
              </div>
            </Card>

            {/* 材料明細卡片 */}
            <Card
              size="small"
              title={<strong>📋 退回物料明細 (*僅支援卷料)</strong>}
              extra={
                isEditable && (
                  <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={handleAddNewItem}>
                    新增退回物料
                  </Button>
                )
              }
            >
              <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                {items.length === 0 ? (
                  <Empty description="尚未加入任何退料明細項目，請點選右上方新增項目。" style={{ padding: "20px 0" }} />
                ) : (
                  items.map((it, idx) => {
                    return (
                      <Card
                        key={idx}
                        size="small"
                        type="inner"
                        title={
                          <div className="flex justify-between items-center">
                            <Space>
                              <Badge count={idx + 1} style={{ backgroundColor: "#fa8c16" }} />
                              <strong>{it.materialName || "請選擇料號"}</strong>
                              {it.materialCode && <Tag color="orange">{it.materialCode}</Tag>}
                            </Space>
                            {isEditable && (
                              <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => handleRemoveItem(idx)} />
                            )}
                          </div>
                        }
                      >
                        <div className="grid grid-cols-4 gap-4 mb-3">
                          <div>
                            <label className="text-gray-400 block mb-1 text-xs">原料料號</label>
                            <Select
                              style={{ width: "100%" }}
                              placeholder="請選擇退回原料"
                              value={it.materialCode || undefined}
                              onChange={(val) => handleMaterialChange(idx, val)}
                              disabled={!isEditable}
                              size="small"
                            >
                              {filteredMaterials.map((m: any) => (
                                <Select.Option key={m.materialCode} value={m.materialCode}>
                                  {m.materialCode} (捲材)
                                </Select.Option>
                              ))}
                            </Select>
                          </div>
                          <div>
                            <label className="text-gray-400 block mb-1 text-xs">退回目的儲位</label>
                            <Select
                              style={{ width: "100%" }}
                              value={it.targetStorageCode}
                              onChange={(v) => {
                                const updated = [...items];
                                updated[idx].targetStorageCode = v;
                                setItems(updated);
                              }}
                              disabled={!isEditable}
                              size="small"
                            >
                              <Select.Option value="TW-GEN-INV">原料主倉 (TW-GEN-INV)</Select.Option>
                            </Select>
                          </div>
                          <div>
                            <label className="text-gray-400 block mb-1 text-xs">退回總長度 (M)</label>
                            <Tooltip title="由下方勾選的 WIP 卷卡實測剩餘長度自動累加">
                              <InputNumber style={{ width: "100%" }} value={it.quantity} disabled={true} size="small" />
                            </Tooltip>
                          </div>
                          <div>
                            <label className="text-gray-400 block mb-1 text-xs">退回總面積 (SQM)</label>
                            <InputNumber style={{ width: "100%" }} value={it.referenceQuantity1} disabled={true} size="small" />
                          </div>
                        </div>

                        {/* 選擇車間現場正在 WIP 狀態的 LPN 列表 */}
                        {it.materialCode && (
                          <div style={{ backgroundColor: "var(--ant-color-fill-alter)", padding: "12px", borderRadius: "6px" }}>
                            <div style={{ fontSize: "12px", fontWeight: "bold", color: "var(--ant-color-text-secondary)", marginBottom: "8px" }}>
                              🌀 勾選欲辦理退料回庫的 WIP 現場卷卡 (LPN)
                            </div>
                            <Spin spinning={it.wipLoading || false}>
                              {!isEditable ? (
                                <Table
                                  size="small"
                                  dataSource={it.extra}
                                  pagination={false}
                                  rowKey="rollNo"
                                  columns={[
                                    { title: "物料卷卡號 (LPN)", dataIndex: "rollNo", key: "rollNo" },
                                    { title: "規格寬度", dataIndex: "widthMm", key: "widthMm", render: (v) => `${v} mm` },
                                    { title: "退回實測剩餘長度 (M)", dataIndex: "qtyAux", key: "qtyAux", render: (v) => <strong>{v} M</strong> },
                                  ]}
                                />
                              ) : (
                                <Table
                                  size="small"
                                  dataSource={it.wipRolls || []}
                                  pagination={false}
                                  rowKey="rollNo"
                                  locale={{ emptyText: "目前在 WIP 現場無任何可供退回的卷卡" }}
                                  rowSelection={{
                                    type: "checkbox",
                                    selectedRowKeys: it.extra.map((x: any) => x.rollNo),
                                    onSelect: (rec: any, selected: boolean) => {
                                      handleWipRollCheck(idx, rec.rollNo, selected, rec.qtyAux, rec.widthMm);
                                    },
                                    onSelectAll: (selected: boolean, selectedRowsList: any[]) => {
                                      const updated = [...items];
                                      if (selected) {
                                        updated[idx].extra = selectedRowsList.map((r: any) => ({
                                          rollNo: r.rollNo,
                                          widthMm: r.widthMm,
                                          qtyAux: r.qtyAux,
                                        }));
                                      } else {
                                        updated[idx].extra = [];
                                      }
                                      const totalLen = updated[idx].extra.reduce((sum: number, r: any) => sum + r.qtyAux, 0);
                                      const totalArea = updated[idx].extra.reduce((sum: number, r: any) => sum + r.qtyAux * (r.widthMm / 1000), 0);
                                      updated[idx].quantity = parseFloat(totalLen.toFixed(4));
                                      updated[idx].referenceQuantity1 = parseFloat(totalArea.toFixed(4));
                                      setItems(updated);
                                    },
                                  }}
                                  columns={[
                                    { title: "物料卷卡號 (LPN)", dataIndex: "rollNo", key: "rollNo" },
                                    { title: "WIP 寬度", dataIndex: "widthMm", key: "widthMm", render: (v) => `${v} mm` },
                                    { title: "WIP 現場剩餘量", dataIndex: "qtyAux", key: "qtyAux", render: (v) => <span>{v} M</span> },
                                    {
                                      title: "退回實測長度 (M)",
                                      key: "returnedQty",
                                      render: (_, rec: any) => {
                                        const checked = it.extra.find((x: any) => x.rollNo === rec.rollNo);
                                        return (
                                          <InputNumber
                                            size="small"
                                            style={{ width: "130px" }}
                                            placeholder="請輸入退回實測量"
                                            disabled={!checked}
                                            value={checked ? checked.qtyAux : undefined}
                                            max={rec.qtyAux}
                                            min={0}
                                            onChange={(val) => handleWipRollQtyChange(idx, rec.rollNo, val)}
                                          />
                                        );
                                      },
                                    },
                                  ]}
                                />
                              )}
                            </Spin>
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
    </div>
  );
};
