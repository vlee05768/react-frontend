import React, { useState, useEffect } from "react";
import { Drawer, Space, Button, App, Spin, Form, DatePicker, Input, Select, Table, InputNumber, Divider, Card, Badge, Tag, Tooltip } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
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
import { DrawerTitle } from "@/components/Form/DrawerTitle";
import { ActionBar } from "@/components/common/ActionBar";
import { DRAWER_WIDTH_MAIN } from "@/constants";

interface WorkOrderReturnDrawerProps {
  documentNumber?: string | null;
  workOrderNumber: string;
  materialsList: any[]; // 製令需求物料清單，僅展示捲材
  open: boolean;
  onClose: () => void;
}

export const WorkOrderReturnDrawer: React.FC<WorkOrderReturnDrawerProps> = ({
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

  // 1. 取得單據詳情
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["return", documentNumber],
    queryFn: () => getApiV1WorkOrderReturnByDocumentNumber({ path: { documentNumber: documentNumber! } }),
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
          targetStorageCode: it.targetStorageCode || "TW-GEN-INV",
          notes: it.notes || "",
          extra,
        };
      });
      setItems(mappedItems);
    }
  }, [record, isCreateMode]);

  // 2. Mutations
  const createMutation = useMutation({
    mutationFn: (values: any) => postApiV1WorkOrderReturn({ body: values }),
    onSuccess: () => {
      message.success("新增退料單草稿成功");
      queryClient.invalidateQueries({ queryKey: ["returns", workOrderNumber] });
      onClose();
    },
    onError: (error) => {
      modal.error({ title: "儲存失敗", content: getApiErrorMessage(error), centered: true });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: any) => putApiV1WorkOrderReturnByDocumentNumber({ path: { documentNumber: documentNumber! }, body: values }),
    onSuccess: () => {
      message.success("更新退料單成功");
      queryClient.invalidateQueries({ queryKey: ["return", documentNumber] });
      queryClient.invalidateQueries({ queryKey: ["returns", workOrderNumber] });
      setEditMode(false);
      refetch();
    },
    onError: (error) => {
      modal.error({ title: "儲存失敗", content: getApiErrorMessage(error), centered: true });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteApiV1WorkOrderReturnByDocumentNumber({ path: { documentNumber: documentNumber! } }),
    onSuccess: () => {
      message.success("刪除退料單成功");
      queryClient.invalidateQueries({ queryKey: ["returns", workOrderNumber] });
      onClose();
    },
    onError: (error) => {
      modal.error({ title: "刪除失敗", content: getApiErrorMessage(error), centered: true });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => postApiV1WorkOrderReturnByDocumentNumberConfirm({ path: { documentNumber: documentNumber! } }),
    onSuccess: () => {
      message.success("退料確認過帳成功！剩餘卷料已還原至倉庫可用狀態");
      queryClient.invalidateQueries({ queryKey: ["return", documentNumber] });
      queryClient.invalidateQueries({ queryKey: ["returns", workOrderNumber] });
      refetch();
    },
    onError: (error) => {
      modal.error({ title: "退料過帳失敗", content: getApiErrorMessage(error), centered: true });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => postApiV1WorkOrderReturnByDocumentNumberCancel({ path: { documentNumber: documentNumber! } }),
    onSuccess: () => {
      message.success("取消退料過帳成功！LPN 已恢復為車間 WIP 狀態");
      queryClient.invalidateQueries({ queryKey: ["return", documentNumber] });
      queryClient.invalidateQueries({ queryKey: ["returns", workOrderNumber] });
      refetch();
    },
    onError: (error) => {
      modal.error({ title: "取消失敗", content: getApiErrorMessage(error), centered: true });
    },
  });

  const handleSave = () => {
    form.validateFields().then((values) => {
      if (items.length === 0) {
        message.warning("請至少加入一筆退料明細項目！");
        return;
      }

      const postData = {
        referenceNumber: workOrderNumber,
        documentDate: values.documentDate.format("YYYY-MM-DD"),
        notes: values.notes || "",
        items: items.map((it) => ({
          materialCode: it.materialCode,
          targetStorageCode: it.targetStorageCode,
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
        extra: [], // 存放當前選中欲退回的卷料列表：{ rollNo, widthMm, qtyAux }
        wipRolls: [], // WIP 備選卷卡
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
          workOrderNumber,
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

  // 當選取或調整 WIP 卷卡的退回長度時
  const handleWipRollCheck = (index: number, rollNo: string, checked: boolean, defaultQty: number, widthMm: number) => {
    const updated = [...items];
    const item = updated[index];
    if (checked) {
      // 加入退回清單
      const exists = item.extra.find((x: any) => x.rollNo === rollNo);
      if (!exists) {
        item.extra.push({
          rollNo,
          widthMm,
          qtyAux: defaultQty, // 默認退回 WIP 上的全部剩餘量
        });
      }
    } else {
      // 移除退回清單
      item.extra = item.extra.filter((x: any) => x.rollNo !== rollNo);
    }

    // 重新累算
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

    // 重新累算
    const totalLen = item.extra.reduce((sum: number, r: any) => sum + r.qtyAux, 0);
    const totalArea = item.extra.reduce((sum: number, r: any) => sum + r.qtyAux * (r.widthMm / 1000), 0);
    item.quantity = parseFloat(totalLen.toFixed(4));
    item.referenceQuantity1 = parseFloat(totalArea.toFixed(4));
    setItems(updated);
  };

  // 4. ActionBar 動作
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
              確認退料過帳 (Confirm)
            </Button>
            <Button
              danger
              onClick={() => {
                modal.confirm({
                  title: "刪除確認",
                  content: "確定要刪除這張退料單草稿嗎？此操作不可逆。",
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
                content: "確定要取消此退料單過帳嗎？這會把卷卡重新轉回 WIP 現場狀態。",
                centered: true,
                onOk: () => cancelMutation.mutate(),
              });
            }}
            loading={cancelMutation.isPending}
          >
            取消退料過帳 (Cancel)
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
      <Tag color="success">🟢 已確認退料 (Posted)</Tag>
    ) : (
      <Tag color="default">⚪ 草稿 (Draft)</Tag>
    )
  ) : undefined;

  // 過濾製令僅為捲材需求
  const filteredMaterials = materialsList.filter((m) => m.materialForm === "R");

  return (
    <Drawer
      title={
        <DrawerTitle
          moduleName="製令退料單"
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
                <Input.TextArea rows={1} placeholder="請輸入退料原因或備註事項..." disabled={isViewMode} />
              </Form.Item>
            </div>
          </Form>

          <Divider style={{ margin: "12px 0" }} />

          <div className="flex justify-between items-center mb-4">
            <span style={{ fontSize: "15px", fontWeight: "bold" }}>📋 退回物料明細項目 (*僅支援卷料)</span>
            {editMode && (
              <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddNewItem}>
                新增退回料號
              </Button>
            )}
          </div>

          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            {items.map((it, idx) => {
              return (
                <Card
                  key={idx}
                  size="small"
                  title={
                    <div className="flex justify-between items-center">
                      <Space>
                        <Badge count={idx + 1} style={{ backgroundColor: "#fa8c16" }} />
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
                        placeholder="請選擇退回原料"
                        value={it.materialCode || undefined}
                        onChange={(val) => handleMaterialChange(idx, val)}
                        disabled={isViewMode}
                      >
                        {filteredMaterials.map((m) => (
                          <Select.Option key={m.materialCode} value={m.materialCode}>
                            {m.materialCode} (捲材)
                          </Select.Option>
                        ))}
                      </Select>
                    </div>

                    <div className="col-span-1">
                      <label className="text-gray-400 block mb-1">退回目的儲位</label>
                      <Select
                        style={{ width: "100%" }}
                        value={it.targetStorageCode}
                        onChange={(v) => {
                          const updated = [...items];
                          updated[idx].targetStorageCode = v;
                          setItems(updated);
                        }}
                        disabled={isViewMode}
                      >
                        <Select.Option value="TW-GEN-INV">原料主倉 (TW-GEN-INV)</Select.Option>
                      </Select>
                    </div>

                    <div className="col-span-1">
                      <label className="text-gray-400 block mb-1">退回總數量 (M)</label>
                      <Tooltip title="由下方勾選的 WIP 卷卡實測剩餘長度自動累加">
                        <InputNumber style={{ width: "100%" }} value={it.quantity} disabled={true} />
                      </Tooltip>
                    </div>

                    <div className="col-span-1">
                      <label className="text-gray-400 block mb-1">退回總面積 (SQM)</label>
                      <InputNumber style={{ width: "100%" }} value={it.referenceQuantity1} disabled={true} />
                    </div>
                  </div>

                  {/* 選擇車間現場正在 WIP 狀態的 LPN 列表 */}
                  {it.materialCode && (
                    <Card
                      size="small"
                      title={
                        <span style={{ fontSize: "13px", color: "var(--ant-color-text-secondary)" }}>
                          🌀 勾選欲辦理退料回庫的 WIP 現場卷卡 (LPN)
                        </span>
                      }
                      style={{ backgroundColor: "var(--ant-color-fill-alter)" }}
                    >
                      <Spin spinning={it.wipLoading || false}>
                        {isViewMode ? (
                          // 檢視模式：直接列出已存的 extra 明細
                          <Table
                            size="small"
                            dataSource={it.extra}
                            pagination={false}
                            rowKey="rollNo"
                            columns={[
                              { title: "物料卷卡號 (LPN)", dataIndex: "rollNo", key: "rollNo" },
                              { title: "寬度", dataIndex: "widthMm", key: "widthMm", render: (v) => `${v} mm` },
                              { title: "退回實測剩餘長度 (M)", dataIndex: "qtyAux", key: "qtyAux", render: (v) => <strong>{v} M</strong> },
                            ]}
                          />
                        ) : (
                          // 編輯模式：展示 WIP 列表，勾選並輸入退回長度
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
                    </Card>
                  )}
                </Card>
              );
            })}
          </Space>
        </div>
      </Spin>
    </Drawer>
  );
};
