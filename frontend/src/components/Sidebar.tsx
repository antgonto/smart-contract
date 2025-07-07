import * as React from 'react';
import {
  EuiSideNav,
  EuiIcon,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiGlobalToastList,
  EuiGlobalToastListToast,
} from '@elastic/eui';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Login } from './Login';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, logout, roles: contextRoles } = useAuth();
  // Memoize roles to avoid unnecessary re-renders and fix react-hooks/exhaustive-deps warning
  const roles = React.useMemo(() => contextRoles || [], [contextRoles]);
  const [isLoginModalOpen, setIsLoginModalOpen] = React.useState(false);
  const [loginType, setLoginType] = React.useState<'admin' | 'user'>('user');
  const [toasts, setToasts] = React.useState<EuiGlobalToastListToast[]>([]);

  const allNavItems = [
    {
      id: '1',
      name: 'Settings',
      onClick: () => navigate('/settings'),
      isSelected: location.pathname === '/settings',
      icon: <EuiIcon type="gear" />,
      isAdmin: true, // This marks the item as admin-only
    },
    {
      id: '2',
      name: 'Telemetry Dashboard',
      onClick: () => navigate('/metrics'),
      isSelected: location.pathname === '/metrics',
      icon: <EuiIcon type="dashboardApp" />,
      isAdmin: true, // This marks the item as admin-only
    },
    {
      id: 'issuer-dashboard',
      name: 'Issuer Dashboard',
      onClick: () => navigate('/issuer-dashboard'),
      isSelected: location.pathname === '/issuer-dashboard',
      icon: <EuiIcon type="user" />,
    },
    {
      id: '3',
      name: 'Register Certificate',
      onClick: () => navigate('/register-certificate'),
      isSelected: location.pathname === '/register-certificate',
      icon: <EuiIcon type="document" />,
    },
    {
      id: '4',
      name: 'My Certificates',
      onClick: () => navigate('/certificates'),
      isSelected: location.pathname === '/certificates',
      icon: <EuiIcon type="indexOpen" />,
    },
    {
      id: '5',
      name: 'Transactions',
      onClick: () => navigate('/wallet'),
      isSelected: location.pathname === '/wallet',
      icon: <EuiIcon type="currency" />,
    },
    {
      id: 'all-accounts',
      name: 'Accounts',
      onClick: () => navigate('/all-accounts'),
      isSelected: location.pathname === '/all-accounts',
      icon: <EuiIcon type="tableDensityNormal" />,
      isAdmin: true, // Only show for admin
    },
    {
      id: 'create-wallet',
      name: 'Create Wallet',
      onClick: () => navigate('/create-wallet'),
      isSelected: location.pathname === '/create-wallet',
      icon: <EuiIcon type="plusInCircle" />,
      isAdmin: true, // Only show for admin
    },
  ];

  const publicNavItems = [
    {
      id: 'verify-certificate',
      name: 'Verify Certificate',
      onClick: () => navigate('/verify-certificate'),
      isSelected: location.pathname === '/verify-certificate',
      icon: <EuiIcon type="checkInCircleFilled" />,
      isAdmin: true, // Only show for admin
    },
  ];

  // Add My Diplomas for students only
  if (roles.includes('Student')) {
    allNavItems.push({
      id: 'my-diplomas',
      name: 'My Diplomas',
      onClick: () => navigate('/my-diplomas'),
      isSelected: location.pathname === '/my-diplomas',
      icon: <EuiIcon type="graduationCap" />,
    });
  }

  // Add Admin Dashboard for Admins only
  if (roles.includes('Admin')) {
    allNavItems.push({
      id: 'admin-dashboard',
      name: 'Admin Dashboard',
      onClick: () => navigate('/admin-dashboard'),
      isSelected: location.pathname === '/admin-dashboard',
      icon: <EuiIcon type="user" />,
    });
  }

  // Add unified login option before Verify Certificate if not authenticated
  if (!isAuthenticated) {
    const loginNavItem = {
      id: 'unified-login',
      name: 'Login',
      onClick: () => {
        setLoginType('user');
        setIsLoginModalOpen(true);
      },
      icon: <EuiIcon type="user" />,
      isSelected: false,
      isAdmin: false,
    };
    // Find the index of Verify Certificate
    const verifyIndex = publicNavItems.findIndex(item => item.id === 'verify-certificate');
    if (verifyIndex !== -1) {
      publicNavItems.splice(verifyIndex, 0, loginNavItem);
    } else {
      publicNavItems.unshift(loginNavItem);
    }
  }

  // Add logout nav item for authenticated users
  const logoutNavItem = {
    id: 'logout',
    name: 'Logout',
    icon: <EuiIcon type="exit" />,
    onClick: () => {
      logout();
      navigate('/');
    },
    isSelected: false,
  };


  // Show role label at the very top of the sidebar
  const roleLabel = isAuthenticated && roles.length > 0
    ? (roles.includes('admin') ? 'Admin' : roles.includes('Issuer') ? 'Issuer' : 'Student')
    : '';

  const visibleItems = isAuthenticated
    ? allNavItems.filter(item => {
        const userIsAdmin = roles.includes('admin');
        if (userIsAdmin) {
          return item.isAdmin === true;
        }
        // Hide admin-only items for non-admin users
        return !item.isAdmin;
      })
    : [];

  // Add logout item for authenticated users
  const navItemsWithLogout = isAuthenticated ? [...visibleItems, logoutNavItem] : [];

  // Remove isAdmin and isIssuer before passing to EuiSideNav
  function cleanNavItems(items: any[]) {
    return items.map(({ isAdmin, isIssuer, ...rest }) => rest);
  }

  const sideNavItems = [
    {
      name: 'Blockchain Platform',
      id: 0,
      items: isAuthenticated
        ? cleanNavItems(navItemsWithLogout)
        : cleanNavItems(publicNavItems),
    }
  ];

  React.useEffect(() => {
    if (isAuthenticated && roles && roles.length > 0) {
      const roleLabel = roles.includes('admin')
        ? 'Admin'
        : roles.includes('Issuer')
        ? 'Issuer'
        : 'Student';
      setToasts([
        {
          id: 'user-role-toast',
          title: `Logged in as: ${roleLabel}`,
          color: 'success',
          iconType: 'user',
        },
      ]);
    }
  }, [isAuthenticated, roles]);

  return (
    <>
      <EuiGlobalToastList
        toasts={toasts}
        dismissToast={() => setToasts([])}
        toastLifeTimeMs={4000}
      />
      <div style={{ width: '200px', height: '100%', background: '#1a1c21', padding: '16px' }}>
        {/* Role label at the top */}
        {isAuthenticated && roleLabel && (
          <EuiText size="s" style={{ marginBottom: 16, textAlign: 'center', fontWeight: 'bold', color: '#FFD700' }}>
            {roleLabel}
          </EuiText>
        )}
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiIcon type="securityApp" size="xl" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText>
              <h2 style={{ margin: 0 }}>Smart Contracts</h2>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="l" />
        {isAuthenticated}
        <EuiSideNav items={sideNavItems} />

        <Login isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} loginType={loginType} />
      </div>
    </>
  );
};

export default Sidebar;