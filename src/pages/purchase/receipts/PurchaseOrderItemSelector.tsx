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
  const [customRollCounts, setCustomRollCounts] = useState<Record<string, number>>({});
  const [customRollLengths, setCustomRollLengths] = useState<Record<string, number>>({});
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
      
      const isRoll = item.purchaseOrderType === "Material" && (item.unit === "m" || item.unit === "m2");

      let arrivalQuantity = 0;
      let rollCount = 0;
      let rollLength = 300;
      
      // 當卷料時，若計量單位為 m2 (M²)，則未到貨量 (面積) 需要除以寬度 (m) 換算為長度 (m)
      let undeliveredLength = undelivered;
      if (isRoll) {
        if (item.unit === "m2") {
          const widthMm = item.width && item.width > 0 ? item.width : 1000;
          undeliveredLength = undelivered / (widthMm / 1000);
        } else {
          undeliveredLength = undelivered;
        }
      }

      if (isRoll) {
        rollCount = customRollCounts[key] !== undefined 
          ? customRollCounts[key] 
          : Math.max(1, Math.ceil(undeliveredLength / 300));
        rollLength = customRollLengths[key] !== undefined 
          ? customRollLengths[key] 
          : 300;
        // 到貨長度 (m) = rollCount * rollLength
        const arrivalLength = rollCount * rollLength;
        // 卷料到貨量直接等於到貨長度 (m)，不換算 SQM
        arrivalQuantity = arrivalLength;
      } else {
        arrivalQuantity = customArrivalQuantities[key] !== undefined 
          ? customArrivalQuantities[key] 
          : undelivered;
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
  }, [data, excludedKeys, keyword, customRollCounts, customRollLengths, customArrivalQuantities, isMold]);

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

      if (row.isRoll) {
        const rCount = row.rollCount;
        const rLength = row.rollLength;
        if (!rCount || rCount <= 0) {
          newErrorKeys.push(key);
          if (!firstErrorRow) {
            firstErrorRow = row;
            firstErrorMessage = `採購單 [${row.purchaseOrderNumber}] 項次 [${row.lineNumber}] 的到貨卷數必須大於 0`;
          }
        } else if (!rLength || rLength <= 0) {
          newErrorKeys.push(key);
          if (!firstErrorRow) {
            firstErrorRow = row;
            firstErrorMessage = `採購單 [${row.purchaseOrderNumber}] 項次 [${row.lineNumber}] 的每卷長度必須大於 0`;
          }
        } else {
          const arrivalLength = rCount * rLength;
          const maxAllowedLength = Number((row.undeliveredLength * 1.1).toFixed(4));
          if (arrivalLength > maxAllowedLength) {
            newErrorKeys.push(key);
            if (!firstErrorRow) {
              firstErrorRow = row;
              firstErrorMessage = `採購單 [${row.purchaseOrderNumber}] 項次 [${row.lineNumber}] 的本次到貨量 [${arrivalLength} m] 已超過未到貨量 110% 限制 [${Number(maxAllowedLength.toFixed(2))} m]`;
            }
          }
        }
      } else {
        const arrivalQty = row.arrivalQuantity;
        if (!arrivalQty || arrivalQty < 1) {
          newErrorKeys.push(key);
          if (!firstErrorRow) {
            firstErrorRow = row;
            firstErrorMessage = `採購單 [${row.purchaseOrderNumber}] 項次 [${row.lineNumber}] 的到貨量最少必須為 1`;
          }
        } else if (isMold) {
          // 💡 模具進貨：到貨量必須大於或等於未到貨量 (不能分批只點收部分，必須一次到位)
          if (arrivalQty < row.undeliveredQuantity) {
            newErrorKeys.push(key);
            if (!firstErrorRow) {
              firstErrorRow = row;
              firstErrorMessage = `採購單 [${row.purchaseOrderNumber}] 項次 [${row.lineNumber}] 的模具到貨量 [${arrivalQty}] 必須大於或等於未到貨量 [${row.undeliveredQuantity}]`;
            }
          }
        } else {
          // 💡 一般原料片料進貨：到貨量不能大於未到貨量
          if (arrivalQty > row.undeliveredQuantity) {
            newErrorKeys.push(key);
            if (!firstErrorRow) {
              firstErrorRow = row;
              firstErrorMessage = `採購單 [${row.purchaseOrderNumber}] 項次 [${row.lineNumber}] 的到貨量 [${arrivalQty}] 不可大於未到貨量 [${row.undeliveredQuantity}]`;
            }
          }
        }
      }
    }

    if (newErrorKeys.length > 0) {
      setErrorKeys(newErrorKeys);
      message.error(firstErrorMessage);
      setTimeout(() => {
        const inputId = firstErrorRow.isRoll 
          ? `roll-count-input-${firstErrorRow.key}` 
          : `arrival-input-${firstErrorRow.key}`;
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

      let finalRollCount = 1;
      let finalLength = arrivalQty;
      let finalQuantity = arrivalQty;

      if (row.isRoll) {
        finalRollCount = row.rollCount;
        finalLength = row.rollLength; // per roll length in meters
        finalQuantity = finalRollCount * finalLength; // 💡 卷料進貨量 = 卷數 * 每卷長度 (m)，不涉及寬度面積換算！
      } else {
        finalRollCount = 1;
        // 片料等非卷料，直接以到貨量入庫，不需要換算面積。長度直接繼承採購單原本長度
        finalLength = row.length && row.length > 0 ? row.length : 0;
        finalQuantity = arrivalQty;
      }

      const originalPrice = row.unitPrice || 0;
      const undeliveredQty = row.undeliveredQuantity || 0;

      // 換算本次實際到貨量至採購計量單位 (m2)
      let arrivalArea = finalQuantity;
      if (row.isRoll && row.unit === "m2") {
        arrivalArea = finalQuantity * (widthVal / 1000);
      }

      const isOver = arrivalArea >= undeliveredQty;
      const amountVal = isOver
        ? Math.round(originalPrice * undeliveredQty)
        : Math.round(originalPrice * arrivalArea);

      let finalUnitPrice = originalPrice;
      if (isOver) {
        const divisor = (row.isRoll && row.unit === "m2") ? arrivalArea : finalQuantity;
        finalUnitPrice = divisor > 0 ? Number((amountVal / divisor).toFixed(6)) : 0;
      }

      return {
        referenceNumber: row.lineNumber,
        partnerDocumentNumber: row.purchaseOrderNumber, // PO Number on receipt item level
        materialCode: row.goodsCode,
        materialName: row.goodsName,
        unit: row.unit || "卷",
        unitPrice: finalUnitPrice,
        rollCount: finalRollCount,
        width: widthVal,
        length: finalLength,
        quantity: finalQuantity,
        isRoll: row.isRoll,
        amount: amountVal,
        targetStorageCode: "TW-QC-GEN", // Default waiting for IQC storage
        notes: "",
      };
    });

    onConfirm(selectedItems);
    setSelectedRowKeys([]);
    setCustomRollCounts({});
    setCustomRollLengths({});
    setCustomArrivalQuantities({});
    setErrorKeys([]);
  };

  const handleClose = () => {
    setSelectedRowKeys([]);
    setCustomRollCounts({});
    setCustomRollLengths({});
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
        label: "寬度 (mm)",
        name: "width" as any,
        width: 90,
        align: "right",
        render: (val: number) => {
          if (val == null) return "-";
          return Number(val.toFixed(4)).toLocaleString();
        }
      },
      {
        label: "長度",
        name: "length" as any,
        width: 90,
        align: "right",
        render: (val: number, record: any) => {
          if (val == null) return "-";
          const suffix = record.isRoll ? " m" : " mm";
          return `${Number(val.toFixed(4)).toLocaleString()}${suffix}`;
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

          let arrivalArea = qty;
          if (record.isRoll && record.unit === "m2") {
            const widthMm = record.width && record.width > 0 ? record.width : 1000;
            arrivalArea = qty * (widthMm / 1000);
          }
          const isOver = arrivalArea > undelivered;

          let recalculatedPrice = price;
          if (isOver && qty > 0) {
            const subtotal = Math.round(price * undelivered);
            recalculatedPrice = subtotal / arrivalArea;
          }

          return (
            <div className="flex flex-col items-end">
              <span className="font-semibold text-[#0958d9] dark:text-[#177ddc]">
                {v != null ? Number(v.toFixed(4)).toLocaleString("zh-TW") : "0"}
              </span>
              {isChecked && isOver && qty > 0 && recalculatedPrice !== price && (
                <span className="text-[11px] text-[#8c8c8c] dark:text-[#8c8c8c] font-normal">
                  重算: {Number(recalculatedPrice.toFixed(4)).toLocaleString("zh-TW")}
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
      {
        label: "未到貨量",
        name: "undeliveredQuantity" as any,
        width: 90,
        align: "right",
        render: (v: number, record: any) => {
          if (record.isRoll) {
            return (
              <span className="font-semibold text-[#1890ff] dark:text-[#177ddc]">
                {record.undeliveredLength != null ? `${Number(record.undeliveredLength.toFixed(2)).toLocaleString("zh-TW")} m` : "0 m"}
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
        label: "到貨卷數",
        name: "rollCount" as any,
        width: 90,
        align: "right",
        render: (v: number, record: any) => {
          if (!record.isRoll) return "-";
          const isChecked = selectedRowKeys.includes(record.key);
          const hasError = errorKeys.includes(record.key);
          const rCount = customRollCounts[record.key] !== undefined ? customRollCounts[record.key] : record.rollCount;
          const rLength = customRollLengths[record.key] !== undefined ? customRollLengths[record.key] : record.rollLength;
          const arrivalLength = rCount * rLength;
          const isOverLimit = arrivalLength > record.undeliveredLength * 1.1;

          return (
            <InputNumber
              id={`roll-count-input-${record.key}`}
              value={isChecked ? v : undefined}
              disabled={!isChecked}
              status={hasError && (!v || v <= 0 || isOverLimit) ? "error" : undefined}
              min={1}
              precision={0}
              onChange={(val) => {
                const numVal = val === null ? 0 : Number(val);
                setCustomRollCounts((prev) => ({
                  ...prev,
                  [record.key]: numVal,
                }));

                const currentLength = customRollLengths[record.key] !== undefined ? customRollLengths[record.key] : record.rollLength;
                const arrLen = numVal * currentLength;
                const isOver = arrLen > record.undeliveredLength * 1.1;

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
        }
      },
      {
        label: "每卷長度 (m)",
        name: "rollLength" as any,
        width: 100,
        align: "right",
        render: (v: number, record: any) => {
          if (!record.isRoll) return "-";
          const isChecked = selectedRowKeys.includes(record.key);
          const hasError = errorKeys.includes(record.key);
          const rCount = customRollCounts[record.key] !== undefined ? customRollCounts[record.key] : record.rollCount;
          const rLength = customRollLengths[record.key] !== undefined ? customRollLengths[record.key] : record.rollLength;
          const arrivalLength = rCount * rLength;
          const isOverLimit = arrivalLength > record.undeliveredLength * 1.1;

          return (
            <InputNumber
              id={`roll-length-input-${record.key}`}
              value={isChecked ? v : undefined}
              disabled={!isChecked}
              status={hasError && (!v || v <= 0 || isOverLimit) ? "error" : undefined}
              min={0.0001}
              onChange={(val) => {
                const numVal = val === null ? 0 : Number(val);
                setCustomRollLengths((prev) => ({
                  ...prev,
                  [record.key]: numVal,
                }));

                const currentCount = customRollCounts[record.key] !== undefined ? customRollCounts[record.key] : record.rollCount;
                const arrLen = currentCount * numVal;
                const isOver = arrLen > record.undeliveredLength * 1.1;

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
        }
      },
      {
        label: "到貨量",
        name: "arrivalQuantity" as any,
        width: 100,
        align: "right",
        render: (v: number, record: any) => {
          const isChecked = selectedRowKeys.includes(record.key);
          const hasError = errorKeys.includes(record.key);
          
          if (record.isRoll) {
            return (
              <span className="font-bold text-[#18a058] dark:text-[#389e0d] pr-2">
                {isChecked ? `${Number(record.arrivalQuantity.toFixed(2)).toLocaleString("zh-TW")} m` : "-"}
              </span>
            );
          }

          return (
            <InputNumber
              id={`arrival-input-${record.key}`}
              value={isChecked ? v : undefined}
              disabled={!isChecked}
              status={hasError ? "error" : undefined}
              min={1}
              onChange={(val) => {
                const numVal = val === null ? 0 : Number(val);
                setCustomArrivalQuantities((prev) => ({
                  ...prev,
                  [record.key]: numVal,
                }));

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
        width: 100,
        align: "right",
        render: (_v: any, record: any) => {
          const isChecked = selectedRowKeys.includes(record.key);
          const qty = isChecked ? (record.arrivalQuantity || 0) : 0;
          const undelivered = record.undeliveredQuantity || 0;
          const price = record.unitPrice || 0;

          let arrivalArea = qty;
          if (record.isRoll && record.unit === "m2") {
            const widthMm = record.width && record.width > 0 ? record.width : 1000;
            arrivalArea = qty * (widthMm / 1000);
          }

          const subtotal = arrivalArea >= undelivered
            ? Math.round(price * undelivered)
            : Math.round(price * arrivalArea);
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
    ];

    let finalConfigs = configs;
    if (isMold) {
      finalConfigs = configs.filter(col => 
        col.label !== "寬度 (mm)" &&
        col.label !== "長度" &&
        col.label !== "取消量" && 
        col.label !== "到貨卷數" && 
        col.label !== "每卷長度 (m)"
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
  }, [selectedRowKeys, customRollCounts, customRollLengths, customArrivalQuantities, errorKeys, isMold]);

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
