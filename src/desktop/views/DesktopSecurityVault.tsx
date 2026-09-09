import React from 'react';
import AdminSecurityCenter from '../../components/AdminSecurityCenter';

export const DesktopSecurityVault: React.FC = () => {
  return (
    <div style={{ flex: 1, padding: '2rem', overflowY: 'auto', background: 'rgba(12, 10, 9, 0.6)' }}>
      <AdminSecurityCenter />
    </div>
  );
};

export default DesktopSecurityVault;
