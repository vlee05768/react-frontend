import { useState, useEffect } from 'react';
import { Layout, Menu, Button, Dropdown } from 'antd';
import { 
  MenuUnfoldOutlined, 
  MenuFoldOutlined, 
  UserOutlined, 
  LogoutOutlined,
  TeamOutlined,
  DashboardOutlined
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { ROUTES } from '@/constants/routes';

const { Header, Sider, Content } = Layout;

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore(state => state.logout);

  // 全域快捷鍵 (Command Palette / Search)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Cmd+K 或是 Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        console.log('Open Global Search Palette');
        // TODO: 觸發全域搜尋 Dialog
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
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
          items={[
            {
              key: ROUTES.HOME,
              icon: <DashboardOutlined />,
              label: '儀表板',
            },
            {
              key: '/employee',
              icon: <TeamOutlined />,
              label: '員工基本檔',
            }
          ]}
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
                <UserOutlined className="mr-2" /> Admin
              </Button>
            </Dropdown>
          </div>
        </Header>
        <Content className="overflow-hidden flex flex-col relative">
          {/* Outlet 負責渲染內部路由元件 */}
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
