import { useState, useEffect } from 'react';
import { Layout, Menu, Button, Dropdown, Spin, App, Breadcrumb } from 'antd';
import { 
  SunOutlined, MoonOutlined,
  UserOutlined, 
  LogoutOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  TeamOutlined,
  AppstoreOutlined,
  ToolOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  SettingOutlined,
  ContactsOutlined,
  ExclamationCircleFilled,
  HomeOutlined
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { ROUTES } from '@/constants/routes';
import { useSystemVersion } from '@/hooks/useSystemVersion';

const { Header, Sider, Content } = Layout;

const ICON_MAPPING: Record<string, React.ReactNode> = {
  'BasicData': <DatabaseOutlined />,
  'BasicData.BusinessPartners': <ContactsOutlined />,
  'BasicData.Employees': <TeamOutlined />,
  'Warehouse': <AppstoreOutlined />,
  'ProductionQuality': <ToolOutlined />,
  'Sales': <ShoppingCartOutlined />,
  'Purchase': <ShoppingOutlined />,
  'System': <SettingOutlined />,
};

// 將後端權限 Key 映射到前端路由路徑
const ROUTE_MAPPING: Record<string, string> = {
  'BasicData.Employees': '/basic/employees',
  'BasicData.BusinessPartners': '/basic/business-partners',
  'BasicData.Storages': '/basic/storages',
  'BasicData.Materials': '/basic/materials',
  'BasicData.Products': '/basic/products',
  'BasicData.Molds': '/basic/molds',
  'BasicData.Machines': '/basic/machines',
  'BasicData.BrandModels': '/basic/brand-models',

  'Sales.Orders': '/sales/orders',
  'Sales.Deliveries': '/sales/sales-deliveries',
  'Sales.Statements': '/sales/statements',
  'Sales.Pricing': '/sales/pricing',

  'Purchase.Orders': '/purchase/orders',
  'Purchase.Receipts': '/purchase/receipts',
  'Purchase.IqcInspections': '/purchase/iqc-inspections',

  'System.Users': '/system/users',
  'System.Roles': '/system/roles',
  'System.GeneralTypes': '/system/general-types',
  'System.SystemMaintenance': '/system/maintenance',

  'Warehouse.Inventory': '/warehouse/inventory',
  'Warehouse.InventoryMovements': '/warehouse/inventory-movements',
  'Warehouse.InventoryAdjustments': '/warehouse/inventory-adjustments',

  'ProductionQuality.WorkOrders': '/production-quality/work-orders',
  'ProductionQuality.QcReceipts': '/production-quality/qc-receipts',
  'ProductionQuality.ProductionReceipts': '/production-quality/production-receipts',
};

// 路由權限對照表 (Path -> Required Permission Key)
const ROUTE_PERMISSION_MAP: Record<string, string> = {
  '/basic/brand-models': 'BasicData.BrandModels.View',
  '/basic/employees': 'BasicData.Employees.View',
  '/basic/business-partners': 'BasicData.BusinessPartners.View',
  '/sales/orders': 'Sales.Orders.View',
  '/sales/sales-deliveries': 'Sales.Deliveries.View',
  '/sales/statements': 'Sales.Statements.View',
  '/sales/pricing': 'Sales.Pricing.View',
  '/purchase/orders': 'Purchase.Orders.View',
  '/purchase/receipts': 'Purchase.Receipts.View',
  '/purchase/mold-receipts': 'Purchase.Receipts.View',
  '/purchase/iqc-inspections': 'Purchase.IqcInspections.View',
  '/system/users': 'System.Users.View',
  '/system/roles': 'System.Roles.View',
  '/system/general-types': 'System.GeneralTypes.View',
  '/system/maintenance': 'System.SystemMaintenance.View',
  '/basic/storages': 'BasicData.Storages.View',
  '/warehouse/material-inventory': 'Warehouse.MaterialInventory.View',
  '/warehouse/quick-transfer': 'Warehouse.QuickTransfer.View',
  '/basic/materials': 'BasicData.Materials.View',
  '/basic/products': 'BasicData.Products.View',
  '/warehouse/inventory': 'Warehouse.Inventory.View',
  '/warehouse/inventory-movements': 'Warehouse.InventoryMovements.View',
  '/warehouse/inventory-adjustments': 'Warehouse.InventoryAdjustments.View',
  '/warehouse/customer-material-receipt': 'Warehouse.InventoryMovements.View',
  '/basic/molds': 'BasicData.Molds.View',
  '/basic/machines': 'BasicData.Machines.View',
  '/production-quality/work-orders': 'ProductionQuality.WorkOrders.View',
  '/production-quality/qc-receipts': 'ProductionQuality.QcReceipts.View',
  '/production-quality/production-receipts': 'ProductionQuality.ProductionReceipts.View',
};

export default function MainLayout() {
  const { modal } = App.useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, permissionTree, fetchUserProfile, logout, hasPermission } = useAuthStore();
  const { mode, toggleTheme } = useThemeStore();
  const [loading, setLoading] = useState(true);
  const { frontendVersion, backendVersion } = useSystemVersion();

  const [siderWidth, setSiderWidth] = useState<number>(() => {
    const saved = localStorage.getItem('sider_width');
    return saved ? parseInt(saved, 10) : 250; // 預設 250px 完美自適應左邊文字寬度，不再被截斷
  });

  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      // 限制寬度在 180px 到 450px 之間
      const newWidth = Math.max(180, Math.min(450, moveEvent.clientX));
      setSiderWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  useEffect(() => {
    localStorage.setItem('sider_width', String(siderWidth));
  }, [siderWidth]);

  useEffect(() => {
    const initProfile = async () => {
      if (!user || !permissionTree) {
        setLoading(true);
        await fetchUserProfile();
      }
      setLoading(false);
    };
    initProfile();
  }, [user, permissionTree, fetchUserProfile]);

  // 全域快捷鍵 (Command Palette / Search)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        console.log('Open Global Search Palette');
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  // 路由權限守衛
  const checkRoutePermission = () => {
    if (loading) return true; // 等待載入完成
    if (location.pathname === ROUTES.HOME) return true; // Dashboard 皆可存取
    
    const matchedEntry = Object.entries(ROUTE_PERMISSION_MAP).find(([path]) => 
      location.pathname.startsWith(path)
    );
    
    if (matchedEntry) {
      const [, requiredPerm] = matchedEntry;
      return hasPermission(requiredPerm);
    }
    
    return true; // 預設放行尚未被管理的路由，或可改為 false 嚴格模式
  };

// 根據當前路由自動展開對應的主選單
  useEffect(() => {
    if (collapsed) return; // 避免在縮合狀態下設定 openKeys，導致浮動選單跳出
    
    const matchedEntry = Object.entries(ROUTE_MAPPING).find(([, path]) => location.pathname.startsWith(path));
    if (matchedEntry) {
      const [key] = matchedEntry;
      const parentKey = key.split('.')[0];
      if (!openKeys.includes(parentKey)) {
        setOpenKeys([parentKey]);
      }
    }
  }, [location.pathname, permissionTree, collapsed]);

  const onOpenChange = (keys: string[]) => {
    const latestOpenKey = keys.find((key) => openKeys.indexOf(key) === -1);
    
    // 找出所有有子選單的 root level keys
    const menuItems = generateMenuItems();
    const rootSubmenuKeys = menuItems.filter((item: any) => item && item.children).map((item: any) => item.key);
    
    if (latestOpenKey && rootSubmenuKeys.includes(latestOpenKey)) {
      setOpenKeys([latestOpenKey]);
    } else {
      setOpenKeys(keys);
    }
  };

  // 動態產出 Ant Design Menu Items
  const generateMenuItems = () => {
    // 預設一定要有儀表板
    const items: any[] = [
      {
        key: ROUTES.HOME,
        icon: <DashboardOutlined />,
        label: '儀表板',
      }
    ];

    if (!permissionTree) return items;

    // 將後端樹狀結構轉換為 AntD Menu 格式
    const mapNodes = (nodes: any[]): any[] => {
      return nodes
        .filter(node => node.active) // 僅顯示有權限的模組
        .filter(node => {
          // ERP 導覽層級固定為 2 層 (Level 1: 模組 0個點, Level 2: 頁面 1個點)
          // 權限 Key 中有 2 個點以上的 (如 BasicData.Employees.View) 是動作權限，不應出現在選單
          const dotCount = (node.key.match(/\./g) || []).length;
          return dotCount < 2;
        })
        .map(node => {
          const dotCount = (node.key.match(/\./g) || []).length;
          
          if (dotCount === 0) {
            // Level 1: 模組 (資料夾)
            const children = node.children ? mapNodes(node.children) : [];
            
            if (node.key === 'Warehouse' && hasPermission('Warehouse.Inventory.View')) {
              if (!children.some(c => c.key === '/warehouse/material-inventory')) {
                children.unshift({
                  key: '/warehouse/material-inventory',
                  label: '原料庫存與卷卡號追溯',
                });
              }
              if (!children.some(c => c.key === '/warehouse/quick-transfer')) {
                const idx = children.findIndex(c => c.key === '/warehouse/material-inventory');
                if (idx !== -1) {
                  children.splice(idx + 1, 0, {
                    key: '/warehouse/quick-transfer',
                    label: '原料快速轉倉',
                  });
                } else {
                  children.unshift({
                    key: '/warehouse/quick-transfer',
                    label: '原料快速轉倉',
                  });
                }
              }
              if (!children.some(c => c.key === '/warehouse/customer-material-receipt')) {
                const idx = children.findIndex(c => c.key === '/warehouse/quick-transfer');
                if (idx !== -1) {
                  children.splice(idx + 1, 0, {
                    key: '/warehouse/customer-material-receipt',
                    label: '客供料入庫單',
                  });
                } else {
                  children.unshift({
                    key: '/warehouse/customer-material-receipt',
                    label: '客供料入庫單',
                  });
                }
              }
            }
            // 如果該模組下沒有任何有權限的子頁面，就不顯示該模組
            if (children.length === 0) return null;
            return {
               key: node.key,
               icon: ICON_MAPPING[node.key],
               label: node.title,
               children: children
            };
          } else {
            // Level 2: 頁面 (葉節點)
            if (node.key === 'Purchase.Receipts') {
              return [
                {
                   key: '/purchase/receipts',
                   label: '原料進貨單',
                },
                {
                   key: '/purchase/mold-receipts',
                   label: '模具進貨單',
                }
              ];
            }
            const routePath = ROUTE_MAPPING[node.key] || node.key;
            return {
               key: routePath,
               icon: ICON_MAPPING[node.key],
               label: node.title,
            };
          }
        })
        .filter(Boolean)
        .flat(); // 支援一個節點拆分成多個選單（例如原料/模具進貨單）
    };

    items.push(...mapNodes(permissionTree));
    return items;
  };

  // 尋找樹狀結構中的節點名稱
  const findNodeTitle = (nodes: any[], targetKey: string): string | null => {
    for (const node of nodes) {
      if (node.key === targetKey) return node.title;
      if (node.children) {
        const title = findNodeTitle(node.children, targetKey);
        if (title) return title;
      }
    }
    return null;
  };

  // 產生 Breadcrumb 資料
  const generateBreadcrumbItems = () => {
    const appTitle = import.meta.env.VITE_APP_TITLE || 'ERP 系統';

    const items: any[] = [
      {
        title: <span className="cursor-pointer" onClick={() => navigate(ROUTES.HOME)}><HomeOutlined /></span>,
      }
    ];

    if (location.pathname === ROUTES.HOME) {
      document.title = appTitle; // 首頁直接顯示專案名稱
      return items;
    }

    // 反查當前路徑對應的 Permission Key
    const matchedEntry = Object.entries(ROUTE_MAPPING).find(([, path]) => location.pathname.startsWith(path));
    
    let pageTitle = '';
    
    if (matchedEntry && permissionTree) {
      const [key] = matchedEntry; // e.g. "BasicData.BusinessPartners"
      const keys = key.split('.'); // ["BasicData", "BusinessPartners"]
      
      let currentPath = '';
      keys.forEach((k) => {
        currentPath = currentPath ? `${currentPath}.${k}` : k;
        const title = findNodeTitle(permissionTree, currentPath);
        if (title) {
          items.push({ title });
          pageTitle = title; // 抓取最後一個節點的名稱當作頁面名稱
        }
      });
    }

    // 更新網頁標題: VITE_APP_TITLE - 模組名稱
    if (pageTitle) {
      document.title = `${appTitle} - ${pageTitle}`;
    }

    return items;
  };

  const userMenu = {
    items: [
      {
        key: 'profile',
        icon: <UserOutlined />,
        label: '個人資訊',
        onClick: () => navigate(ROUTES.PROFILE)
      },
      {
        type: 'divider' as const
      },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '登出系統',
        danger: true,
        onClick: () => {
          modal.confirm({
            title: '確認登出',
            icon: <ExclamationCircleFilled />,
            content: '您確定要登出目前帳號嗎？',
            okText: '登出',
            okType: 'danger',
            cancelText: '取消',
            centered: true,
            onOk() {
              logout();
              navigate(ROUTES.LOGIN);
            },
          });
        }
      }
    ]
  };

  if (loading) {
    return (
      <div className={`h-screen w-screen flex items-center justify-center ${mode === 'dark' ? 'bg-[#141414]' : 'bg-[#f5f5f5]'}`}>
        <Spin size="large" description="載入使用者設定中..." />
      </div>
    );
  }

  return (
    <Layout className="h-screen w-screen overflow-hidden">
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        theme={mode}
        className={`border-r relative ${mode === 'dark' ? 'border-[#303030]' : 'border-gray-200'}`}
        width={collapsed ? 80 : siderWidth}
        style={isResizing ? { transition: 'none' } : undefined}
      >
        <div className="flex flex-col h-full">
          <div 
            className={`h-16 flex items-center justify-center border-b ${mode === 'dark' ? 'border-[#303030]' : 'border-gray-200'} overflow-hidden px-4 flex-shrink-0 cursor-pointer transition-opacity hover:opacity-80`}
            onClick={() => setCollapsed(!collapsed)}
            title="切換選單"
          >
            {collapsed ? (
              <img src={mode === 'dark' ? (import.meta.env.VITE_LOGO_DARK || '/assets/tungfu-logo-dark.svg') : (import.meta.env.VITE_LOGO_LIGHT || '/assets/tungfu-logo-light.svg')} alt="Logo" className="w-8 h-8 object-cover object-left" />
            ) : (
              <img src={mode === 'dark' ? (import.meta.env.VITE_LOGO_DARK || '/assets/tungfu-logo-dark.svg') : (import.meta.env.VITE_LOGO_LIGHT || '/assets/tungfu-logo-light.svg')} alt="Logo" className="h-8 w-auto" />
            )}
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <Menu
              theme={mode}
              mode="inline"
              selectedKeys={[location.pathname]}
              openKeys={openKeys}
              onOpenChange={onOpenChange}
              onClick={handleMenuClick}
              items={generateMenuItems()}
              style={{ borderRight: 0 }}
            />
          </div>
          <div className={`p-4 text-center text-xs flex-shrink-0 transition-opacity duration-300 ${collapsed ? 'opacity-0 pointer-events-none h-0 p-0 overflow-hidden' : 'opacity-100'} ${mode === 'dark' ? 'text-gray-500 border-t border-[#303030] bg-[#141414]' : 'text-gray-400 border-t border-gray-200 bg-[#ffffff]'}`}>
            <div className="flex flex-col space-y-1">
              <div>前端: <span className="font-mono">{frontendVersion}</span></div>
              <div>後端: <span className="font-mono">{backendVersion}</span></div>
            </div>
          </div>
        </div>
        {/* 調整寬度把手 */}
        {!collapsed && (
          <div
            onMouseDown={handleMouseDown}
            className={`absolute top-0 right-0 w-[4px] h-full cursor-col-resize hover:bg-blue-500/50 active:bg-blue-600 transition-colors z-50`}
            title="拖曳以調整寬度"
          />
        )}
      </Sider>
      <Layout className={`flex-1 ${mode === 'dark' ? 'bg-[#141414]' : 'bg-[#f5f5f5]'}`}>
        <Header 
          className={`px-4 ${mode === 'dark' ? 'border-[#303030]' : 'border-gray-200'} border-b flex justify-between items-center h-16 leading-[64px]`}
          style={{ background: mode === 'dark' ? '#141414' : '#ffffff' }}
        >
          <div className="flex items-center gap-4">
            <Breadcrumb items={generateBreadcrumbItems()} className={`${mode === 'dark' ? 'text-gray-300' : ''}`} />
          </div>
          <div className="flex items-center gap-2">
            {import.meta.env.DEV && (
              <span className="text-orange-500 font-bold text-xs bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded border border-orange-200 dark:border-orange-800">
                Dev: {import.meta.env.VITE_DEV_API_TARGET?.replace(/^https?:\/\//, '') || '未知'}
              </span>
            )}
            <Button 
              type="text" 
              icon={mode === 'dark' ? <SunOutlined /> : <MoonOutlined />} 
              onClick={toggleTheme}
              className={`${mode === 'dark' ? 'text-white hover:text-yellow-400' : 'text-gray-800 hover:text-blue-500'}`}
            />
            <Dropdown menu={userMenu} placement="bottomRight" arrow>
              <Button type="text" className={`${mode === 'dark' ? 'text-white' : 'text-gray-800'} flex items-center`}>
                <UserOutlined className="mr-2" /> {user?.name || 'User'}
              </Button>
            </Dropdown>
          </div>
        </Header>
        <Content className="overflow-hidden flex flex-col relative">
          {checkRoutePermission() ? (
            <Outlet />
          ) : (
            <div className={`h-full w-full flex items-center justify-center ${mode === 'dark' ? 'bg-[#141414]' : 'bg-[#f5f5f5]'}`}>
              <div className="text-center">
                <h1 className="text-6xl font-bold text-gray-700 mb-4">403</h1>
                <p className="text-gray-400 text-lg mb-8">抱歉，您沒有權限訪問此頁面。</p>
                <Button type="primary" onClick={() => navigate(ROUTES.HOME)}>
                  回首頁
                </Button>
              </div>
            </div>
          )}
        </Content>
      </Layout>
    </Layout>
  );
}
