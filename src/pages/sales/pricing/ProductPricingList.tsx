import { useState, useEffect, useMemo, useRef } from "react";
import { 
  Button, Card, Spin, InputNumber, Radio, Typography, 
  App, Empty, Form, Row, Col, Select, Descriptions, Table
} from "antd";
import { 
  SyncOutlined, CheckCircleOutlined 
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageCard } from "@/components/common/PageCard";
import { 
  getApiV1Product, 
  getApiV1BomByProductCode
} from "@/api/generated/sdk.gen";
import { client } from "@/api/generated/client.gen";
import { useThemeStore } from "@/stores/useThemeStore";
import { AutoCompleteField } from "@/components/Form/AutoComplete";
import { BusinessPartnerRoleTypes } from "@/constants";

const { Text } = Typography;

// Helper function to safely format numbers as TWD currency
const formatCurrency = (val: any) => {
  if (val === undefined || val === null || isNaN(Number(val))) return "-";
  return new Intl.NumberFormat("zh-TW", { style: "currency", currency: "TWD", minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(val);
};

// Pricing parameters stored in LocalStorage for persistence
interface LocalPricingParams {
  simulatedQty: number;       // 模擬銷售數量
  laborHours: number;         // 預估生產總工時
  laborRatePerHour: number;   // 每工時人工成本
  totalFreightCost: number;   // 總運輸物流費 (整批)
  totalOtherCost: number;     // 總其他製造雜費 (整批)
  marginType: "markup" | "gross"; // markup: 成本加成, gross: 毛利率
  markupRate: number;         // 預期成本加成率 %
  grossMarginRate: number;    // 預期目標毛利率 %
  moldCost: number;           // 模具開發費 (整批)
  moldAmortizationType: "amortize" | "separate"; // 模具費用分攤模式
}

const DEFAULT_PARAMS: LocalPricingParams = {
  simulatedQty: 1000,
  laborHours: 8,
  laborRatePerHour: 180,
  totalFreightCost: 1500,
  totalOtherCost: 500,
  marginType: "markup",
  markupRate: 20,
  grossMarginRate: 16.67,
  moldCost: 0,
  moldAmortizationType: "amortize"
};

export default function ProductPricingList() {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const isDarkMode = useThemeStore((state) => state.mode === "dark");

  // Search/Flow states
  const [customerCode, setCustomerCode] = useState("");
  const [selectedProductCode, setSelectedProductCode] = useState<string | null>(null);

  // Form states for manual simulation inputs
  const [simulatedQty, setSimulatedQty] = useState<number>(1000);
  const [laborHours, setLaborHours] = useState<number>(8);
  const [laborRatePerHour, setLaborRatePerHour] = useState<number>(180);
  const [totalFreightCost, setTotalFreightCost] = useState<number>(1500);
  const [totalOtherCost, setTotalOtherCost] = useState<number>(500);
  const [moldCost, setMoldCost] = useState<number>(0);
  const [moldAmortizationType, setMoldAmortizationType] = useState<"amortize" | "separate">("amortize");
  const [marginType, setMarginType] = useState<"markup" | "gross">("markup");
  const [markupRate, setMarkupRate] = useState<number>(20);
  const [grossMarginRate, setGrossMarginRate] = useState<number>(16.67);

  // Ref for focus when a product is loaded
  const firstInputRef = useRef<any>(null);

  // Ref to prevent saving default values before state loading is completed
  const isLoadedRef = useRef<string | null>(null);

  // Extract clean customer code from code+name string, e.g. "C0008 (茂迪股份有限公司)" -> "C0008"
  const cleanCustomerCode = useMemo(() => {
    if (!customerCode) return "";
    const trimmed = customerCode.trim();
    if (trimmed.includes(" ")) {
      return trimmed.split(" ")[0].trim();
    }
    if (trimmed.includes("(")) {
      return trimmed.split("(")[0].trim();
    }
    return trimmed;
  }, [customerCode]);

  // Determine if the customer code input is sufficient for query
  const isCustomerValidInput = useMemo(() => {
    return cleanCustomerCode && cleanCustomerCode.length >= 2;
  }, [cleanCustomerCode]);

  // Fetch products belonging to the selected customer (whenever customerCode is inputted)
  const { data: customerProductsResponse, isFetching: isProductsLoading } = useQuery({
    queryKey: ["customer-products-pricing-main", cleanCustomerCode],
    queryFn: () => 
      getApiV1Product({
        query: {
          Customer: cleanCustomerCode,
          pageSize: -1 // Use -1 to retrieve all records without pagination, allowed by backend
        }
      }),
    enabled: !!isCustomerValidInput
  });

  const productOptions = useMemo(() => {
    const rawList = ((customerProductsResponse?.data as any)?.data?.data || (customerProductsResponse?.data as any)?.data || []) as any[];
    return rawList.map((p: any) => ({
      label: `${p.code} (${p.name})`,
      value: p.code
    }));
  }, [customerProductsResponse]);

  // Fetch specific product's pricing base data (containing BOM standard cost)
  const { data: pricingBaseResponse, isFetching: isPricingBaseLoading, refetch: refetchPricingBase } = useQuery({
    queryKey: ["product-pricing-base-main", selectedProductCode],
    queryFn: async () => {
      const res = await client.get<any>({
        url: `/api/v1/ProductCost/pricing-base/${selectedProductCode}`
      });
      return res.data?.data || res.data;
    },
    enabled: !!selectedProductCode
  });

  const pricingBase = pricingBaseResponse;
  const standardMaterialCost = pricingBase?.standardMaterialCost || 0;
  const currentUnitPrice = pricingBase?.currentUnitPrice || 0;

  // Fetch product's BOM table to check availability and list materials
  const { data: bomData, isFetching: isBomLoading } = useQuery({
    queryKey: ["product-pricing-bom", selectedProductCode],
    queryFn: async () => {
      try {
        const res = await getApiV1BomByProductCode({ path: { productCode: selectedProductCode! } });
        return res.data?.data || null;
      } catch (e: any) {
        if (e?.response?.status === 404 || e?.response?.status === 400 || (e && !e.response)) {
          return null;
        }
        throw e;
      }
    },
    enabled: !!selectedProductCode
  });

  // Determine if any material inside BOM has 0 or null cost
  const hasZeroCostMaterial = useMemo(() => {
    if (!bomData || !bomData.items) return false;
    return bomData.items.some((item: any) => !item.materialUnitPrice || Number(item.materialUnitPrice) === 0);
  }, [bomData]);

  // Handle BOM Verification and Termination Rule
  useEffect(() => {
    if (selectedProductCode && bomData === null && !isBomLoading) {
      modal.warning({
        title: "成品尚無 BOM 結構表",
        content: (
          <div className="space-y-1.5 text-slate-500 text-xs pt-1.5">
            <p>成品編號: <strong className="font-mono text-slate-800 dark:text-slate-100">{selectedProductCode}</strong></p>
            <p className="text-red-500 font-semibold mt-1">⚠️ 警告：該成品尚未建立 BOM 結構表，無法抓取基準材料成本！</p>
            <p>系統將終止當指定價試算。請先前往「成品主檔 ➜ BOM 結構維護」建立用料清單後再行試算定價。</p>
          </div>
        ),
        centered: true,
        okText: "我知道了",
        onOk: () => {
          setSelectedProductCode(null); // Terminate and reset selection
        }
      });
    }
  }, [selectedProductCode, bomData, isBomLoading, modal]);

  // Handle Customer Selection and Input Change (Code + Name display combined)
  const handleCustomerChange = (val: string, option?: any) => {
    if (option) {
      // The user selected an option from the autocomplete list. Store the full "Code (Name)" string!
      setCustomerCode(option.label);
    } else {
      // The user is typing manually
      setCustomerCode(val);
    }
    setSelectedProductCode(null); // Clear selected product when customer changes
  };

  // Load pricing simulation parameters from LocalStorage when selected product changes
  useEffect(() => {
    if (selectedProductCode) {
      isLoadedRef.current = null; // Mark as loading
      const stored = localStorage.getItem(`pricing_params_${selectedProductCode}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as LocalPricingParams;
          setSimulatedQty(parsed.simulatedQty ?? 1000);
          setLaborHours(parsed.laborHours ?? 8);
          setLaborRatePerHour(parsed.laborRatePerHour ?? 180);
          setTotalFreightCost(parsed.totalFreightCost ?? 1500);
          setTotalOtherCost(parsed.totalOtherCost ?? 500);
          setMoldCost(parsed.moldCost ?? 0);
          setMoldAmortizationType(parsed.moldAmortizationType ?? "amortize");
          setMarginType(parsed.marginType ?? "markup");
          
          const mRate = parsed.markupRate ?? 20;
          const gRate = parsed.grossMarginRate ?? 16.67;
          setMarkupRate(mRate);
          setGrossMarginRate(gRate);
        } catch (e) {
          console.error("Error parsing stored pricing parameters", e);
        }
      } else {
        // Reset to defaults
        setSimulatedQty(DEFAULT_PARAMS.simulatedQty);
        setLaborHours(DEFAULT_PARAMS.laborHours);
        setLaborRatePerHour(DEFAULT_PARAMS.laborRatePerHour);
        setTotalFreightCost(DEFAULT_PARAMS.totalFreightCost);
        setTotalOtherCost(DEFAULT_PARAMS.totalOtherCost);
        setMarginType(DEFAULT_PARAMS.marginType);
        setMarkupRate(DEFAULT_PARAMS.markupRate);
        setGrossMarginRate(DEFAULT_PARAMS.grossMarginRate);
      }

      // Mark as fully loaded for this specific product code
      isLoadedRef.current = selectedProductCode;

      // Auto focus on opening
      setTimeout(() => {
        if (firstInputRef.current) {
          firstInputRef.current.focus();
        }
      }, 150);
    } else {
      isLoadedRef.current = null;
    }
  }, [selectedProductCode]);

  // Real-time double-sync for cost markup & gross margin rates
  const handleMarkupChange = (val: number | null) => {
    const rate = val || 0;
    setMarkupRate(rate);
    if (marginType === "markup") {
      const syncedGross = (rate / (100 + rate)) * 100;
      setGrossMarginRate(Math.round(syncedGross * 100) / 100);
    }
  };

  const handleGrossChange = (val: number | null) => {
    const rate = val || 0;
    setGrossMarginRate(rate);
    if (marginType === "gross") {
      const syncedMarkup = rate < 100 ? (rate / (100 - rate)) * 100 : 0;
      setMarkupRate(Math.round(syncedMarkup * 100) / 100);
    }
  };

  // Synchronize when the pricing method changes
  useEffect(() => {
    if (marginType === "markup") {
      const syncedGross = (markupRate / (100 + markupRate)) * 100;
      setGrossMarginRate(Math.round(syncedGross * 100) / 100);
    } else {
      const syncedMarkup = grossMarginRate < 100 ? (grossMarginRate / (100 - grossMarginRate)) * 100 : 0;
      setMarkupRate(Math.round(syncedMarkup * 100) / 100);
    }
  }, [marginType]);

  // Automatically save current simulation parameters to LocalStorage in real-time as they edit!
  useEffect(() => {
    if (selectedProductCode && isLoadedRef.current === selectedProductCode) {
      const paramsToStore: LocalPricingParams = {
        simulatedQty,
        laborHours,
        laborRatePerHour,
        totalFreightCost,
        totalOtherCost,
        marginType,
        markupRate,
        grossMarginRate,
        moldCost,
        moldAmortizationType
      };
      localStorage.setItem(`pricing_params_${selectedProductCode}`, JSON.stringify(paramsToStore));
    }
  }, [
    selectedProductCode,
    simulatedQty,
    laborHours,
    laborRatePerHour,
    totalFreightCost,
    totalOtherCost,
    marginType,
    markupRate,
    grossMarginRate,
    moldCost,
    moldAmortizationType
  ]);

  // Real-time calculations
  const calculatedResults = useMemo(() => {
    const qty = Math.max(1, simulatedQty); // Avoid division by zero

    // 1. Total Material Cost (BOM) = standardMaterialCost * Quantity
    const totalBatchMaterialCost = Number(standardMaterialCost) * qty;

    // 2. Total Labor Cost = Hours * Hourly Rate
    const totalBatchLaborCost = laborHours * laborRatePerHour;

    // 3. Total Freight & Logistics Cost (Direct from state)
    const totalBatchFreightCost = totalFreightCost;

    // 4. Total Other Overheads (Direct from state)
    const totalBatchOtherCost = totalOtherCost;

    // 5. Total Production Cost (Batch) = sum of all totals + mold cost (if amortized)
    const activeMoldCostInProduction = moldAmortizationType === "amortize" ? moldCost : 0;
    const totalBatchCost = totalBatchMaterialCost + totalBatchLaborCost + totalBatchFreightCost + totalBatchOtherCost + activeMoldCostInProduction;

    // 6. Unit Cost
    const totalUnitCost = totalBatchCost / qty;

    let trialPrice = 0;
    const activeRate = marginType === "markup" ? markupRate : grossMarginRate;

    if (marginType === "markup") {
      // Cost Plus: Trial Price = Cost * (1 + Markup%)
      trialPrice = totalUnitCost * (1 + activeRate / 100);
    } else {
      // Gross Margin: Trial Price = Cost / (1 - Margin%)
      const rateFactor = 1 - activeRate / 100;
      trialPrice = rateFactor > 0 ? totalUnitCost / rateFactor : 0;
    }

    const priceDiff = trialPrice - currentUnitPrice;
    const priceDiffPercent = currentUnitPrice > 0 ? (priceDiff / currentUnitPrice) * 100 : 0;

    // Batch level totals for ERP decision support
    // For separate charge, the mold cost is still collected, so the total revenue of the batch including separate mold fee is:
    const totalBatchRevenue = trialPrice * qty + (moldAmortizationType === "separate" ? moldCost : 0);
    const totalBatchCostWithAllMold = totalBatchCost + (moldAmortizationType === "separate" ? moldCost : 0);
    const totalBatchProfit = totalBatchRevenue - totalBatchCostWithAllMold;

    return {
      totalUnitCost,
      trialPrice: Math.max(0, trialPrice),
      priceDiff,
      priceDiffPercent,
      totalBatchMaterialCost,
      totalBatchLaborCost,
      totalBatchFreightCost,
      totalBatchOtherCost,
      totalBatchCost,
      totalBatchRevenue,
      totalBatchProfit
    };
  }, [standardMaterialCost, simulatedQty, laborHours, laborRatePerHour, totalFreightCost, totalOtherCost, marginType, markupRate, grossMarginRate, currentUnitPrice, moldCost, moldAmortizationType]);

  // Mutation to save price to DB
  const updatePriceMutation = useMutation({
    mutationFn: (unitPrice: number) => 
      client.post({
        url: "/api/v1/ProductCost/update-price",
        body: {
          productCode: selectedProductCode!,
          unitPrice: Math.round(unitPrice * 10000) / 10000 // Round to 4 decimals
        }
      }),
    onSuccess: (res: any) => {
      const responseData = res.data;
      if (responseData?.success || res.status === 200) {
        message.success(responseData?.message || "銷售定價回寫成功！");
        
        // Ensure final state is written to LocalStorage as well
        const paramsToStore: LocalPricingParams = {
          simulatedQty,
          laborHours,
          laborRatePerHour,
          totalFreightCost,
          totalOtherCost,
          marginType,
          markupRate,
          grossMarginRate,
          moldCost,
          moldAmortizationType
        };
        localStorage.setItem(`pricing_params_${selectedProductCode}`, JSON.stringify(paramsToStore));

        // Invalidate queries to sync state
        queryClient.invalidateQueries({ queryKey: ["product-pricing-base-main", selectedProductCode] });
        queryClient.invalidateQueries({ queryKey: ["customer-products-pricing-main", cleanCustomerCode] });
      } else {
        message.error(responseData?.message || "回寫定價失敗");
      }
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || "連線伺服器失敗，請稍後再試。";
      modal.error({
        title: "回寫單價失敗",
        content: errorMsg,
        centered: true
      });
    }
  });

  const handleSavePrice = () => {
    if (calculatedResults.trialPrice <= 0) {
      message.warning("試算單價必須大於 $0.00 元才可進行回寫儲存！");
      return;
    }

    modal.confirm({
      title: "確認更新銷售單價",
      icon: <CheckCircleOutlined className="text-emerald-500" />,
      content: (
        <div className="space-y-2 mt-2">
          <p className="text-sm text-slate-500">
            成品編號：<span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedProductCode}</span>
          </p>
          <p className="text-sm text-slate-500">
            原本單價：<span className="font-semibold text-red-500">{formatCurrency(currentUnitPrice)}</span>
          </p>
          <p className="text-sm text-slate-500 font-semibold">
            試算單價：<span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(calculatedResults.trialPrice)}</span>
          </p>
          <p className="text-sm text-amber-500 font-semibold pt-1">
            ⚠️ 警告：此操作將直接更新該成品在產品主檔中的單價 (UnitPrice)，並對未來的報價及銷貨單生效。您確定要回寫儲存嗎？
          </p>
        </div>
      ),
      okText: "儲存",
      cancelText: "取消",
      okType: "primary",
      centered: true,
      onOk: () => {
        updatePriceMutation.mutate(calculatedResults.trialPrice);
      }
    });
  };

  const handleResetSimulator = () => {
    setSimulatedQty(DEFAULT_PARAMS.simulatedQty);
    setLaborHours(DEFAULT_PARAMS.laborHours);
    setLaborRatePerHour(DEFAULT_PARAMS.laborRatePerHour);
    setTotalFreightCost(DEFAULT_PARAMS.totalFreightCost);
    setTotalOtherCost(DEFAULT_PARAMS.totalOtherCost);
    setMoldCost(DEFAULT_PARAMS.moldCost);
    setMoldAmortizationType(DEFAULT_PARAMS.moldAmortizationType);
    setMarginType(DEFAULT_PARAMS.marginType);
    setMarkupRate(DEFAULT_PARAMS.markupRate);
    setGrossMarginRate(DEFAULT_PARAMS.grossMarginRate);
    message.info("已重置所有試算費用參數為預設值。");
  };

  const handleFullClear = () => {
    setCustomerCode("");
    setSelectedProductCode(null);
  };

  return (
    <div className="p-2 flex flex-col h-full overflow-y-auto" style={{ minHeight: "calc(100vh - 64px)" }}>
      <PageCard
        title="產品銷售輔助定價管理"
        extra={
          <Button 
            icon={<SyncOutlined />} 
            onClick={() => {
              if (selectedProductCode) refetchPricingBase();
              if (isCustomerValidInput) queryClient.invalidateQueries({ queryKey: ["customer-products-pricing-main", cleanCustomerCode] });
            }} 
            loading={isPricingBaseLoading || isProductsLoading || isBomLoading}
            size="small"
          >
            整理
          </Button>
        }
      >
        {/* Step-by-Step Search Bar Flow */}
        <div className="mb-2 bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
          <Row gutter={[8, 8]} align="middle">
            {/* 1. Customer Autocomplete (Col 10 - wide enough to display "C0008 (茂迪股份有限公司)" beautifully) */}
            <Col xs={24} md={10} className="text-left">
              <div className="flex flex-col space-y-1">
                <span className="text-xs font-bold text-slate-500 block">第一步：請搜尋並選擇客戶</span>
                <AutoCompleteField
                  configKey={BusinessPartnerRoleTypes.CUSTOMER}
                  value={customerCode}
                  onChange={handleCustomerChange}
                  placeholder="請輸入客戶代號或名稱進行搜尋 (如: C0008)..."
                />
              </div>
            </Col>

            {/* 2. Product Dropdown Select (Col 12) */}
            <Col xs={24} md={12} className="text-left">
              <div className="flex flex-col space-y-1">
                <span className="text-xs font-bold text-slate-500 block">第二步：選擇該客戶的成品</span>
                <Select
                  showSearch
                  placeholder={
                    !isCustomerValidInput 
                      ? "⬅️ 請先輸入或搜尋選擇客戶" 
                      : isProductsLoading 
                        ? "成品清單讀取中..." 
                        : productOptions.length === 0 
                          ? "該客戶無成品資料" 
                          : "請選擇成品品號進行定價試算..."
                  }
                  value={selectedProductCode}
                  onChange={(val) => setSelectedProductCode(val)}
                  disabled={!isCustomerValidInput || isProductsLoading}
                  options={productOptions}
                  filterOption={(input, option) =>
                    (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                  }
                  style={{ width: "100%" }}
                  className={isDarkMode ? "dark-theme-select" : ""}
                />
              </div>
            </Col>

            {/* Clear All (Col 2) */}
            <Col xs={24} md={2}>
              <Button 
                size="small" 
                onClick={handleFullClear} 
                disabled={!customerCode && !selectedProductCode}
                className="w-full mt-4"
              >
                重置搜尋
              </Button>
            </Col>
          </Row>
        </div>

        {/* Pricing Workspace Area (Symmetric 3-Column Layout: Fits completely on any screen!) */}
        <div className="flex-1">
          {selectedProductCode && bomData ? (
            <Spin spinning={isPricingBaseLoading || isBomLoading} tip="產品資料重算中...">
              {pricingBase ? (
                <Row gutter={[8, 8]}>
                  
                  {/* Column 1: Base Data (Product Info & BOM list) - Widened to lg={10} */}
                  <Col xs={24} lg={10} className="space-y-2 text-left">
                    
                    {/* A. Product Info Card */}
                    <Card size="small" className={`shadow-sm ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                      <DescriptionsTitle title="成品基礎資訊 (BOM 動態滾算)" />
                      <Descriptions size="small" column={1} className="mt-1 font-semibold compact-descriptions">
                        <Descriptions.Item label={<span className="text-slate-400 text-xs">成品品號</span>}>
                          {/* Drills down to warehouse/products/:code in a new tab */}
                          <a 
                            href={`/warehouse/products/${pricingBase.productCode}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="font-mono font-bold text-xs text-blue-500 hover:text-blue-400 hover:underline cursor-pointer transition-colors"
                          >
                            {pricingBase.productCode}
                          </a>
                        </Descriptions.Item>
                        <Descriptions.Item label={<span className="text-slate-400 text-xs">成品名稱</span>}>
                          <span className="text-xs text-slate-800 dark:text-slate-100 ellipsis-line">{pricingBase.productName}</span>
                        </Descriptions.Item>
                        <Descriptions.Item label={<span className="text-slate-400 text-xs">目前單價</span>}>
                          <span className="font-mono font-bold text-xs text-slate-700 dark:text-slate-300">{formatCurrency(currentUnitPrice)}</span>
                        </Descriptions.Item>
                        <Descriptions.Item label={<span className="text-slate-400 text-xs">材料成本</span>}>
                          <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">{formatCurrency(standardMaterialCost)}</span>
                        </Descriptions.Item>
                      </Descriptions>
                    </Card>

                    {/* A2. BOM Material List Card (Highly compact scroll window - added width column) */}
                    {bomData && bomData.items && bomData.items.length > 0 && (
                      <Card 
                        size="small" 
                        title={<span className="font-bold text-slate-800 dark:text-slate-200 text-xs">BOM 用料與整批需求用量清單</span>} 
                        className="shadow-sm"
                      >
                        <Table
                          size="small"
                          columns={[
                            {
                              title: "原料編號",
                              dataIndex: "materialCode",
                              key: "materialCode",
                              width: "18%",
                              render: (val: string) => (
                                <a 
                                  href={`/warehouse/materials/${val}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="font-mono text-[11px] font-bold text-blue-500 hover:text-blue-400 hover:underline cursor-pointer transition-colors"
                                >
                                  {val}
                                </a>
                              )
                            },
                            {
                              title: "原料名稱",
                              dataIndex: "materialName",
                              key: "materialName",
                              width: "18%",
                              ellipsis: true,
                              render: (val: string) => <span className="text-[11px] text-slate-700 dark:text-slate-300">{val}</span>
                            },
                            {
                              title: "幅寬(mm)",
                              dataIndex: "width",
                              key: "width",
                              align: "right" as const,
                              width: "10%",
                              render: (val: number) => <span className="font-mono text-[11px]">{val != null ? val : "-"}</span>
                            },
                            {
                              title: "單位用量",
                              dataIndex: "quantity",
                              key: "quantity",
                              align: "right" as const,
                              width: "14%",
                              render: (val: number) => <span className="font-mono text-[11px]">{val != null ? Number(val.toFixed(4)).toLocaleString() : "-"}</span>
                            },
                            {
                              title: "單價(㎡)",
                              key: "materialUnitPrice",
                              align: "right" as const,
                              width: "13%",
                              render: (_: any, record: any) => {
                                const isZero = !record.materialUnitPrice || record.materialUnitPrice === 0;
                                return (
                                  <span className={`font-mono text-[11px] font-semibold ${isZero ? "text-rose-600 dark:text-rose-400 font-bold" : "text-amber-600 dark:text-amber-400"}`}>
                                    {record.materialUnitPrice != null ? `$${record.materialUnitPrice.toFixed(2)}${isZero ? " ⚠️" : ""}` : "$0.00 ⚠️"}
                                  </span>
                                );
                              }
                            },
                            {
                              title: "成本(PCS)",
                              key: "pcsCost",
                              align: "right" as const,
                              width: "14%",
                              render: (_: any, record: any) => {
                                const scrapPercentage = record.scrapPercentage || 0;
                                const width = record.width || 0;
                                const quantity = record.quantity || 0;
                                const standardSqm = width > 0 
                                  ? quantity * (width / 1000) * (1 + scrapPercentage)
                                  : quantity * (1 + scrapPercentage);
                                const costPerSqm = record.materialUnitPrice || 0;
                                const itemCost = standardSqm * costPerSqm;
                                const isZero = itemCost === 0;
                                return (
                                  <span className={`font-mono text-[11px] font-semibold ${isZero ? "text-rose-600 dark:text-rose-400 font-bold" : "text-emerald-600 dark:text-emerald-400"}`}>
                                    {`$${itemCost.toFixed(4)}${isZero ? " ⚠️" : ""}`}
                                  </span>
                                );
                              }
                            },
                            {
                              title: "整批需求",
                              key: "totalRequired",
                              align: "right" as const,
                              width: "13%",
                              render: (_: any, record: any) => {
                                const totalReq = (record.quantity || 0) * simulatedQty;
                                return <span className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400">{Number(totalReq.toFixed(4)).toLocaleString()}</span>;
                              }
                            }
                          ]}
                          dataSource={bomData.items}
                          rowKey="materialCode"
                          pagination={false}
                          scroll={{ y: 95 }}
                          className="high-density-compact-table"
                        />
                      </Card>
                    )}
                  </Col>

                  {/* Column 2: Simulation Parameters Inputs - Tightened to lg={7} and auto-saves to LocalStorage */}
                  <Col xs={24} lg={7} className="space-y-2 text-left">
                    
                    {/* B. Manual Fee Parameters Inputs */}
                    <Card size="small" title={<span className="font-bold text-slate-800 dark:text-slate-200 text-xs">輸入模擬與費用參數</span>} className="shadow-sm">
                      <Form layout="vertical" size="small">
                        <Row gutter={4}>
                          {/* 1. Simulated Qty */}
                          <Col span={24}>
                            <Form.Item 
                              label={<span className="text-[11px] font-bold text-slate-500">模擬銷售數量 (PCS)</span>}
                              style={{ marginBottom: 4 }}
                            >
                              <InputNumber
                                ref={firstInputRef}
                                style={{ width: "100%" }}
                                value={simulatedQty}
                                onChange={(val) => setSimulatedQty(Math.max(1, val || 1))}
                                min={1}
                                precision={0}
                                addonAfter="PCS"
                                className="font-mono text-right-align-input"
                                onFocus={(e) => e.target.select()}
                              />
                            </Form.Item>
                          </Col>

                          {/* 2. Labor Hours & Rate */}
                          <Col span={12}>
                            <Form.Item 
                              label={<span className="text-[11px] font-semibold text-slate-500">預估總工時</span>}
                              style={{ marginBottom: 4 }}
                            >
                              <InputNumber
                                style={{ width: "100%" }}
                                value={laborHours}
                                onChange={(val) => setLaborHours(val || 0)}
                                min={0}
                                precision={2}
                                addonAfter="H"
                                className="font-mono text-right-align-input"
                                onFocus={(e) => e.target.select()}
                              />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item 
                              label={<span className="text-[11px] font-semibold text-slate-500">每工時工資</span>}
                              style={{ marginBottom: 4 }}
                            >
                              <InputNumber
                                style={{ width: "100%" }}
                                value={laborRatePerHour}
                                onChange={(val) => setLaborRatePerHour(val || 0)}
                                min={0}
                                precision={2}
                                addonAfter="元"
                                className="font-mono text-right-align-input"
                                onFocus={(e) => e.target.select()}
                              />
                            </Form.Item>
                          </Col>

                          {/* 3. Merged Freight */}
                          <Col span={24}>
                            <Form.Item 
                              label={<span className="text-[11px] font-semibold text-slate-500">整批總運輸物流費</span>}
                              style={{ marginBottom: 4 }}
                            >
                              <InputNumber
                                style={{ width: "100%" }}
                                value={totalFreightCost}
                                onChange={(val) => setTotalFreightCost(val || 0)}
                                min={0}
                                precision={2}
                                addonAfter="元"
                                className="font-mono text-right-align-input"
                                onFocus={(e) => e.target.select()}
                              />
                            </Form.Item>
                          </Col>

                          {/* 4. Total Other Cost (Merged to batch) */}
                          <Col span={24}>
                            <Form.Item 
                              label={<span className="text-[11px] font-semibold text-slate-500">整批總其他製造雜費</span>}
                              tooltip="輸入這批模擬銷售數量所對應的整體其他雜費與製造耗損準備金，系統會自動按批量進行單位平攤。"
                              style={{ marginBottom: 4 }}
                            >
                              <InputNumber
                                style={{ width: "100%" }}
                                value={totalOtherCost}
                                onChange={(val) => setTotalOtherCost(val || 0)}
                                min={0}
                                precision={2}
                                addonAfter="元"
                                className="font-mono text-right-align-input"
                                onFocus={(e) => e.target.select()}
                              />
                            </Form.Item>
                          </Col>

                          {/* 5. Mold Cost */}
                          <Col span={12}>
                            <Form.Item 
                              label={<span className="text-[11px] font-semibold text-slate-500">整批模具開發費</span>}
                              style={{ marginBottom: 4 }}
                            >
                              <InputNumber
                                style={{ width: "100%" }}
                                value={moldCost}
                                onChange={(val) => setMoldCost(val || 0)}
                                min={0}
                                precision={2}
                                addonAfter="元"
                                className="font-mono text-right-align-input"
                                onFocus={(e) => e.target.select()}
                              />
                            </Form.Item>
                          </Col>

                          {/* 6. Mold Amortization Mode */}
                          <Col span={12}>
                            <Form.Item 
                              label={<span className="text-[11px] font-semibold text-slate-500">模具分攤模式</span>}
                              style={{ marginBottom: 4 }}
                            >
                              <Select
                                value={moldAmortizationType}
                                onChange={(val) => setMoldAmortizationType(val as any)}
                                options={[
                                  { label: "攤入單價 (模式A)", value: "amortize" },
                                  { label: "獨立收取 (模式B)", value: "separate" }
                                ]}
                                style={{ width: "100%" }}
                                size="small"
                                className="font-semibold text-xs"
                              />
                            </Form.Item>
                          </Col>
                        </Row>
                      </Form>
                    </Card>

                    {/* C. Pricing Method Config */}
                    <Card size="small" title={<span className="font-bold text-slate-800 dark:text-slate-200 text-xs">定價方法與利潤率參數</span>} className="shadow-sm">
                      <Form layout="vertical" size="small">
                        {/* Selected Leading Model */}
                        <Form.Item 
                          label={<span className="text-[11px] font-bold text-slate-500">定價主導方法</span>}
                          style={{ marginBottom: 4 }}
                        >
                          <Radio.Group 
                            value={marginType} 
                            onChange={(e) => setMarginType(e.target.value)}
                            optionType="button"
                            buttonStyle="solid"
                            className="w-full text-center flex"
                            size="small"
                          >
                            <Radio.Button value="markup" className="flex-1 text-[11px]">成本加成法 (Cost Plus)</Radio.Button>
                            <Radio.Button value="gross" className="flex-1 text-[11px]">毛利率法 (Gross Margin)</Radio.Button>
                          </Radio.Group>
                        </Form.Item>

                        <div className="bg-slate-50 dark:bg-slate-900 p-1 rounded border border-dashed border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 mb-2">
                          <span className="font-bold">當前公式：</span>
                          {marginType === "markup" ? "成本總和 × (1 + 加成率%)" : "成本總和 ÷ (1 - 毛利率%)"}
                        </div>

                        {/* Display both inputs with tight margins */}
                        <Row gutter={4}>
                          {/* Cost Plus Markup Input */}
                          <Col span={12}>
                            <Form.Item 
                              label={<span className={`text-[11px] font-semibold ${marginType === "markup" ? "text-blue-600 font-bold" : "text-slate-400"}`}>預期加成率 (%)</span>}
                              style={{ marginBottom: 2 }}
                            >
                              <InputNumber
                                style={{ width: "100%" }}
                                value={markupRate}
                                onChange={handleMarkupChange}
                                disabled={marginType !== "markup"}
                                min={0}
                                max={999}
                                precision={2}
                                addonAfter="%"
                                className={`font-mono text-right-align-input ${marginType !== "markup" ? "bg-slate-100 text-slate-400" : ""}`}
                                onFocus={(e) => e.target.select()}
                              />
                            </Form.Item>
                          </Col>

                          {/* Gross Margin Input */}
                          <Col span={12}>
                            <Form.Item 
                              label={<span className={`text-[11px] font-semibold ${marginType === "gross" ? "text-blue-600 font-bold" : "text-slate-400"}`}>預期毛利率 (%)</span>}
                              style={{ marginBottom: 2 }}
                            >
                              <InputNumber
                                style={{ width: "100%" }}
                                value={grossMarginRate}
                                onChange={handleGrossChange}
                                disabled={marginType !== "gross"}
                                min={0}
                                max={99}
                                precision={2}
                                addonAfter="%"
                                className={`font-mono text-right-align-input ${marginType !== "gross" ? "bg-slate-100 text-slate-400" : ""}`}
                                onFocus={(e) => e.target.select()}
                              />
                            </Form.Item>
                          </Col>
                        </Row>
                      </Form>
                    </Card>
                  </Col>

                  {/* Column 3: Output Results Display & Save Actions - Tightened to lg={7} */}
                  <Col xs={24} lg={7} className="space-y-2 text-left">
                    
                    {/* D. Output Results Display Card */}
                    <Card 
                      size="small" 
                      title={<span className="font-bold text-slate-800 dark:text-slate-100 text-xs">定價試算模擬結果</span>} 
                      className={`shadow border-2 ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-amber-50/10 border-amber-200"}`}
                    >
                      {hasZeroCostMaterial && (
                        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded p-1.5 mb-1.5 text-rose-700 dark:text-rose-400 text-[10px] font-semibold leading-relaxed flex items-start gap-1 shadow-sm animate-pulse">
                          <span className="text-[12px] leading-none">⚠️</span>
                          <div>
                            <strong>警告提示：</strong>
                            BOM 結構中包含成本為 0 的原物料，估算總利潤與單價可能存在較大誤差！
                          </div>
                        </div>
                      )}
                      <div className="space-y-2 py-0.5 text-xs text-slate-700 dark:text-slate-200">
                        {/* Summary of simulated batch */}
                        <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-800 p-1 rounded font-bold mb-1">
                          <span className="text-slate-500">整體模擬銷售總量：</span>
                          <span className="font-mono text-slate-800 dark:text-slate-100">{simulatedQty.toLocaleString()} PCS</span>
                        </div>

                        {/* Cost breakdown showing ORIGINAL TOTAL COSTS (非單位成本) */}
                        <div className="flex justify-between items-center border-b border-dashed border-slate-200 dark:border-slate-800 pb-1">
                          <span className="font-semibold text-slate-500">1. BOM 材料總成本 (整批)：</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formatCurrency(calculatedResults.totalBatchMaterialCost)}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-dashed border-slate-200 dark:border-slate-800 pb-1">
                          <span className="font-semibold text-slate-500">2. 預估生產總人工費 (整批)：</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formatCurrency(calculatedResults.totalBatchLaborCost)}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-dashed border-slate-200 dark:border-slate-800 pb-1">
                          <span className="font-semibold text-slate-500">3. 整批總運輸物流費 (整批)：</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formatCurrency(calculatedResults.totalBatchFreightCost)}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-dashed border-slate-200 dark:border-slate-800 pb-1">
                          <span className="font-semibold text-slate-500">4. 其他製造總雜費 (整批)：</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formatCurrency(calculatedResults.totalBatchOtherCost)}</span>
                        </div>
                        
                        {moldCost > 0 && (
                          <div className="flex justify-between items-center border-b border-dashed border-slate-200 dark:border-slate-800 pb-1">
                            <span className="font-semibold text-slate-500">
                              5. 模具開發費 ({moldAmortizationType === "amortize" ? "整批分攤" : "獨立收費"})：
                            </span>
                            <span className={`font-mono font-bold ${moldAmortizationType === "amortize" ? "text-slate-800 dark:text-slate-200" : "text-slate-400 line-through"}`}>
                              {formatCurrency(moldCost)}
                            </span>
                          </div>
                        )}
                        
                        {/* Overall Original Total Production Cost */}
                        <div className="flex justify-between items-center border-b-2 border-slate-300 dark:border-slate-700 pb-1 pt-0.5">
                          <span className="font-bold text-slate-700 dark:text-slate-200">💡 預估生產總成本 (整批)：</span>
                          <span className="font-mono font-extrabold text-[13px] text-slate-900 dark:text-slate-50">{formatCurrency(calculatedResults.totalBatchCost)}</span>
                        </div>

                        {/* Batch metrics for ERP decision support */}
                        <div className="bg-slate-50 dark:bg-slate-950 p-1.5 rounded border border-slate-200 dark:border-slate-800 space-y-1 text-[10px]">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">產品生產單位成本 (PCS)：</span>
                            <span className="font-mono font-bold text-slate-600 dark:text-slate-400">{formatCurrency(calculatedResults.totalUnitCost)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">預估整批總銷售額：</span>
                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{formatCurrency(calculatedResults.totalBatchRevenue)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">預估整批總利潤：</span>
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(calculatedResults.totalBatchProfit)}</span>
                          </div>
                        </div>
                        
                        {/* Simulated Suggestive Selling Unit Price (Highly prominent) */}
                        <div className="pt-1.5 flex flex-col justify-between items-stretch">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-[11px] text-slate-800 dark:text-slate-100">💡 建議銷售單價 (每單位)：</span>
                            <div className="text-right">
                              <span className="font-mono font-extrabold text-xl text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(calculatedResults.trialPrice)}
                              </span>
                            </div>
                          </div>
                          
                          {calculatedResults.trialPrice > 0 && currentUnitPrice > 0 && (
                            <div className="bg-white dark:bg-slate-950 p-1 rounded border border-slate-100 dark:border-slate-800 text-[10px] mt-1.5 flex justify-between items-center font-semibold">
                              <span className="text-slate-400">與原銷售單價相比：</span>
                              {calculatedResults.priceDiff >= 0 ? (
                                <Text className="text-emerald-500">+{formatCurrency(calculatedResults.priceDiff)} (+{calculatedResults.priceDiffPercent.toFixed(2)}%)</Text>
                              ) : (
                                <Text className="text-red-500">{formatCurrency(calculatedResults.priceDiff)} ({calculatedResults.priceDiffPercent.toFixed(2)}%)</Text>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>

                    {/* E. Control Actions Card (Save(L) / Cancel(R)) */}
                    <Card size="small" className="shadow-sm">
                      <div className="flex flex-col space-y-1.5">
                        <div className="text-[10px] text-slate-400 leading-tight">
                          * 點擊儲存後，此建議售價將直接寫入成品主檔中的 UnitPrice，對未來的報價/銷貨單即刻生效。
                        </div>
                        <div className="flex justify-between items-center w-full">
                          {/* Save(L) / Cancel(R) Layout */}
                          <Button 
                            type="primary" 
                            icon={<CheckCircleOutlined />}
                            onClick={handleSavePrice}
                            loading={updatePriceMutation.isPending}
                            className="bg-emerald-600 hover:bg-emerald-500 border-none px-4 text-[11px]"
                            size="small"
                          >
                            儲存主檔
                          </Button>
                          <Button 
                            icon={<SyncOutlined />}
                            onClick={handleResetSimulator} 
                            danger
                            type="dashed"
                            className="px-4 text-[11px]"
                            size="small"
                          >
                            重置費用
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </Col>
                </Row>
              ) : (
                <Empty description="無法讀取產品成本資料" />
              )}
            </Spin>
          ) : (
            <div className="flex justify-center items-center h-full min-h-[300px]">
              <Empty 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <div className="text-slate-400 space-y-1">
                    <p className="font-semibold text-slate-500 text-xs">銷售輔助定價工作區</p>
                    <p className="text-[11px]">請選擇上方客戶並選取成品品號，系統將自動重算 BOM 材料成本並開啟試算工作區。</p>
                  </div>
                } 
                className="py-8"
              />
            </div>
          )}
        </div>
      </PageCard>
    </div>
  );
}

// Descriptions Sub-Component helper
function DescriptionsTitle({ title }: { title: string }) {
  return (
    <div className="flex items-center space-x-1 border-b border-slate-200 dark:border-slate-800 pb-0.5 mb-1">
      <div className="w-1 h-2.5 bg-blue-600 rounded"></div>
      <span className="font-bold text-[10px] text-slate-800 dark:text-slate-200 uppercase tracking-wider">{title}</span>
    </div>
  );
}
