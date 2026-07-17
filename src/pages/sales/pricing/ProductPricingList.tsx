import { useState, useEffect, useMemo, useRef } from "react";
import { 
  Space, Button, Table, Card, Drawer, Spin, Input, InputNumber, 
  Radio, Typography, App, Empty, Form, Row, Col
} from "antd";
import { 
  SyncOutlined, SearchOutlined, ClearOutlined, DollarOutlined, 
  CalculatorOutlined, CheckCircleOutlined, InfoCircleOutlined 
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageCard } from "@/components/common/PageCard";
import { getApiV1Product } from "@/api/generated/sdk.gen";
import { client } from "@/api/generated/client.gen";
import { useThemeStore } from "@/stores/useThemeStore";

const { Paragraph } = Typography;

// Helper function to safely format numbers
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

  // Query and search states
  const [searchText, setSearchString] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Selected product for pricing drawer
  const [selectedProductCode, setSelectedProductCode] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Form states for manual simulation inputs
  const [laborCost, setLaborCost] = useState<number>(0);
  const [transportCost, setTransportCost] = useState<number>(0);
  const [logisticsCost, setLogisticsCost] = useState<number>(0);
  const [otherCost, setOtherCost] = useState<number>(0);
  const [marginType, setMarginType] = useState<"markup" | "gross">("markup");
  const [marginRate, setMarginRate] = useState<number>(20);

  // Ref for focus
  const firstInputRef = useRef<any>(null);

  // 1. Fetch products list
  const { data: productsResponse, isLoading: isListLoading, refetch: refetchList } = useQuery({
    queryKey: ["products-pricing", currentPage, pageSize, searchText],
    queryFn: () => 
      getApiV1Product({
        query: {
          pageNumber: currentPage,
          pageSize: pageSize,
          CodeOrName: searchText || undefined
        }
      })
  });

  const productsData = ((productsResponse?.data as any)?.data?.data || (productsResponse?.data as any)?.data || []) as any[];
  const totalCount = ((productsResponse?.data as any)?.data?.totalRecords || (productsResponse?.data as any)?.totalRecords || 0) as number;

  // 2. Fetch specific product's pricing base data (containing BOM standard cost)
  const { data: pricingBaseResponse, isFetching: isPricingBaseLoading } = useQuery({
    queryKey: ["product-pricing-base", selectedProductCode],
    queryFn: async () => {
      const res = await client.get<any>({
        url: `/api/v1/ProductCost/pricing-base/${selectedProductCode}`
      });
      return res.data?.data || res.data;
    },
    enabled: !!selectedProductCode && isDrawerOpen
  });

  const pricingBase = pricingBaseResponse;
  const standardMaterialCost = pricingBase?.standardMaterialCost || 0;
  const currentUnitPrice = pricingBase?.currentUnitPrice || 0;

  // Load and save pricing simulation parameters from LocalStorage
  useEffect(() => {
    if (selectedProductCode && isDrawerOpen) {
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
        // Reset to default
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
  }, [selectedProductCode, isDrawerOpen]);

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

        setIsDrawerOpen(false);
        queryClient.invalidateQueries({ queryKey: ["products-pricing"] });
        queryClient.invalidateQueries({ queryKey: ["productDetail", selectedProductCode] });
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

  const handleOpenPricing = (record: any) => {
    setSelectedProductCode(record.code);
    setIsDrawerOpen(true);
  };

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

  // Search form submit
  const handleSearchSubmit = (e: any) => {
    e.preventDefault();
    setCurrentPage(1);
    refetchList();
  };

  const handleClearSearch = () => {
    setSearchString("");
    setCurrentPage(1);
    setTimeout(() => {
      refetchList();
    }, 50);
  };

  // AntD Table Columns
  const columns = [
    {
      title: "成品品號",
      dataIndex: "code",
      key: "code",
      width: 180,
      render: (val: string) => <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{val || "-"}</span>,
    },
    {
      title: "成品名稱",
      dataIndex: "name",
      key: "name",
      ellipsis: true,
      render: (val: string) => <span className="text-slate-700 dark:text-slate-200 font-semibold">{val || "-"}</span>,
    },
    {
      title: "產品分類",
      dataIndex: "productType",
      key: "productType",
      width: 140,
      align: "center" as const,
      render: (val: string) => val ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900">{val}</span> : "-",
    },
    {
      title: "銷售單價 (TWD)",
      dataIndex: "unitPrice",
      key: "unitPrice",
      width: 160,
      align: "right" as const,
      render: (val: any) => (
        <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
          {formatCurrency(val)}
        </span>
      ),
    },
    {
      title: "建立日期",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 160,
      align: "center" as const,
      render: (val: string) => val ? new Date(val).toLocaleDateString("zh-TW") : "-",
    },
    {
      title: "操作",
      key: "action",
      width: 120,
      align: "center" as const,
      render: (_: any, record: any) => (
        <Button 
          type="primary" 
          size="small" 
          icon={<CalculatorOutlined />}
          onClick={() => handleOpenPricing(record)}
          className="bg-blue-600 hover:bg-blue-500 border-none"
        >
          輔助定價
        </Button>
      ),
    }
  ];

  return (
    <div className="p-4 flex flex-col h-full" style={{ minHeight: "calc(100vh - 64px)" }}>
      <PageCard
        title="產品銷售輔助定價管理"
        extra={
          <Button 
            icon={<SyncOutlined />} 
            onClick={() => refetchList()} 
            loading={isListLoading}
            size="small"
          >
            整理
          </Button>
        }
      >
        {/* Search Bar */}
        <div className="mb-4 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
          <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">成品搜尋：</span>
              <Input
                size="small"
                placeholder="品號或品名"
                value={searchText}
                onChange={(e) => setSearchString(e.target.value)}
                style={{ width: 220 }}
                allowClear
                className={isDarkMode ? "bg-slate-800 border-slate-700 text-white" : ""}
              />
            </div>
            <Space size="small">
              <Button 
                type="primary" 
                size="small" 
                icon={<SearchOutlined />} 
                htmlType="submit"
                loading={isListLoading}
                className="bg-blue-600 hover:bg-blue-500 border-none"
              >
                查詢
              </Button>
              <Button 
                size="small" 
                icon={<ClearOutlined />} 
                onClick={handleClearSearch}
              >
                重置
              </Button>
            </Space>
          </form>
        </div>

        {/* Dense Table */}
        <div className="flex-1 overflow-auto bg-white dark:bg-slate-950 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
          <Table
            size="small"
            dataSource={productsData}
            columns={columns}
            rowKey="id"
            loading={isListLoading}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: totalCount,
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50", "100"],
              onChange: (page, size) => {
                setCurrentPage(page);
                setPageSize(size);
              },
              size: "small",
              showTotal: (total) => `共 ${total} 筆資料`
            }}
            scroll={{ y: "calc(100vh - 290px)" }}
            className="high-contrast-table"
          />
        </div>
      </PageCard>

      {/* Helper Pricing Drawer (Edit on the Right, maskClosable=false) */}
      <Drawer
        title={
          <div className="flex items-center space-x-2">
            <DollarOutlined className="text-emerald-500 text-xl" />
            <span className="font-bold text-slate-800 dark:text-slate-100">產品輔助定價試算</span>
          </div>
        }
        placement="right"
        width={560}
        onClose={() => setIsDrawerOpen(false)}
        open={isDrawerOpen}
        maskClosable={false} // Prevents background accidental close
        destroyOnClose
        bodyStyle={{ padding: "16px", overflowY: "auto" }}
        footer={
          <div className="flex justify-between items-center w-full px-2 py-1">
            {/* Save(L) / Cancel(R) Layout */}
            <Button 
              type="primary" 
              icon={<CheckCircleOutlined />}
              onClick={handleSavePrice}
              loading={updatePriceMutation.isPending}
              disabled={isPricingBaseLoading}
              className="bg-emerald-600 hover:bg-emerald-500 border-none px-6"
            >
              儲存
            </Button>
            <Button onClick={() => setIsDrawerOpen(false)} className="px-6">
              取消
            </Button>
          </div>
        }
      >
        <Spin spinning={isPricingBaseLoading} tip="標準 BOM 材料成本重算中...">
          {pricingBase ? (
            <div className="space-y-4 text-left">
              {/* Product Info Card */}
              <Card size="small" className={`shadow-sm ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-slate-50"}`}>
                <DescriptionsTitle title="產品基礎資訊" />
                <Row gutter={[12, 8]} className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  <Col span={24}>
                    <span className="font-semibold text-slate-400">成品品號：</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{pricingBase.productCode}</span>
                  </Col>
                  <Col span={24}>
                    <span className="font-semibold text-slate-400">成品品名：</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{pricingBase.productName}</span>
                  </Col>
                  <Col span={12}>
                    <span className="font-semibold text-slate-400">目前銷售單價：</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{formatCurrency(currentUnitPrice)}</span>
                  </Col>
                  <Col span={12}>
                    <span className="font-semibold text-slate-400">BOM標準材料成本：</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{formatCurrency(standardMaterialCost)}</span>
                  </Col>
                </Row>
              </Card>

              {/* pricing inputs */}
              <Card size="small" title={<span className="font-semibold text-sm">輸入系統未包含之費用參數 (NTD)</span>} className="shadow-sm">
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

              {/* Markup / Method Config */}
              <Card size="small" title={<span className="font-semibold text-sm">定價方法與利潤率參數</span>} className="shadow-sm">
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
                      <span>當前公式：</span>
                    </div>
                    {marginType === "markup" ? (
                      <Paragraph className="mb-0 font-mono">
                        試算單價 = (材料成本 + 人工 + 運輸 + 物流 + 其他) × (1 + 預期加成率%)
                      </Paragraph>
                    ) : (
                      <Paragraph className="mb-0 font-mono">
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

              {/* Dynamic Calculation Output Card */}
              <Card 
                size="small" 
                title={<span className="font-bold text-slate-800 dark:text-slate-100">定價試算模擬結果</span>} 
                className={`shadow border-2 ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-emerald-50/50 border-emerald-200"}`}
              >
                <div className="space-y-2 py-1 text-sm text-slate-700 dark:text-slate-200">
                  <div className="flex justify-between items-center border-b border-dashed border-slate-200 dark:border-slate-800 pb-1.5">
                    <span className="font-semibold text-slate-500">1. 加總總材料成本：</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formatCurrency(standardMaterialCost)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-dashed border-slate-200 dark:border-slate-800 pb-1.5">
                    <span className="font-semibold text-slate-500">2. 自訂費用參數加總：</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formatCurrency(laborCost + transportCost + logisticsCost + otherCost)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-dashed border-slate-200 dark:border-slate-800 pb-1.5">
                    <span className="font-bold text-slate-600 dark:text-slate-300">3. 產品生產總成本：</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{formatCurrency(calculatedResults.totalCost)}</span>
                  </div>
                  
                  <div className="pt-2 flex justify-between items-end">
                    <div>
                      <span className="font-bold text-lg text-slate-800 dark:text-slate-100">💡 建議銷售單價：</span>
                      <div className="text-xs text-slate-400 mt-0.5">（保留四位小數四捨五入）</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-extrabold text-2xl text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(calculatedResults.trialPrice)}
                      </div>
                      
                      {calculatedResults.trialPrice > 0 && currentUnitPrice > 0 && (
                        <div className="text-xs mt-1 font-semibold">
                          <span>與原單價相比：</span>
                          {calculatedResults.priceDiff >= 0 ? (
                            <span className="text-emerald-500">+{formatCurrency(calculatedResults.priceDiff)} (+{calculatedResults.priceDiffPercent.toFixed(2)}%)</span>
                          ) : (
                            <span className="text-red-500">{formatCurrency(calculatedResults.priceDiff)} ({calculatedResults.priceDiffPercent.toFixed(2)}%)</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          ) : (
            <Empty description="無法讀取產品成本資料" />
          )}
        </Spin>
      </Drawer>
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
