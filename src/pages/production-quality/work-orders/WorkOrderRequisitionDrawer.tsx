import React, { useState, useEffect } from "react";
import { Drawer, Space, Button, App, Spin, Form, DatePicker, Input, Select, Table, InputNumber, Divider, Card, Badge, Tag, Tooltip } from "antd";
import { PlusOutlined, DeleteOutlined, MedicineBoxOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
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
import { DrawerTitle } from "@/components/Form/DrawerTitle";
import { ActionBar } from "@/components/common/ActionBar";
import { DRAWER_WIDTH_MAIN } from "@/constants";
import { RollSubstitutionPicker } from "./RollSubstitutionPicker";

interface WorkOrderRequisitionDrawerProps {
  documentNumber?: string | null;
  workOrderNumber: string;
  materialsList: any[]; // 製令需求物料清單，用來限制可領料號
  open: boolean;
  onClose: () => void;
}

export const WorkOrderRequisitionDrawer: React.FC<WorkOrderRequisitionDrawerProps> = ({
  documentNumber,
  workOrderNumber,
  materialsList,
  open,
  onClose,
}) => {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const isCreateMode = !documentNumber;
  const [editMode, setEditMode] = useState<boolean>(isCreateMode);
  const isViewMode = !editMode;

  const [items, setItems] = useState<any[]>([]);
  const [selectedMaterialIndex, setSelectedMaterialIndex] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // 1. 取得單據詳情
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["requisition", documentNumber],
    queryFn: () => getApiV1WorkOrderRequisitionByDocumentNumber({ path: { documentNumber: documentNumber! } }),
    enabled: !!documentNumber && open,
  });

  const record = (data?.data as any)?.data || undefined;

  useEffect(() => {
    if (open) {
      if (isCreateMode) {
        setEditMode(true);
        form.setFieldsValue({
          documentDate: dayjs(),
          notes: "",
        });
        setItems([]);
      } else {
        setEditMode(false);
      }
    }
  }, [open, documentNumber, isCreateMode]);

  useEffect(() => {
    if (record && !isCreateMode) {
      form.setFieldsValue({
        documentDate: dayjs(record.documentDate),
        notes: record.notes,
      });
      // 解析 items
      const mappedItems = (record.items || []).map((it: any) => {
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
          extra, // 捲材包含選用卷 LPN 清單，片材包含長寬厚
        };
      });
      setItems(mappedItems);
    }
  }, [record, isCreateMode]);

  // 2. 異動 API mutations
  const createMutation = useMutation({
    mutationFn: (values: any) => postApiV1WorkOrderRequisition({ body: values }),
    onSuccess: () => {
      message.success("新增領料單草稿成功");
      queryClient.invalidateQueries({ queryKey: ["requisitions", workOrderNumber] });
      onClose();
    },
    onError: (error) => {
      modal.error({ title: "儲存失敗", content: getApiErrorMessage(error), centered: true });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: any) => putApiV1WorkOrderRequisitionByDocumentNumber({ path: { documentNumber: documentNumber! }, body: values }),
    onSuccess: () => {
      message.success("更新領料單成功");
      queryClient.invalidateQueries({ queryKey: ["requisition", documentNumber] });
      queryClient.invalidateQueries({ queryKey: ["requisitions", workOrderNumber] });
      setEditMode(false);
      refetch();
    },
    onError: (error) => {
      modal.error({ title: "儲存失敗", content: getApiErrorMessage(error), centered: true });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteApiV1WorkOrderRequisitionByDocumentNumber({ path: { documentNumber: documentNumber! } }),
    onSuccess: () => {
      message.success("刪除領料單成功");
      queryClient.invalidateQueries({ queryKey: ["requisitions", workOrderNumber] });
      onClose();
    },
    onError: (error) => {
      modal.error({ title: "刪除失敗", content: getApiErrorMessage(error), centered: true });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => postApiV1WorkOrderRequisitionByDocumentNumberConfirm({ path: { documentNumber: documentNumber! } }),
    onSuccess: () => {
      message.success("領料過帳確認成功！一卷一卡已安全流轉至 WIP 狀態");
      queryClient.invalidateQueries({ queryKey: ["requisition", documentNumber] });
      queryClient.invalidateQueries({ queryKey: ["requisitions", workOrderNumber] });
      refetch();
    },
    onError: (error) => {
      modal.error({ title: "過帳失敗", content: getApiErrorMessage(error), centered: true });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => postApiV1WorkOrderRequisitionByDocumentNumberCancel({ path: { documentNumber: documentNumber! } }),
    onSuccess: () => {
      message.success("取消過帳確認成功！WIP 卷料已安全放回倉庫");
      queryClient.invalidateQueries({ queryKey: ["requisition", documentNumber] });
      queryClient.invalidateQueries({ queryKey: ["requisitions", workOrderNumber] });
      refetch();
    },
    onError: (error) => {
      modal.error({ title: "取消失敗", content: getApiErrorMessage(error), centered: true });
    },
  });

  const handleSave = () => {
    form.validateFields().then((values) => {
      if (items.length === 0) {
        message.warning("請至少加入一筆領料明細項目！");
        return;
      }

      // 檢查是否所有項目的數量都大於 0
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.quantity <= 0) {
          message.warning(`項目 ${it.materialCode} 的領用數量必須大於 0！`);
          return;
        }
      }

      const postData = {
        referenceNumber: workOrderNumber,
        documentDate: values.documentDate.format("YYYY-MM-DD"),
        notes: values.notes || "",
        items: items.map((it) => ({
          materialCode: it.materialCode,
          sourceStorageCode: it.sourceStorageCode,
          notes: it.notes,
          extraDataJson: JSON.stringify(it.extra),
        })),
      };

      if (isCreateMode) {
        createMutation.mutate(postData);
      } else {
        updateMutation.mutate(postData);
      }
    });
  };

  // 3. FIFO 自動配料一鍵完成
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
      // 重新計算長度與面積
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
        extra: [], // 捲材存放選中 rollNos，片材存放 { widthMm, lengthMm, thicknessMm }
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
    // 片材默認建立空的規格物件
    updated[index].extra = matched?.materialForm === "R" ? [] : [{ widthMm: matched?.widthMm || 0, lengthMm: 0, thicknessMm: 0 }];
    setItems(updated);
  };

  const handleSheetSpecChange = (index: number, field: string, val: number) => {
    const updated = [...items];
    const spec = updated[index].extra[0] || { widthMm: 0, lengthMm: 0, thicknessMm: 0 };
    spec[field] = val;
    updated[index].extra = [spec];

    // 重新計算面積：(WidthMm / 1000) * (LengthMm / 1000) * Quantity
    const qty = updated[index].quantity || 0;
    const area = (spec.widthMm / 1000) * (spec.lengthMm / 1000) * qty;
    updated[index].referenceQuantity1 = parseFloat(area.toFixed(4));
    setItems(updated);
  };

  const handleSheetQuantityChange = (index: number, val: number | null) => {
    const updated = [...items];
    updated[index].quantity = val || 0;
    const spec = updated[index].extra[0] || { widthMm: 0, lengthMm: 0, thicknessMm: 0 };

    // 重新計算面積
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
    // 重新計算數量 (長度) 與 面積 (SQM)
    const totalLen = mappedExtra.reduce((sum: number, r: any) => sum + r.qtyAux, 0);
    const totalArea = mappedExtra.reduce((sum: number, r: any) => sum + r.qtyAux * (r.widthMm / 1000), 0);

    item.quantity = parseFloat(totalLen.toFixed(4));
    item.referenceQuantity1 = parseFloat(totalArea.toFixed(4));

    setItems(updated);
  };

  // 4. 定義頂端 ActionBar Actions
  const getHeaderActions = () => {
    if (isCreateMode || editMode) return null;
    if (!record) return null;

    const isDraft = !record.confirmDate;

    return (
      <Space>
        {isDraft && (
          <>
            <Button
              type="primary"
              onClick={() => confirmMutation.mutate()}
              loading={confirmMutation.isPending}
            >
              確認過帳 (Confirm)
            </Button>
            <Button
              danger
              onClick={() => {
                modal.confirm({
                  title: "刪除確認",
                  content: "確定要刪除這張領料單草稿嗎？此操作不可逆。",
                  centered: true,
                  onOk: () => deleteMutation.mutate(),
                });
              }}
              loading={deleteMutation.isPending}
            >
              刪除草稿
            </Button>
          </>
        )}
        {!isDraft && (
          <Button
            danger
            onClick={() => {
              modal.confirm({
                title: "取消過帳確認",
                content: "確定要取消此領料單過帳嗎？這會把 WIP 卷卡重新退回倉庫 Available 狀態。",
                centered: true,
                onOk: () => cancelMutation.mutate(),
              });
            }}
            loading={cancelMutation.isPending}
          >
            取消過帳 (Cancel)
          </Button>
        )}
      </Space>
    );
  };

  const getActionBarActions = () => {
    if (editMode) {
      return (
        <Space>
          <Button type="primary" onClick={handleSave} loading={createMutation.isPending || updateMutation.isPending}>
            儲存草稿
          </Button>
          <Button onClick={() => (isCreateMode ? onClose() : setEditMode(false))}>
            取消
          </Button>
        </Space>
      );
    }
    if (!record) return null;
    return (
      <Space>
        {!record.confirmDate && (
          <Button type="primary" onClick={() => setEditMode(true)}>
            編輯
          </Button>
        )}
      </Space>
    );
  };

  const statusTag = record ? (
    record.confirmDate ? (
      <Tag color="success">🟢 已確認過帳 (Posted)</Tag>
    ) : (
      <Tag color="default">⚪ 草稿 (Draft)</Tag>
    )
  ) : undefined;

  return (
    <Drawer
      title={
        <DrawerTitle
          moduleName="製令領料單"
          isCreate={isCreateMode}
          isEdit={editMode}
          record={record}
          displayField={(r) => r?.documentNumber || ""}
          statusTag={statusTag}
        />
      }
      extra={getHeaderActions()}
      open={open}
      onClose={onClose}
      size={DRAWER_WIDTH_MAIN as any}
      mask={{ closable: isViewMode }}
      keyboard={isViewMode}
      styles={{ body: { padding: 0, overflow: "hidden" as const } }}
    >
      <Spin spinning={isLoading}>
        <ActionBar
          createdBy={record?.createdBy || "系統"}
          createdAt={record?.createdAt}
          updatedBy={record?.updatedBy}
          updatedAt={record?.updatedAt}
          actions={getActionBarActions()}
        />

        <div className="py-2 px-6" style={{ height: "calc(100vh - 120px)", overflowY: "auto" }}>
          <Form form={form} layout="vertical">
            <div className="grid grid-cols-2 gap-4">
              <Form.Item label="單據日期" name="documentDate" rules={[{ required: true, message: "請選擇單據日期" }]}>
                <DatePicker style={{ width: "100%" }} disabled={isViewMode} />
              </Form.Item>
              <Form.Item label="備註" name="notes">
                <Input.TextArea rows={1} placeholder="請輸入領料備註事項..." disabled={isViewMode} />
              </Form.Item>
            </div>
          </Form>

          <Divider style={{ margin: "12px 0" }} />

          <div className="flex justify-between items-center mb-4">
            <span style={{ fontSize: "15px", fontWeight: "bold" }}>📋 領料明細項目</span>
            {editMode && (
              <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddNewItem}>
                新增領用料號
              </Button>
            )}
          </div>

          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            {items.map((it, idx) => {
              const matchedMaterial = materialsList.find((x) => x.materialCode === it.materialCode);
              const isRoll = matchedMaterial ? matchedMaterial.materialForm === "R" : it.unit === "M";

              return (
                <Card
                  key={idx}
                  size="small"
                  title={
                    <div className="flex justify-between items-center">
                      <Space>
                        <Badge count={idx + 1} style={{ backgroundColor: "#1677ff" }} />
                        <strong>{it.materialName || "未選擇料號"}</strong>
                      </Space>
                      {editMode && (
                        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemoveItem(idx)} />
                      )}
                    </div>
                  }
                  style={{ border: "1px solid var(--ant-color-border-secondary)" }}
                >
                  <div className="grid grid-cols-4 gap-4" style={{ marginBottom: "12px" }}>
                    <div className="col-span-1">
                      <label className="text-gray-400 block mb-1">原料料號</label>
                      <Select
                        style={{ width: "100%" }}
                        placeholder="請選擇需求原料"
                        value={it.materialCode || undefined}
                        onChange={(val) => handleMaterialChange(idx, val)}
                        disabled={isViewMode}
                      >
                        {materialsList.map((m) => (
                          <Select.Option key={m.materialCode} value={m.materialCode}>
                            {m.materialCode} ({m.materialForm === "R" ? "捲材" : "片材"})
                          </Select.Option>
                        ))}
                      </Select>
                    </div>

                    <div className="col-span-1">
                      <label className="text-gray-400 block mb-1">來源儲位</label>
                      <Select
                        style={{ width: "100%" }}
                        value={it.sourceStorageCode}
                        onChange={(v) => {
                          const updated = [...items];
                          updated[idx].sourceStorageCode = v;
                          setItems(updated);
                        }}
                        disabled={isViewMode}
                      >
                        <Select.Option value="TW-GEN-INV">原料主倉 (TW-GEN-INV)</Select.Option>
                        <Select.Option value="TW-WIP-GEN">現場車間倉 (TW-WIP-GEN)</Select.Option>
                      </Select>
                    </div>

                    <div className="col-span-1">
                      <label className="text-gray-400 block mb-1">領用數量 ({it.unit})</label>
                      {isRoll ? (
                        <Tooltip title="捲材為一卷一卡控制，此數值由下方選用卷卡自動累計">
                          <InputNumber style={{ width: "100%" }} value={it.quantity} disabled={true} />
                        </Tooltip>
                      ) : (
                        <InputNumber
                          style={{ width: "100%" }}
                          placeholder="請輸入領用片數"
                          value={it.quantity}
                          min={1}
                          onChange={(val) => handleSheetQuantityChange(idx, val)}
                          disabled={isViewMode}
                        />
                      )}
                    </div>

                    <div className="col-span-1">
                      <label className="text-gray-400 block mb-1">領用面積 (SQM)</label>
                      <InputNumber style={{ width: "100%" }} value={it.referenceQuantity1} disabled={true} />
                    </div>
                  </div>

                  {/* 捲材：一卷一卡 LPN 卷卡選擇器 */}
                  {isRoll && it.materialCode && (
                    <Card
                      size="small"
                      title={
                        <div className="flex justify-between items-center">
                          <span style={{ fontSize: "13px", color: "var(--ant-color-text-secondary)" }}>
                            🌀 捲材實體卡追溯 LPN (已選 {it.extra?.length || 0} 卷)
                          </span>
                          {editMode && (
                            <Space>
                              <Button
                                size="small"
                                type="primary"
                                ghost
                                icon={<MedicineBoxOutlined />}
                                onClick={() => openRollPicker(idx)}
                              >
                                智慧挑選卷卡
                              </Button>
                              <InputNumber
                                size="small"
                                style={{ width: "120px" }}
                                placeholder="FIFO 需求(米)"
                                id={`fifo-input-${idx}`}
                              />
                              <Button
                                size="small"
                                type="dashed"
                                onClick={() => {
                                  const reqLen = (document.getElementById(`fifo-input-${idx}`) as HTMLInputElement)?.value;
                                  handleFifoAutoAllocate(idx, it.materialCode, parseFloat(reqLen), matchedMaterial?.widthMm || 0);
                                }}
                              >
                                一鍵 FIFO 配料
                              </Button>
                            </Space>
                          )}
                        </div>
                      }
                      style={{ backgroundColor: "var(--ant-color-fill-alter)" }}
                    >
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
                        <div style={{ padding: "16px 0", textAlign: "center", color: "var(--ant-color-text-placeholder)" }}>
                          <InfoCircleOutlined /> 目前尚未選擇任何實體物料卷卡，請點擊上方按鈕進行「智慧挑選」或「一鍵 FIFO 配料」！
                        </div>
                      )}
                    </Card>
                  )}

                  {/* 片材：規格參數設定 */}
                  {!isRoll && it.materialCode && (
                    <Card
                      size="small"
                      title={<span style={{ fontSize: "13px", color: "var(--ant-color-text-secondary)" }}>🔮 片材規格參數</span>}
                      style={{ backgroundColor: "var(--ant-color-fill-alter)" }}
                    >
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="text-gray-400 block mb-1">片料寬度 (mm)</label>
                          <InputNumber
                            style={{ width: "100%" }}
                            value={it.extra[0]?.widthMm}
                            onChange={(val) => handleSheetSpecChange(idx, "widthMm", val || 0)}
                            disabled={isViewMode}
                          />
                        </div>
                        <div>
                          <label className="text-gray-400 block mb-1">片料長度 (mm)</label>
                          <InputNumber
                            style={{ width: "100%" }}
                            value={it.extra[0]?.lengthMm}
                            onChange={(val) => handleSheetSpecChange(idx, "lengthMm", val || 0)}
                            disabled={isViewMode}
                          />
                        </div>
                        <div>
                          <label className="text-gray-400 block mb-1">厚度 (mm)</label>
                          <InputNumber
                            style={{ width: "100%" }}
                            value={it.extra[0]?.thicknessMm}
                            onChange={(val) => handleSheetSpecChange(idx, "thicknessMm", val || 0)}
                            disabled={isViewMode}
                          />
                        </div>
                      </div>
                    </Card>
                  )}
                </Card>
              );
            })}
          </Space>
        </div>
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
    </Drawer>
  );
};
