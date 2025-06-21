import * as React from 'react';
import {
  EuiSideNav,
  EuiIcon,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText
} from '@elastic/eui';
import { useNavigate, useLocation } from 'react-router-dom';


const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isConfirmModalVisible, setIsConfirmModalVisible] = React.useState(false);
  const showConfirmModal = () => setIsConfirmModalVisible(true);
  const closeConfirmModal = () => setIsConfirmModalVisible(false);

  const sideNavItems = [
    {
      name: 'Security Platform',
      id: 0,
      items: [
        {
          id: '1',
          name: 'Certificates Dashboard',
          onClick: () => navigate('/'),
          isSelected: location.pathname === '/',
          icon: <EuiIcon type="dashboardApp" />
        },
        {
          id: '2',
          name: 'Settings',
          onClick: () => navigate('/settings'),
          isSelected: location.pathname === '/settings',
          icon: <EuiIcon type="gear" />,
        }
      ]
    }
  ];

  return (
    <div style={{ width: '200px', height: '100%', background: '#1a1c21', padding: '16px' }}>
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
      <EuiSideNav items={sideNavItems} />

      {isConfirmModalVisible && (
        <div className="confirm-modal" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            padding: '20px',
            borderRadius: '4px',
            maxWidth: '400px'
          }}>
            <p>Are you sure you want to drop the cyber_db database? This action cannot be undone.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                style={{ marginRight: '10px', padding: '5px 10px' }}
                onClick={closeConfirmModal}
              >
                Cancel
              </button>
              <button
                style={{ padding: '5px 10px' }}
                onClick={showConfirmModal}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;