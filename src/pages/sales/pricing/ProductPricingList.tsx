import { useState, useEffect, useMemo, useRef } from "react";
import { 
  Button, Card, Spin, InputNumber, Radio, Typography, 
  App, Empty, Form, Row, Col, Select, Descriptions
} from "antd";
import { 
  SyncOutlined, CheckCircleOutlined, InfoCircleOutlined 
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageCard } from "@/components/common/PageCard";
import { getApiV1Product } from "@/api/generated/sdk.gen";
import { client } from "@/api/generated/client.gen";
import { useThemeStore } from "@/stores/useThemeStore";
import { AutoCompleteField } from "@/components/Form/AutoComplete";
import { BusinessPartnerRoleTypes } from "@/constants";

const { Paragraph, Text } = Typography;

// Helper function to safely format numbers as TWD currency
const formatCurrency = (val: any) => {
  if (val === undefined || val === null || isNaN(Number(val))) return "-";
  return new Intl.NumberFormat("zh-TW", { style: "currency", currency: "TWD", minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(val);
};

// Pricing parameters stored in LocalStorage
interface LocalPricingParams {
  laborCost: number;
  transportCost: number;
  logisticsCost: number;
  otherCost: number;
  marginType: "markup" | "gross"; // markup: 成本加成, gross: 毛利率
  marginRate: number; // in percent, e.g. 20 for 20%
}

const DEFAULT_PARAMS: LocalPricingParams = {
  laborCost: 0,
  transportCost: 0,
  logisticsCost: 0,
  otherCost: 0,
  marginType: "markup",
  marginRate: 20
};

export default function ProductPricingList() {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const isDarkMode = useThemeStore((state) => state.mode === "dark");

  // Search/Flow states
  const [customerCode, setCustomerCode] = useState("");
  const [selectedProductCode, setSelectedProductCode] = useState<string | null>(null);

  // Form states for manual simulation inputs
  const [laborCost, setLaborCost] = useState<number>(0);
  const [transportCost, setTransportCost] = useState<number>(0);
  const [logisticsCost, setLogisticsCost] = useState<number>(0);
  const [otherCost, setOtherCost] = useState<number>(0);
  const [marginType, setMarginType] = useState<"markup" | "gross">("markup");
  const [marginRate, setMarginRate] = useState<number>(20);

  // Ref for focus when a product is loaded
  const firstInputRef = useRef<any>(null);

  // Determine if the customer code input is sufficient for query
  const isCustomerValidInput = useMemo(() => {
    return customerCode && customerCode.trim().length >= 2;
  }, [customerCode]);

  // 1. Fetch products belonging to the selected customer (whenever customerCode is inputted)
  const { data: customerProductsResponse, isFetching: isProductsLoading } = useQuery({
    queryKey: ["customer-products-pricing-main", customerCode],
    queryFn: () => 
      getApiV1Product({
        query: {
          Customer: customerCode.trim(),
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

  // 2. Fetch specific product's pricing base data (containing BOM standard cost)
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

  // Handle Customer Selection and Input Change
  const handleCustomerChange = (val: string) => {
    setCustomerCode(val);
    setSelectedProductCode(null); // Clear selected product when customer changes
  };

  // Load and save pricing simulation parameters from LocalStorage when selected product changes
  useEffect(() => {
    if (selectedProductCode) {
      const stored = localStorage.getItem(`pricing_params_${selectedProductCode}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as LocalPricingParams;
          setLaborCost(parsed.laborCost ?? 0);
          setTransportCost(parsed.transportCost ?? 0);
          setLogisticsCost(parsed.logisticsCost ?? 0);
          setOtherCost(parsed.otherCost ?? 0);
          setMarginType(parsed.marginType ?? "markup");
          setMarginRate(parsed.marginRate ?? 20);
        } catch (e) {
          console.error("Error parsing stored pricing parameters", e);
        }
      } else {
        // Reset to defaults
        setLaborCost(DEFAULT_PARAMS.laborCost);
        setTransportCost(DEFAULT_PARAMS.transportCost);
        setLogisticsCost(DEFAULT_PARAMS.logisticsCost);
        setOtherCost(DEFAULT_PARAMS.otherCost);
        setMarginType(DEFAULT_PARAMS.marginType);
        setMarginRate(DEFAULT_PARAMS.marginRate);
      }

      // Auto focus on opening
      setTimeout(() => {
        if (firstInputRef.current) {
          firstInputRef.current.focus();
        }
      }, 150);
    }
  }, [selectedProductCode]);

  // Real-time calculations
  const calculatedResults = useMemo(() => {
    const totalCost = Number(standardMaterialCost) + laborCost + transportCost + logisticsCost + otherCost;
    let trialPrice = 0;

    if (marginType === "markup") {
      // Cost Plus: Trial Price = Cost * (1 + Margin%)
      trialPrice = totalCost * (1 + marginRate / 100);
    } else {
      // Gross Margin: Trial Price = Cost / (1 - Margin%)
      const rateFactor = 1 - marginRate / 100;
      trialPrice = rateFactor > 0 ? totalCost / rateFactor : 0;
    }

    const priceDiff = trialPrice - currentUnitPrice;
    const priceDiffPercent = currentUnitPrice > 0 ? (priceDiff / currentUnitPrice) * 100 : 0;

    return {
      totalCost,
      trialPrice: Math.max(0, trialPrice),
      priceDiff,
      priceDiffPercent
    };
  }, [standardMaterialCost, laborCost, transportCost, logisticsCost, otherCost, marginType, marginRate, currentUnitPrice]);

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
        
        // Save current simulation parameters to LocalStorage as well
        const paramsToStore: LocalPricingParams = {
          laborCost,
          transportCost,
          logisticsCost,
          otherCost,
          marginType,
          marginRate
        };
        localStorage.setItem(`pricing_params_${selectedProductCode}`, JSON.stringify(paramsToStore));

        // Invalidate queries to sync state
        queryClient.invalidateQueries({ queryKey: ["product-pricing-base-main", selectedProductCode] });
        queryClient.invalidateQueries({ queryKey: ["customer-products-pricing-main", customerCode] });
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
    setLaborCost(DEFAULT_PARAMS.laborCost);
    setTransportCost(DEFAULT_PARAMS.transportCost);
    setLogisticsCost(DEFAULT_PARAMS.logisticsCost);
    setOtherCost(DEFAULT_PARAMS.otherCost);
    setMarginType(DEFAULT_PARAMS.marginType);
    setMarginRate(DEFAULT_PARAMS.marginRate);
    message.info("已重置所有試算費用參數為預設值。");
  };

  const handleFullClear = () => {
    setCustomerCode("");
    setSelectedProductCode(null);
  };

  return (
    <div className="p-4 flex flex-col h-full" style={{ minHeight: "calc(100vh - 64px)" }}>
      <PageCard
        title="產品銷售輔助定價管理"
        extra={
          <Button 
            icon={<SyncOutlined />} 
            onClick={() => {
              if (selectedProductCode) refetchPricingBase();
              if (isCustomerValidInput) queryClient.invalidateQueries({ queryKey: ["customer-products-pricing-main", customerCode] });
            }} 
            loading={isPricingBaseLoading || isProductsLoading}
            size="small"
          >
            整理
          </Button>
        }
      >
        {/* Step-by-Step Search Bar Flow */}
        <div className="mb-4 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
          <Row gutter={[16, 12]} align="middle">
            {/* 1. Customer Autocomplete */}
            <Col xs={24} md={11} className="text-left">
              <div className="flex flex-col space-y-1">
                <span className="text-xs font-bold text-slate-500 block">第一步：請搜尋並選擇客戶</span>
                <AutoCompleteField
                  configKey={BusinessPartnerRoleTypes.CUSTOMER}
                  value={customerCode}
                  onChange={handleCustomerChange}
                  placeholder="請輸入客戶名稱或代號進行搜尋 (如: C0008)..."
                />
              </div>
            </Col>

            {/* 2. Product Dropdown Select */}
            <Col xs={24} md={11} className="text-left">
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

            {/* Clear All */}
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

        {/* Pricing Workspace Area (Replaces the bottom Table) */}
        <div className="flex-1 min-h-[450px]">
          {selectedProductCode ? (
            <Spin spinning={isPricingBaseLoading} tip="產品 BOM 標準材料成本重算中...">
              {pricingBase ? (
                <Row gutter={[16, 16]}>
                  {/* Left Column: Cost Input Parameters & Methods */}
                  <Col xs={24} lg={15} className="space-y-4 text-left">
                    
                    {/* A. Product Info Card */}
                    <Card size="small" className={`shadow-sm ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                      <DescriptionsTitle title="成品基礎資訊 (BOM 動態滾算)" />
                      <Descriptions size="small" column={{ xs: 1, sm: 2 }} className="mt-2 font-semibold">
                        <Descriptions.Item label={<span className="text-slate-400">成品品號</span>}>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{pricingBase.productCode}</span>
                        </Descriptions.Item>
                        <Descriptions.Item label={<span className="text-slate-400">成品名稱</span>}>
                          <span className="text-slate-800 dark:text-slate-100">{pricingBase.productName}</span>
                        </Descriptions.Item>
                        <Descriptions.Item label={<span className="text-slate-400">目前銷售單價</span>}>
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{formatCurrency(currentUnitPrice)}</span>
                        </Descriptions.Item>
                        <Descriptions.Item label={<span className="text-slate-400">BOM 標準材料成本</span>}>
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{formatCurrency(standardMaterialCost)}</span>
                        </Descriptions.Item>
                      </Descriptions>
                    </Card>

                    {/* B. Manual Fee Parameters Inputs */}
                    <Card size="small" title={<span className="font-bold text-slate-800 dark:text-slate-200 text-sm">輸入系統未包含之費用參數</span>} className="shadow-sm">
                      <Form layout="vertical" size="small">
                        <Row gutter={12}>
                          <Col span={12}>
                            <Form.Item label={<span className="text-xs font-semibold text-slate-500">直接人工費 (Unit)</span>}>
                              <InputNumber
                                ref={firstInputRef}
                                style={{ width: "100%" }}
                                value={laborCost}
                                onChange={(val) => setLaborCost(val || 0)}
                                min={0}
                                precision={4}
                                addonAfter="元"
                                className="font-mono text-right-align-input"
                              />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label={<span className="text-xs font-semibold text-slate-500">產品運輸費 (Unit)</span>}>
                              <InputNumber
                                style={{ width: "100%" }}
                                value={transportCost}
                                onChange={(val) => setTransportCost(val || 0)}
                                min={0}
                                precision={4}
                                addonAfter="元"
                                className="font-mono text-right-align-input"
                              />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label={<span className="text-xs font-semibold text-slate-500">倉儲物流費 (Unit)</span>}>
                              <InputNumber
                                style={{ width: "100%" }}
                                value={logisticsCost}
                                onChange={(val) => setLogisticsCost(val || 0)}
                                min={0}
                                precision={4}
                                addonAfter="元"
                                className="font-mono text-right-align-input"
                              />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label={<span className="text-xs font-semibold text-slate-500">其他製造雜費 (Unit)</span>}>
                              <InputNumber
                                style={{ width: "100%" }}
                                value={otherCost}
                                onChange={(val) => setOtherCost(val || 0)}
                                min={0}
                                precision={4}
                                addonAfter="元"
                                className="font-mono text-right-align-input"
                              />
                            </Form.Item>
                          </Col>
                        </Row>
                      </Form>
                    </Card>

                    {/* C. Pricing Method Config */}
                    <Card size="small" title={<span className="font-bold text-slate-800 dark:text-slate-200 text-sm">定價方法與利潤率參數</span>} className="shadow-sm">
                      <Form layout="vertical" size="small">
                        <Form.Item label={<span className="text-xs font-semibold text-slate-500">計算公式模型</span>}>
                          <Radio.Group 
                            value={marginType} 
                            onChange={(e) => setMarginType(e.target.value)}
                            optionType="button"
                            buttonStyle="solid"
                            className="w-full text-center flex"
                          >
                            <Radio.Button value="markup" className="flex-1">成本加成法 (Cost Plus)</Radio.Button>
                            <Radio.Button value="gross" className="flex-1">預期毛利率法 (Gross Margin)</Radio.Button>
                          </Radio.Group>
                        </Form.Item>

                        <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500 space-y-1 mb-3">
                          <div className="flex items-center space-x-1 font-bold text-slate-600 dark:text-slate-300">
                            <InfoCircleOutlined className="text-blue-500" />
                            <span>當前公式模型：</span>
                          </div>
                          {marginType === "markup" ? (
                            <Paragraph className="mb-0 font-mono text-slate-700 dark:text-slate-300">
                              試算單價 = (材料成本 + 人工 + 運輸 + 物流 + 其他) × (1 + 預期加成率%)
                            </Paragraph>
                          ) : (
                            <Paragraph className="mb-0 font-mono text-slate-700 dark:text-slate-300">
                              試算單價 = (材料成本 + 人工 + 運輸 + 物流 + 其他) ÷ (1 - 預期毛利率%)
                            </Paragraph>
                          )}
                        </div>

                        <Form.Item label={<span className="text-xs font-semibold text-slate-500">{marginType === "markup" ? "預期成本加成率 (%)" : "預期毛利率 (%)"}</span>}>
                          <InputNumber
                            style={{ width: "100%" }}
                            value={marginRate}
                            onChange={(val) => setMarginRate(val || 0)}
                            min={0}
                            max={marginType === "gross" ? 99 : 999}
                            precision={2}
                            addonAfter="%"
                            className="font-mono text-right-align-input"
                          />
                        </Form.Item>
                      </Form>
                    </Card>
                  </Col>

                  {/* Right Column: Calculations Simulator & Action Triggers */}
                  <Col xs={24} lg={9} className="space-y-4 text-left">
                    
                    {/* D. Output Results Display Card */}
                    <Card 
                      size="small" 
                      title={<span className="font-bold text-slate-800 dark:text-slate-100">定價試算模擬結果</span>} 
                      className={`shadow border-2 ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-emerald-50/40 border-emerald-200"}`}
                    >
                      <div className="space-y-3.5 py-1 text-sm text-slate-700 dark:text-slate-200">
                        <div className="flex justify-between items-center border-b border-dashed border-slate-200 dark:border-slate-800 pb-2">
                          <span className="font-semibold text-slate-500">1. 加總總材料成本 (BOM)：</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formatCurrency(standardMaterialCost)}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-dashed border-slate-200 dark:border-slate-800 pb-2">
                          <span className="font-semibold text-slate-500">2. 自訂費用參數加總：</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formatCurrency(laborCost + transportCost + logisticsCost + otherCost)}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-dashed border-slate-200 dark:border-slate-800 pb-2">
                          <span className="font-bold text-slate-600 dark:text-slate-300">3. 產品生產總成本：</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{formatCurrency(calculatedResults.totalCost)}</span>
                        </div>
                        
                        <div className="pt-3 flex flex-col justify-between items-stretch">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-base text-slate-800 dark:text-slate-100">💡 建議銷售單價：</span>
                            <div className="text-right">
                              <span className="font-mono font-extrabold text-3xl text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(calculatedResults.trialPrice)}
                              </span>
                            </div>
                          </div>
                          
                          {calculatedResults.trialPrice > 0 && currentUnitPrice > 0 && (
                            <div className="bg-white dark:bg-slate-950 p-2 rounded border border-slate-100 dark:border-slate-800 text-xs mt-3 flex justify-between items-center font-semibold">
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
                      <div className="flex flex-col space-y-3.5">
                        <div className="text-xs text-slate-400">
                          * 點擊儲存後，此建議售價將直接寫入成品主檔中的 UnitPrice，對未來的報價/銷貨單即刻生效。
                        </div>
                        <div className="flex justify-between items-center w-full">
                          {/* Save(L) / Cancel(R) Layout */}
                          <Button 
                            type="primary" 
                            icon={<CheckCircleOutlined />}
                            onClick={handleSavePrice}
                            loading={updatePriceMutation.isPending}
                            className="bg-emerald-600 hover:bg-emerald-500 border-none px-6"
                          >
                            儲存主檔
                          </Button>
                          <Button 
                            icon={<SyncOutlined />}
                            onClick={handleResetSimulator} 
                            danger
                            type="dashed"
                            className="px-6"
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
                    <p className="font-semibold text-slate-500">銷售輔助定價工作區</p>
                    <p className="text-xs">請選擇上方客戶並選取成品品號，系統將自動重算 BOM 材料成本並開啟試算工作區。</p>
                  </div>
                } 
                className="py-12"
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
    <div className="flex items-center space-x-1.5 border-b border-slate-200 dark:border-slate-800 pb-1 mb-2">
      <div className="w-1 h-3.5 bg-blue-600 rounded"></div>
      <span className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">{title}</span>
    </div>
  );
}
