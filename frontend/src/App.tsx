import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HomeDashboard } from './views/HomeDashboard';
import { ScanView } from './views/ScanView';
import { ScanResultsView } from './views/ScanResultsView';
import { NutritionCalcView } from './views/NutritionCalcView';
import { ComparisonView } from './views/ComparisonView';
import { IngredientExplorerView } from './views/IngredientExplorerView';
import { FoodLogView } from './views/FoodLogView';
import { RemindersView } from './views/RemindersView';
import { SavedProductsView } from './views/SavedProductsView';
import { SettingsView } from './views/SettingsView';
import { Product, AnalyzeLabelResponse } from './types';
import { api } from './services/api';
import { LanguageProvider } from './i18n';

export const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<string>('home');
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeLabelResponse | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);

  useEffect(() => {
    // Check backend health
    api.checkHealth()
      .then((res) => {
        if (res.status === 'healthy') {
          setIsBackendConnected(true);
        }
      })
      .catch(() => {
        setIsBackendConnected(false);
      });
  }, []);

  const handleNavigate = (view: string, params?: any) => {
    if (params?.product) {
      setActiveProduct(params.product);
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAnalysisComplete = (result: AnalyzeLabelResponse) => {
    setAnalysisResult(result);
    setActiveProduct(result.product);
    setCurrentView('results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app-container">
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        isBackendConnected={isBackendConnected}
      />

      <main className="main-content">
        {currentView === 'home' && (
          <HomeDashboard
            onNavigate={handleNavigate}
            onSelectProduct={(p) => setActiveProduct(p)}
          />
        )}

        {currentView === 'scan' && (
          <ScanView
            onAnalysisComplete={handleAnalysisComplete}
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'results' && (
          <ScanResultsView
            data={analysisResult || (activeProduct ? { product: activeProduct } : (null as any))}
            onNavigate={handleNavigate}
            onProductSaved={(p) => setActiveProduct(p)}
          />
        )}

        {currentView === 'calculator' && (
          <NutritionCalcView
            initialProduct={activeProduct || undefined}
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'compare' && (
          <ComparisonView
            initialProductA={activeProduct || undefined}
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'ingredients' && (
          <IngredientExplorerView />
        )}

        {currentView === 'food-log' && (
          <FoodLogView />
        )}

        {currentView === 'reminders' && (
          <RemindersView />
        )}

        {currentView === 'saved' && (
          <SavedProductsView
            onSelectProduct={(p) => setActiveProduct(p)}
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'settings' && (
          <SettingsView />
        )}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
