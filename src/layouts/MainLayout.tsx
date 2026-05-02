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
};

// 路由權限對照表 (Path -> Required Permission Key)
const ROUTE_PERMISSION_MAP: Record<string, string> = {
  '/employee': 'BasicData.Employees.View',
};

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
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
        .map(node => {
          // 如果沒有定義特定的路由映射，就不把它當作可點擊的葉節點 (維持 null)
          // 若有子節點，則遞迴解析
          const routePath = ROUTE_MAPPING[node.key];
          
          // 若它有子節點，且子節點中包含 View, Create 等「動作權限」，則該節點視為一個實際的「頁面」
          // (例如: BasicData.Employees 底下是 BasicData.Employees.View)
          // 這裡我們簡單判斷：如果底下只有動作權限 (沒有以該節點 key 為 prefix 的深層選單)，就視為葉節點
          const hasPageChildren = node.children?.some((child: any) => 
             // 如果子節點也有它的子節點，那它就不是動作權限而是目錄
             child.children && child.children.length > 0
          );

          if (node.children && node.children.length > 0 && hasPageChildren) {
             return {
                key: node.key,
                icon: ICON_MAPPING[node.key],
                label: node.title,
                children: mapNodes(node.children)
             };
          } else {
             // 葉節點：這是一個模組頁面
             return {
                key: routePath || node.key, // 如果尚未實作對應頁面，仍可顯示(但點擊可能無效或404)
                icon: ICON_MAPPING[node.key],
                label: node.title,
             };
          }
        });
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
        <Spin size="large" tip="載入使用者設定中..." />
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
