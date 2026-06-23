"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Dashboard from "@/components/Dashboard";
import Calculator from "@/components/Calculator";
import CssbuyOrders from "@/components/CssbuyOrders";
import History from "@/components/History";
import SyncDialog from "@/components/SyncDialog";
import { useOrders } from "@/lib/useOrders";
import { Product, CssbuyOrder } from "@/lib/types";

interface HomeClientProps {
  initialOrders: CssbuyOrder[];
  initialLastSync: string | null;
}

export default function HomeClient({ initialOrders, initialLastSync }: HomeClientProps) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const { orders, lastSync, syncing, error, importFromJson, importFromFile } = useOrders(initialOrders, initialLastSync);

  const [importedLinks, setImportedLinks] = useState<Set<string>>(new Set());
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);

  const handleImport = (product: Product) => {
    if (importedLinks.has(product.link)) {
      alert("Este producto ya fue importado.");
      return;
    }
    setImportedLinks((prev) => new Set(prev).add(product.link));
    setPendingProduct(product);
    setActiveTab("calculator");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header
        lastSync={lastSync}
        syncing={syncing}
        onSync={() => setSyncDialogOpen(true)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "dashboard" && <Dashboard orders={orders} />}
        {activeTab === "calculator" && <Calculator orders={orders} pendingProduct={pendingProduct} onConsumed={() => setPendingProduct(null)} />}
        {activeTab === "orders" && (
          <CssbuyOrders orders={orders} loading={false} error={error} onImport={handleImport} />
        )}
        {activeTab === "history" && <History />}
      </main>

      <SyncDialog
        open={syncDialogOpen}
        onClose={() => setSyncDialogOpen(false)}
        onImportJson={importFromJson}
        onImportFile={importFromFile}
        syncing={syncing}
      />
    </div>
  );
}
