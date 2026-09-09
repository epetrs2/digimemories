import React from 'react';
import AdminBusinessSettings from '../../components/AdminBusinessSettings';

export const DesktopBusinessSettings: React.FC = () => {
  return (
    <div style={{ flex: 1, padding: '2rem', overflowY: 'auto', background: 'rgba(12, 10, 9, 0.6)' }}>
      <AdminBusinessSettings />
    </div>
  );
};

export default DesktopBusinessSettings;
