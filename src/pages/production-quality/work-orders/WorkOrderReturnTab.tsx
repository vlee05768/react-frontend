import React, { useState, useEffect } from "react";
import { Card, Table, Tag, Space, Button, Empty, App, Spin, Badge, InputNumber } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined, SaveOutlined, CheckCircleOutlined, SyncOutlined } from "@ant-design/icons";
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
import { DynamicForm } from "@/components/Form/DynamicForm";
import { returnHeaderFormConfig, returnItemFormConfig } from "./WorkOrderConfig";

interface WorkOrderReturnTabProps {
  masterData: WorkOrderDto;
}

export const WorkOrderReturnTab: React.FC<WorkOrderReturnTabProps> = ({
  masterData,
}) => {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();

  const [isCreating, setIsCreating] = useState(false);
  const [isHeaderEditing, setIsHeaderEditing] = useState(false);

  // 退料主檔表頭編輯狀態
  const [docDate, setDocDate] = useState<dayjs.Dayjs>(dayjs());
  const [docNotes, setDocNotes] = useState("");

  // 明細項目狀態
  const [items, setItems] = useState<any[]>([]);

  // 1. 取得該製令的退料單列表 (1對1，拿第一筆)
  const { data: returnsResponse, isLoading: listLoading, refetch: refetchList } = useQuery({
    queryKey: ["returns", masterData.workOrderNumber],
    queryFn: () => getApiV1WorkOrderReturnWoByWorkOrderNumber({
      path: { workOrderNumber: masterData.workOrderNumber! },
    }),
    enabled: !!masterData.workOrderNumber,
  });

  const returnList = (returnsResponse?.data as any)?.data || [];
  const activeDocNo = returnList.length > 0 ? returnList[0].documentNumber : null;

  // 2. 取得單據詳情
  const { data: detailResponse, isLoading: detailLoading, refetch: refetchDetail } = useQuery({
    queryKey: ["return", activeDocNo],
    queryFn: () => getApiV1WorkOrderReturnByDocumentNumber({ path: { documentNumber: activeDocNo! } }),
    enabled: !!activeDocNo,
  });

  const activeRecord = (detailResponse?.data as any)?.data || undefined;

  // 初始化或載入表頭/明細
  useEffect(() => {
    if (activeRecord) {
      setDocDate(dayjs(activeRecord.documentDate));
      setDocNotes(activeRecord.notes || "");
      setIsHeaderEditing(false);

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
  }, [activeRecord]);

  // 3. Mutations
  const createMutation = useMutation({
    mutationFn: (values: any) => postApiV1WorkOrderReturn({ body: values }),
    onSuccess: () => {
      message.success("退料單建立成功！");
      queryClient.invalidateQueries({ queryKey: ["returns", masterData.workOrderNumber] });
      setIsCreating(false);
      refetchList();
    },
    onError: (error) => {
      modal.error({ title: "建立失敗", content: getApiErrorMessage(error), centered: true });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: any) => putApiV1WorkOrderReturnByDocumentNumber({ path: { documentNumber: activeDocNo! }, body: values }),
    onSuccess: () => {
      message.success("儲存修改成功！");
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
      message.success("退料單刪除成功");
      queryClient.invalidateQueries({ queryKey: ["returns", masterData.workOrderNumber] });
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
      <Spin spinning={listLoading || detailLoading}>
        {!showHeaderForm ? (
          <Empty
            description="尚未建立退料表"
            className="mt-10"
          >
            <Button type="primary" onClick={handleCreateNewClick}>
              產生退料單
            </Button>
          </Empty>
        ) : (
          <div className="flex flex-col gap-4">
            {/* 退料單表頭 採用 DynamicForm */}
            <Card
              size="small"
              title={
                <Space>
                  <strong>{isCreating ? "🆕 新增退料單" : `📄 退料單 - ${activeDocNo}`}</strong>
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
                      <Button size="small" onClick={() => (isCreating ? setIsCreating(false) : setIsHeaderEditing(false))}>
                        取消
                      </Button>
                    </>
                  ) : (
                    <>
                      {!isPosted && (
                        <>
                          <Button type="primary" size="small" icon={<EditOutlined />} onClick={() => setIsHeaderEditing(true)}>
                            編輯
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
                            刪除
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
              <DynamicForm
                formId="returnHeaderForm"
                fields={returnHeaderFormConfig() as any}
                defaultValues={{
                  documentDate: docDate as any,
                  notes: docNotes,
                }}
                onSubmit={() => {}}
                onValuesChange={(values: any) => {
                  if (!isEditable) return;
                  if (values.documentDate) setDocDate(dayjs(values.documentDate));
                  if (values.notes !== undefined) setDocNotes(values.notes || "");
                }}
                isViewMode={!isEditable}
                hideDefaultFooter={true}
              />
            </Card>

            {/* 退料明細 採用 DynamicForm */}
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
                        <DynamicForm
                          formId={`returnItemForm-${idx}`}
                          fields={returnItemFormConfig(filteredMaterials) as any}
                          defaultValues={{
                            materialCode: it.materialCode,
                            targetStorageCode: it.targetStorageCode,
                            quantity: it.quantity,
                            referenceQuantity1: it.referenceQuantity1,
                          }}
                          onSubmit={() => {}}
                          onValuesChange={(values: any) => {
                            if (!isEditable) return;
                            if (values.materialCode && values.materialCode !== it.materialCode) {
                              handleMaterialChange(idx, values.materialCode);
                            } else {
                              const updated = [...items];
                              updated[idx].targetStorageCode = values.targetStorageCode || "TW-GEN-INV";
                              setItems(updated);
                            }
                          }}
                          isViewMode={!isEditable}
                          hideDefaultFooter={true}
                        />

                        {/* 選擇車間現場正在 WIP 狀態的 LPN 列表 */}
                        {it.materialCode && (
                          <div style={{ backgroundColor: "var(--ant-color-fill-alter)", padding: "12px", borderRadius: "6px", marginTop: "12px" }}>
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
                                            onChange={(val: any) => handleWipRollQtyChange(idx, rec.rollNo, val)}
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
