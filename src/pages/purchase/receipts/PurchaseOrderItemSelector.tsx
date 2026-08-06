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
  businessPartnerName?: string;
  excludedKeys: string[];
  isMold?: boolean;
}

export default function PurchaseOrderItemSelector({
  open,
  onClose,
  onConfirm,
  businessPartnerCode,
  businessPartnerName,
  excludedKeys,
  isMold = false,
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

    const mapped = filtered.map((item: any) => {
      const qty = item.quantity || 0;
      const rec = item.receivedQuantity || 0;
      const cancel = item.cancelledQuantity || 0;
      const undelivered = Math.max(0, qty - rec - cancel);
      const key = `${item.purchaseOrderNumber}_${item.lineNumber}`;
      
      const isRoll = item.purchaseOrderType === "Material" && (item.unit === "m" || item.unit === "m2" || item.unit === "卷" || item.unit === "roll");

      let arrivalQuantity = 0;
      let rollCount = 0;
      let rollLength = item.length || 50;
      let undeliveredLength = undelivered; // remaining in PO unit

      if (isRoll) {
        if (item.unit === "m2") {
          const widthMm = item.width && item.width > 0 ? item.width : 1000;
          undeliveredLength = undelivered / (widthMm / 1000);
        }
      }

      if (isRoll) {
        if (item.unit === "卷" || item.unit === "roll") {
          // 💡 「以卷下單與點收」模式：到貨量代表到貨卷數
          arrivalQuantity = customArrivalQuantities[key] !== undefined 
            ? customArrivalQuantities[key] 
            : Math.max(1, Math.ceil(undelivered)); // 預設到貨量 = 未到貨卷數
          rollCount = arrivalQuantity;
          rollLength = item.length || 50;
        } else {
          // 💡 歷史相容長度核銷模式
          arrivalQuantity = customArrivalQuantities[key] !== undefined 
            ? customArrivalQuantities[key] 
            : undeliveredLength;
          rollLength = item.length || 300;
          rollCount = Math.max(1, Math.ceil(arrivalQuantity / rollLength));
        }
      } else {
        // 💡 片料模式
        arrivalQuantity = customArrivalQuantities[key] !== undefined 
          ? customArrivalQuantities[key] 
          : undelivered;
        rollCount = 1;
        rollLength = item.length || 0;
      }

      return {
        ...item,
        cancelledQuantity: cancel,
        undeliveredQuantity: undelivered,
        undeliveredLength,
        arrivalQuantity,
        rollCount,
        rollLength,
        isRoll,
        key, // Unique composite key for selection
      };
    });

    if (isMold) {
      return mapped.filter((item: any) => item.undeliveredQuantity > 0);
    }
    return mapped;
  }, [data, excludedKeys, keyword, customArrivalQuantities, isMold]);

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

      const arrivalQty = row.arrivalQuantity;
      if (!arrivalQty || arrivalQty < 1) {
        newErrorKeys.push(key);
        if (!firstErrorRow) {
          firstErrorRow = row;
          firstErrorMessage = `採購單 [${row.purchaseOrderNumber}] 項次 [${row.lineNumber}] 的到貨量最少必須為 1`;
        }
      } else {
        // 容差與上限檢核
        if (row.isRoll) {
          if (row.unit === "卷" || row.unit === "roll") {
            const maxAllowedRolls = Number((row.undeliveredQuantity * 1.1).toFixed(4));
            if (arrivalQty > maxAllowedRolls) {
              newErrorKeys.push(key);
              if (!firstErrorRow) {
                firstErrorRow = row;
                firstErrorMessage = `採購單 [${row.purchaseOrderNumber}] 項次 [${row.lineNumber}] 的到貨卷數 [${arrivalQty} 卷] 已超過未到貨卷數 110% 限制 [${Number(maxAllowedRolls.toFixed(2))} 卷]`;
              }
            }
          } else {
            const maxAllowedLength = Number((row.undeliveredLength * 1.1).toFixed(4));
            if (arrivalQty > maxAllowedLength) {
              newErrorKeys.push(key);
              if (!firstErrorRow) {
                firstErrorRow = row;
                firstErrorMessage = `採購單 [${row.purchaseOrderNumber}] 項次 [${row.lineNumber}] 的本次到貨量 [${arrivalQty} m] 已超過未到貨量 110% 限制 [${Number(maxAllowedLength.toFixed(2))} m]`;
              }
            }
          }
        } else {
          if (isMold) {
            if (arrivalQty < row.undeliveredQuantity) {
              newErrorKeys.push(key);
              if (!firstErrorRow) {
                firstErrorRow = row;
                firstErrorMessage = `採購單 [${row.purchaseOrderNumber}] 項次 [${row.lineNumber}] 的模具到貨量 [${arrivalQty}] 必須大於或等於未到貨量 [${row.undeliveredQuantity}]`;
              }
            }
          } else {
            if (arrivalQty > row.undeliveredQuantity * 1.1) {
              newErrorKeys.push(key);
              if (!firstErrorRow) {
                firstErrorRow = row;
                firstErrorMessage = `採購單 [${row.purchaseOrderNumber}] 項次 [${row.lineNumber}] 的到貨量 [${arrivalQty}] 不可大於未到貨量 110% 限制 [${Number((row.undeliveredQuantity * 1.1).toFixed(2))}]`;
              }
            }
          }
        }
      }
    }

    if (newErrorKeys.length > 0) {
      setErrorKeys(newErrorKeys);
      message.error(firstErrorMessage);
      setTimeout(() => {
        const inputId = `arrival-input-${firstErrorRow.key}`;
        const element = document.getElementById(inputId);
        if (element) {
          element.focus();
          (element as any).select?.();
        }
      }, 100);
      return;
    }

    const selectedItems = selectedRowKeys.map((key) => {
      const row = poItems.find((item: any) => item.key === key);
      const arrivalQty = row.arrivalQuantity;
      const widthVal = row.width && row.width > 0 ? row.width : 1000;

      const originalPrice = row.unitPrice || 0;
      const undeliveredQty = row.undeliveredQuantity || 0;

      // 💡 小計：原採購單單價 * 點收量 (超交不計費，以未到貨量為限進行 capping)
      const isOver = arrivalQty >= undeliveredQty;
      const amountVal = isOver
        ? Math.round(originalPrice * undeliveredQty)
        : Math.round(originalPrice * arrivalQty);

      return {
        referenceNumber: row.lineNumber,
        partnerDocumentNumber: row.purchaseOrderNumber, // PO Number on receipt item level
        materialCode: row.goodsCode,
        materialName: row.goodsName,
        unit: row.unit || "卷",
        unitPrice: originalPrice, // 💡 100% 與採購單單價一樣，徹底移除前台折算包袱
        rollCount: row.isRoll ? arrivalQty : 1, // 💡 到貨量即為到貨卷數
        width: widthVal,
        length: row.length || 0,
        quantity: arrivalQty, // 💡 進貨量完全等於到貨量批量
        isRoll: row.isRoll,
        amount: amountVal,
        targetStorageCode: "TW-QC-GEN", // Default waiting for IQC storage
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
        label: "寬度(mm)",
        name: "width" as any,
        width: 100,
        align: "right",
        render: (val: number, record: any) => {
          if (record.purchaseOrderType === "Mold" || val == null) return "-";
          return (
            <span className="text-indigo-600 dark:text-indigo-400 font-mono font-medium">
              {Number(val.toFixed(2)).toLocaleString()} mm
            </span>
          );
        }
      },
      {
        label: "長度",
        name: "length" as any,
        width: 100,
        align: "right",
        render: (val: number, record: any) => {
          if (record.purchaseOrderType === "Mold" || val == null) return "-";
          const isRoll = record.materialForm === "R" || record.goodsCode?.startsWith("R-") || record.goodsCode?.endsWith("-R") || record.unit === "卷" || record.unit === "roll" || record.unit === "m2";
          const isSheet = record.materialForm === "S" || record.goodsCode?.startsWith("S-") || record.goodsCode?.endsWith("-S") || record.unit === "pcs";
          const formattedVal = Number(val.toFixed(2)).toLocaleString();

          if (isRoll) {
            return (
              <span className="text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                {formattedVal} m
              </span>
            );
          }
          if (isSheet) {
            // 💡 單位相同的用一樣的顏色：片材長度為 mm，故與寬度 (mm) 統一採用高質感靛藍色 (Indigo)
            return (
              <span className="text-indigo-600 dark:text-indigo-400 font-mono font-medium">
                {formattedVal} mm
              </span>
            );
          }
          return <span className="font-mono">{formattedVal}</span>;
        }
      },
      {
        label: "採購單價",
        name: "unitPrice" as any,
        width: 90,
        align: "right",
        render: (v: number, record: any) => {
          const isChecked = selectedRowKeys.includes(record.key);
          const qty = isChecked ? (record.arrivalQuantity || 0) : 0;
          const undelivered = record.undeliveredQuantity || 0;
          const price = v || 0;

          const isOver = qty > undelivered;
          let recalculatedPrice = price;
          if (isOver && qty > 0) {
            const subtotal = Math.round(price * undelivered);
            recalculatedPrice = subtotal / qty;
          }

          return (
            <div className="flex flex-col items-end">
              <span className="font-semibold text-[#0958d9] dark:text-[#177ddc]">
                {v != null ? Number(v.toFixed(2)).toLocaleString("zh-TW") : "0"}
              </span>
              {isChecked && isOver && recalculatedPrice !== price && (
                <span className="text-[11px] text-[#8c8c8c] dark:text-[#8c8c8c] font-normal">
                  重算: {Number(recalculatedPrice.toFixed(2)).toLocaleString("zh-TW")}
                </span>
              )}
            </div>
          );
        },
      },

      {
        label: "採購量",
        name: "quantity" as any,
        width: 90,
        align: "right",
        render: (v: number) => (
          <span className="font-semibold text-[#d46b08] dark:text-[#fa8c16]">
            {v != null ? Number(v).toLocaleString("zh-TW") : "0"}
          </span>
        ),
      },
      { label: "單位", name: "unit" as any, width: 60, align: "center" },
      {
        label: "未到貨量",
        name: "undeliveredQuantity" as any,
        width: 90,
        align: "right",
        render: (v: number, record: any) => {
          if (record.isRoll) {
            return (
              <span className="font-semibold text-[#1890ff] dark:text-[#177ddc]">
                {record.undeliveredLength != null ? Number(record.undeliveredLength.toFixed(2)).toLocaleString("zh-TW") : "0"}
              </span>
            );
          }
          return (
            <span className="font-semibold text-[#1890ff] dark:text-[#177ddc]">
              {v != null ? Number(v).toLocaleString("zh-TW") : "0"}
            </span>
          );
        },
      },
      {
        label: "到貨量",
        name: "arrivalQuantity" as any,
        width: 100,
        align: "right",
        render: (_v: number, record: any) => {
          const isChecked = selectedRowKeys.includes(record.key);
          const hasError = errorKeys.includes(record.key);
          const currentArrivalQty = customArrivalQuantities[record.key] !== undefined 
            ? customArrivalQuantities[record.key] 
            : record.arrivalQuantity;

          return (
            <InputNumber
              id={`arrival-input-${record.key}`}
              value={isChecked ? currentArrivalQty : undefined}
              disabled={!isChecked}
              status={hasError && (!currentArrivalQty || currentArrivalQty <= 0) ? "error" : undefined}
              min={1}
              precision={0}
              onChange={(val) => {
                const numVal = val === null ? 0 : Number(val);
                setCustomArrivalQuantities((prev) => ({
                  ...prev,
                  [record.key]: numVal,
                }));

                const isOver = numVal > record.undeliveredQuantity * 1.1;

                if (numVal > 0 && !isOver) {
                  setErrorKeys((prev) => prev.filter((k) => k !== record.key));
                } else if (isOver) {
                  setErrorKeys((prev) => {
                    if (!prev.includes(record.key)) return [...prev, record.key];
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
        width: 100,
        align: "right",
        render: (_v: any, record: any) => {
          const isChecked = selectedRowKeys.includes(record.key);
          const qty = isChecked ? (record.arrivalQuantity || 0) : 0;
          const undelivered = record.undeliveredQuantity || 0;
          const price = record.unitPrice || 0;

          const subtotal = qty >= undelivered
            ? Math.round(price * undelivered)
            : Math.round(price * qty);

          return (
            <span
              className={`font-bold ${
                isChecked
                  ? "text-[var(--ant-color-primary)]"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            >
              {subtotal.toLocaleString("zh-TW")}
            </span>
          );
        },
      },
      {
        label: "已到貨量",
        name: "receivedQuantity" as any,
        width: 90,
        align: "right",
        render: (v: number) =>
          v != null ? Number(v).toLocaleString("zh-TW") : "0",
      },
      {
        label: "取消量",
        name: "cancelledQuantity" as any,
        width: 90,
        align: "right",
        render: (v: number) =>
          v != null ? Number(v).toLocaleString("zh-TW") : "0",
      },

    ];

    let finalConfigs = configs;
    if (isMold) {
      finalConfigs = configs.filter(col => 
        col.label !== "寬度" &&
        col.label !== "長度" &&
        col.label !== "取消量"
      );
      finalConfigs = finalConfigs.map(col => {
        if (col.label === "原料編碼") return { ...col, label: "模具編碼" };
        if (col.label === "原料名稱") return { ...col, label: "模具名稱" };
        return col;
      });
    }

    return buildTableColumns(finalConfigs, undefined, undefined, {
      showAudit: false,
    });
  }, [selectedRowKeys, customArrivalQuantities, errorKeys, isMold]);

  return (
    <Modal
      title={
        <div className="font-semibold pb-3 mb-2 text-[18px] border-b border-[var(--ant-color-border-secondary)]">
          挑選採購明細 (供應商: {businessPartnerName || businessPartnerCode})
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
