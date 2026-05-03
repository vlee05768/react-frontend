import { useState, useEffect } from 'react';
import { Layout, Menu, Button, Dropdown, Spin } from 'antd';
import { 
  MenuUnfoldOutlined, 
  MenuFoldOutlined, 
  UserOutlined, 
  LogoutOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  TeamOutlined,
  AppstoreOutlined,
  ToolOutlined,
  ShoppingCartOutlined,
  SettingOutlined,
  ContactsOutlined
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { ROUTES } from '@/constants/routes';

const { Header, Sider, Content } = Layout;

const ICON_MAPPING: Record<string, React.ReactNode> = {
  'BasicData': <DatabaseOutlined />,
  'BasicData.BusinessPartners': <ContactsOutlined />,
  'BasicData.Employees': <TeamOutlined />,
  'Warehouse': <AppstoreOutlined />,
  'ProductionQuality': <ToolOutlined />,
  'Sales': <ShoppingCartOutlined />,
  'System': <SettingOutlined />,
};

// 將後端權限 Key 映射到前端路由路徑
const ROUTE_MAPPING: Record<string, string> = {
  'BasicData.Employees': '/employee',
  'System.Users': '/system/users',
  'System.Roles': '/system/roles',
  'Warehouse.Storages': '/warehouse/storages',
  'ProductionQuality.Molds': '/production-quality/molds',
  'ProductionQuality.Machines': '/production-quality/machines',
};

// 路由權限對照表 (Path -> Required Permission Key)
const ROUTE_PERMISSION_MAP: Record<string, string> = {
  '/employee': 'BasicData.Employees.View',
  '/system/users': 'System.Users.View',
  '/system/roles': 'System.Roles.View',
  '/warehouse/storages': 'Warehouse.Storages.View',
  '/production-quality/molds': 'ProductionQuality.Molds.View',
  '/production-quality/machines': 'ProductionQuality.Machines.View',
};

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, permissionTree, fetchUserProfile, logout, hasPermission } = useAuthStore();
  const [loading, setLoading] = useState(true);

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
    const matchedEntry = Object.entries(ROUTE_MAPPING).find(([, path]) => location.pathname.startsWith(path));
    if (matchedEntry) {
      const [key] = matchedEntry;
      const parentKey = key.split('.')[0];
      if (!openKeys.includes(parentKey)) {
        setOpenKeys([parentKey]);
      }
    }
  }, [location.pathname, permissionTree]);

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
            const routePath = ROUTE_MAPPING[node.key] || node.key;
            return {
               key: routePath,
               icon: ICON_MAPPING[node.key],
               label: node.title,
            };
          }
        })
        .filter(Boolean); // 過濾掉為 null 的模組
    };

    items.push(...mapNodes(permissionTree));
    return items;
  };

  const userMenu = {
    items: [
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '登出系統',
        danger: true,
        onClick: () => {
          logout();
          navigate(ROUTES.LOGIN);
        }
      }
    ]
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#141414]">
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
        theme="dark"
        className="border-r border-[#303030]"
        width={220}
      >
        <div className="h-16 flex items-center justify-center border-b border-[#303030]">
          <h1 className={`text-white font-bold transition-all ${collapsed ? 'text-sm' : 'text-xl'}`}>
            ERP {collapsed ? '' : 'System'}
          </h1>
        </div>
                <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          openKeys={openKeys}
          onOpenChange={onOpenChange}
          onClick={handleMenuClick}
          items={generateMenuItems()}
        />
      </Sider>
      <Layout className="bg-[#141414]">
        <Header className="px-4 bg-[#141414] border-b border-[#303030] flex justify-between items-center h-16 leading-[64px]">
          <div className="flex items-center">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="text-white hover:text-gray-300"
            />
            <span className="ml-4 text-gray-400 text-sm hidden md:inline-block">
              (提示: 使用 <kbd className="bg-[#2a2a2a] px-1 rounded">Ctrl+K</kbd> 開啟全域搜尋)
            </span>
          </div>
          <div>
            <Dropdown menu={userMenu} placement="bottomRight" arrow>
              <Button type="text" className="text-white flex items-center">
                <UserOutlined className="mr-2" /> {user?.name || 'User'}
              </Button>
            </Dropdown>
          </div>
        </Header>
        <Content className="overflow-hidden flex flex-col relative">
          {checkRoutePermission() ? (
            <Outlet />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-[#141414]">
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
