import { useState } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Calculator from './components/Calculator';
import CssbuyOrders from './components/CssbuyOrders';
import History from './components/History';
import { useOrders } from './hooks/useOrders';
import { Product } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { orders, lastSync, syncing, error, sync } = useOrders();

  // Track imported products to avoid duplicates in calculator
  const [importedLinks, setImportedLinks] = useState<Set<string>>(new Set());

  const handleImport = (product: Product) => {
    if (importedLinks.has(product.link)) {
      alert('Este producto ya fue importado.');
      return;
    }
    setImportedLinks(prev => new Set(prev).add(product.link));
    setActiveTab('calculator');
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header
        lastSync={lastSync}
        syncing={syncing}
        onSync={sync}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hasBackend={false} // En Vercel no hay backend
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && <Dashboard orders={orders} />}
        {activeTab === 'calculator' && <Calculator orders={orders} />}
        {activeTab === 'orders' && (
          <CssbuyOrders
            orders={orders}
            loading={false}
            error={error}
            onImport={handleImport}
          />
        )}
        {activeTab === 'history' && <History />}
      </main>
    </div>
  );
}
