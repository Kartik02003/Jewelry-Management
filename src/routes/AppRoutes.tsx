import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Home } from '../pages/Home';

// Clients
import { ClientsPage } from '../pages/clients/ClientsPage';
import { AddEditClientPage } from '../pages/clients/AddEditClientPage';
import { ClientDetailPage } from '../pages/clients/ClientDetailPage';

// Jewelry
import { AddEditJewelryPage } from '../pages/jewelry/AddEditJewelryPage';
import { JewelryDetailPage } from '../pages/jewelry/JewelryDetailPage';

// Craftsmen
import { CraftsmenPage } from '../pages/craftsmen/CraftsmenPage';
import { AddEditCraftsmanPage } from '../pages/craftsmen/AddEditCraftsmanPage';
import { CraftsmanDetailPage } from '../pages/craftsmen/CraftsmanDetailPage';

// Transactions
import { AddEditTransactionPage } from '../pages/transactions/AddEditTransactionPage';
import { TransactionDetailPage } from '../pages/transactions/TransactionDetailPage';


export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Home />} />

        {/* Clients */}
        <Route path="clients" element={<ClientsPage />} />
        <Route path="clients/new" element={<AddEditClientPage />} />
        <Route path="clients/:clientId" element={<ClientDetailPage />} />
        <Route path="clients/:clientId/edit" element={<AddEditClientPage />} />
        <Route path="clients/:clientId/jewelry/new" element={<AddEditJewelryPage />} />

        {/* Jewelry */}
        <Route path="jewelry/:jewelryId" element={<JewelryDetailPage />} />
        <Route path="jewelry/:jewelryId/edit" element={<AddEditJewelryPage />} />

        {/* Craftsmen */}
        <Route path="craftsmen" element={<CraftsmenPage />} />
        <Route path="craftsmen/new" element={<AddEditCraftsmanPage />} />
        <Route path="craftsmen/:craftsmanId" element={<CraftsmanDetailPage />} />
        <Route path="craftsmen/:craftsmanId/edit" element={<AddEditCraftsmanPage />} />
        <Route path="craftsmen/:craftsmanId/transactions/new" element={<AddEditTransactionPage />} />

        {/* Transactions */}
        <Route path="craftsman-transactions/:transactionId" element={<TransactionDetailPage />} />
        <Route path="craftsman-transactions/:transactionId/edit" element={<AddEditTransactionPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};
