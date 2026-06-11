import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import {
  Modal,
  Table,
  Button,
  Input,
  Spin,
  message,
  InputNumber,
} from "antd";
import { useQuery } from "@tanstack/react-query";
import { getApiV1PurchaseOrder } from "@/api/generated";
import { MODAL_PICK_BODY_MAX_HEIGHT, MODAL_WIDTH_PICK } from "@/constants/ui";
import { SearchOutlined, ClearOutlined } from "@ant-design/icons";
import type { TableColumnConfig } from "@/components/Form/types";
import { buildTableColumns } from "@/utils/tableUtils";

interface PurchaseOrderItemSelectorProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (selectedItems: any[]) => void;
  businessPartnerCode?: string;
  excludedKeys: string[];
}

export default function PurchaseOrderItemSelector({
  open,
  onClose,
  onConfirm,
  businessPartnerCode,
  excludedKeys,
}: PurchaseOrderItemSelectorProps) {
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [customArrivalQuantities, setCustomArrivalQuantities] = useState<
    Record<string, number>
  >({});
  const [errorKeys, setErrorKeys] = useState<string[]>([]);
  const { watch, setValue } = useForm();
  const keyword = watch("keyword");

  const { data, isLoading } = useQuery({
    queryKey: ["purchase-orders-list-supplier", businessPartnerCode],
    queryFn: () =>
      getApiV1PurchaseOrder({
        query: {
          BusinessPartnerCode: businessPartnerCode,
          Status: "CONFIRMED",
        },
      }),
    enabled: open && !!businessPartnerCode,
  });

  const poItems = useMemo(() => {
    const orders = (data?.data?.data as any)?.data || [];
    if (!Array.isArray(orders)) return [];

    const rawItems: any[] = [];
    orders.forEach((order: any) => {
      const items = order.items || [];
      if (Array.isArray(items)) {
        items.forEach((item: any) => {
          rawItems.push({
            ...item,
            purchaseOrderNumber: order.code,
          });
        });
      }
    });

    // Filter out already imported/excluded reference numbers by composite key
    let filtered = rawItems.filter((item: any) => {
      const compositeKey = `${item.purchaseOrderNumber}_${item.lineNumber}`;
      return !excludedKeys.includes(compositeKey);
    });

    if (keyword) {
      const lower = keyword.toLowerCase();
      filtered = filtered.filter(
        (item: any) =>
          item.goodsCode?.toLowerCase().includes(lower) ||
          item.goodsName?.toLowerCase().includes(lower) ||
          item.lineNumber?.toLowerCase().includes(lower) ||
          item.purchaseOrderNumber?.toLowerCase().includes(lower),
      );
    }

    return filtered.map((item: any) => {
      const qty = item.quantity || 0;
      const rec = item.receivedQuantity || 0;
      const cancel = item.cancelledQuantity || 0;
      const undelivered = Math.max(0, qty - rec - cancel);
      const key = `${item.purchaseOrderNumber}_${item.lineNumber}`;
      return {
        ...item,
        cancelledQuantity: cancel,
        undeliveredQuantity: undelivered,
        arrivalQuantity:
          customArrivalQuantities[key] !== undefined
            ? customArrivalQuantities[key]
            : undelivered,
        key, // Unique composite key for selection
      };
    });
  }, [data, excludedKeys, keyword, customArrivalQuantities]);

  const handleConfirm = () => {
    if (selectedRowKeys.length === 0) {
      message.warning("請至少選擇一項採購項目明細");
      return;
    }

    // 檢查所有勾選項目是否通過檢核
    const newErrorKeys: string[] = [];
    let firstErrorRow: any = null;
    let firstErrorMessage = "";

    for (const key of selectedRowKeys) {
      const row = poItems.find((item: any) => item.key === key);
      if (!row) continue;

      const arrivalQty =
        row.arrivalQuantity !== undefined
          ? row.arrivalQuantity
          : row.undeliveredQuantity || 0;

      // 到貨量最少為 1，不可大於未到貨量
      if (arrivalQty < 1) {
        newErrorKeys.push(key);
        if (!firstErrorRow) {
          firstErrorRow = row;
          firstErrorMessage = `採購單 [${row.purchaseOrderNumber}] 項次 [${row.lineNumber}] 的到貨量為 ${arrivalQty}，最少必須為 1`;
        }
      } else if (arrivalQty > row.undeliveredQuantity) {
        newErrorKeys.push(key);
        if (!firstErrorRow) {
          firstErrorRow = row;
          firstErrorMessage = `採購單 [${row.purchaseOrderNumber}] 項次 [${row.lineNumber}] 的到貨量為 ${arrivalQty}，不可大於未到貨量 (${row.undeliveredQuantity})`;
        }
      }
    }

    if (newErrorKeys.length > 0) {
      setErrorKeys(newErrorKeys);
      message.error(firstErrorMessage);
      setTimeout(() => {
        const element = document.getElementById(`arrival-input-${firstErrorRow.key}`);
        if (element) {
          element.focus();
          (element as any).select?.();
        }
      }, 100);
      return;
    }

    const selectedItems = selectedRowKeys.map((key) => {
      const row = poItems.find((item: any) => item.key === key);
      const arrivalQty =
        row.arrivalQuantity !== undefined
          ? row.arrivalQuantity
          : row.undeliveredQuantity || 0;

      // 模切業精密實物庫存繼承與反算：
      // 1. 寬度優先繼承採購單上的規格寬度 (row.width)，若無則保底 1000
      const widthVal = row.width && row.width > 0 ? row.width : 1000;
      // 2. 長度根據公式：長度(M) = 到貨面積(㎡) / (寬度(mm) / 1000)，並保留4位小數
      const lengthVal = widthVal > 0 
        ? Number((arrivalQty / (widthVal / 1000)).toFixed(4)) 
        : arrivalQty;

      return {
        referenceNumber: row.lineNumber,
        partnerDocumentNumber: row.purchaseOrderNumber, // PO Number on receipt item level
        materialCode: row.goodsCode,
        materialName: row.goodsName,
        unit: row.unit || "卷",
        unitPrice: row.unitPrice || 0,
        rollCount: 1,
        width: widthVal,
        length: lengthVal,
        quantity: arrivalQty,
        amount: Math.round(arrivalQty * (row.unitPrice || 0)),
        targetStorageCode: "TW-QC-GEN", // Default waiting for IQC storage
        brand: "",
        modelNo: "",
        notes: "",
      };
    });

    onConfirm(selectedItems);
    setSelectedRowKeys([]);
    setCustomArrivalQuantities({});
    setErrorKeys([]);
  };

  const handleClose = () => {
    setSelectedRowKeys([]);
    setCustomArrivalQuantities({});
    setErrorKeys([]);
    onClose();
  };

  const columns = useMemo(() => {
    const configs: TableColumnConfig[] = [
      {
        label: "採購項次",
        name: "lineNumber" as any,
        width: 100,
        align: "center",
      },
      { label: "原料編碼", name: "goodsCode" as any, width: 140 },
      {
        label: "原料名稱",
        name: "goodsName" as any,
        width: 180,
        ellipsis: true,
      },
      {
        label: "採購單價",
        name: "unitPrice" as any,
        width: 110,
        align: "right",
        render: (v: number) => (
          <span className="font-semibold text-[#0958d9] dark:text-[#177ddc]">
            {v != null ? Number(v.toFixed(4)).toLocaleString("zh-TW") : "0"}
          </span>
        ),
      },
      { label: "單位", name: "unit" as any, width: 80, align: "center" },

      {
        label: "採購量",
        name: "quantity" as any,
        width: 110,
        align: "right",
        render: (v: number) => (
          <span className="font-semibold text-[#d46b08] dark:text-[#fa8c16]">
            {v != null ? Number(v).toLocaleString("zh-TW") : "0"}
          </span>
        ),
      },
      {
        label: "已到貨量",
        name: "receivedQuantity" as any,
        width: 110,
        align: "right",
        render: (v: number) =>
          v != null ? Number(v).toLocaleString("zh-TW") : "0",
      },
      {
        label: "取消量",
        name: "cancelledQuantity" as any,
        width: 110,
        align: "right",
        render: (v: number) =>
          v != null ? Number(v).toLocaleString("zh-TW") : "0",
      },
      {
        label: "未到貨量",
        name: "undeliveredQuantity" as any,
        width: 110,
        align: "right",
        render: (v: number) => (
          <span className="font-semibold text-[#1890ff] dark:text-[#177ddc]">
            {v != null ? Number(v).toLocaleString("zh-TW") : "0"}
          </span>
        ),
      },
      {
        label: "到貨量",
        name: "arrivalQuantity" as any,
        width: 140,
        align: "right",
        render: (v: number, record: any) => {
          const isChecked = selectedRowKeys.includes(record.key);
          const hasError = errorKeys.includes(record.key);
          return (
            <InputNumber
              id={`arrival-input-${record.key}`}
              value={isChecked ? v : undefined}
              disabled={!isChecked}
              status={hasError ? "error" : undefined}
              onChange={(val) => {
                const numVal = val === null ? 0 : Number(val);
                setCustomArrivalQuantities((prev) => ({
                  ...prev,
                  [record.key]: numVal,
                }));

                // 若數值回到合法範圍，則動態移除 error 標記
                if (numVal >= 1 && numVal <= record.undeliveredQuantity) {
                  setErrorKeys((prev) => prev.filter((k) => k !== record.key));
                } else {
                  setErrorKeys((prev) => {
                    if (!prev.includes(record.key)) {
                      return [...prev, record.key];
                    }
                    return prev;
                  });
                }
              }}
              onFocus={(e) => {
                e.target.select();
              }}
              size="small"
              style={{ width: "100%", fontWeight: "bold" }}
              className="font-bold [&_input]:!text-[#18a058] dark:[&_input]:!text-[#389e0d]"
              controls={false}
            />
          );
        },
      },
      {
        label: "小計",
        name: "subtotal" as any,
        width: 120,
        align: "right",
        render: (_v: any, record: any) => {
          const isChecked = selectedRowKeys.includes(record.key);
          const qty = isChecked ? (record.arrivalQuantity || 0) : 0;
          const subtotal = (record.unitPrice || 0) * qty;
          return (
            <span
              className={`font-bold ${
                isChecked
                  ? "text-[var(--ant-color-primary)]"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            >
              {Number(subtotal.toFixed(2)).toLocaleString("zh-TW")}
            </span>
          );
        },
      },
    ];

    return buildTableColumns(configs, undefined, undefined, {
      showAudit: false,
    });
  }, [selectedRowKeys, customArrivalQuantities, errorKeys]);

  return (
    <Modal
      title={
        <div className="font-semibold pb-3 mb-2 text-[18px] border-b border-[var(--ant-color-border-secondary)]">
          挑選採購明細 (供應商: {businessPartnerCode})
        </div>
      }
      open={open}
      onCancel={handleClose}
      width={MODAL_WIDTH_PICK}
      styles={{
        body: {
          maxHeight: MODAL_PICK_BODY_MAX_HEIGHT,
          overflowY: "auto",
          padding: "16px 24px",
        },
      }}
      footer={
        <div className="pt-4 flex justify-end gap-2 border-t border-[var(--ant-color-border-secondary)]">
          <Button onClick={handleClose}>取消</Button>
          <Button
            type="primary"
            onClick={handleConfirm}
            disabled={selectedRowKeys.length === 0}
          >
            加入進貨明細 ({selectedRowKeys.length})
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="請輸入關鍵字搜尋（採購單號、品名、編碼、項次）"
            value={keyword}
            onChange={(e) => setValue("keyword", e.target.value)}
            allowClear
            prefix={<SearchOutlined />}
            className="flex-1"
          />
          <Button
            icon={<ClearOutlined />}
            onClick={() => setValue("keyword", "")}
          >
            重置
          </Button>
        </div>

        <Spin spinning={isLoading}>
          <Table
            rowSelection={{
              type: "checkbox",
              selectedRowKeys,
              onChange: (keys: any) => {
                setSelectedRowKeys(keys);
                setErrorKeys((prev) => prev.filter((key) => keys.includes(key)));
              },
              fixed: true,
            }}
            columns={columns}
            dataSource={poItems}
            rowKey="key"
            pagination={false}
            size="small"
            bordered
            scroll={{ x: "max-content", y: 350 }}
          />
        </Spin>
      </div>
    </Modal>
  );
}
