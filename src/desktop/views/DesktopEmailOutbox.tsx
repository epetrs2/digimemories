import React from 'react';
import AdminEmailManager from '../../components/AdminEmailManager';
import { getOrders } from '../../lib/store';

export const DesktopEmailOutbox: React.FC = () => {
  const orders = getOrders();

  return (
    <div style={{ flex: 1, padding: '2rem', overflowY: 'auto', background: 'rgba(12, 10, 9, 0.6)' }}>
      <AdminEmailManager orders={orders} />
    </div>
  );
};

export default DesktopEmailOutbox;
