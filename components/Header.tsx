"use client";

import { RefreshCw, Package, TrendingUp, Calculator, Clock } from "lucide-react";

interface HeaderProps {
  lastSync: string | null;
  syncing: boolean;
  onSync: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: TrendingUp },
  { id: "calculator", label: "Calculadora", icon: Calculator },
  { id: "orders", label: "Pedidos CSSBuy", icon: Package },
  { id: "history", label: "Historial", icon: Clock },
];

export default function Header({ lastSync, syncing, onSync, activeTab, onTabChange }: HeaderProps) {
  return (
    <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Calculator className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">CSSBuy Calculator</h1>
              <p className="text-xs text-muted-foreground">Next.js Edition</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => onTabChange(t.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === t.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            {lastSync && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Sync: {new Date(lastSync).toLocaleString("es-AR")}
              </span>
            )}
            <button
              onClick={onSync}
              disabled={syncing}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Sync..." : "Sync"}
            </button>
          </div>
        </div>

        {/* Mobile tabs */}
        <div className="flex md:hidden items-center gap-1 pb-2 overflow-x-auto">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => onTabChange(t.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === t.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
