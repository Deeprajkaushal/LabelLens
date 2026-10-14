import React from 'react';
import {
  Search,
  Scan,
  Calculator,
  GitCompare,
  BookOpen,
  CalendarDays,
  Bookmark,
  BellRing,
  Settings,
  Languages,
  Activity,
  Home
} from 'lucide-react';
import { useLanguage } from '../i18n';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  isBackendConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  isBackendConnected,
}) => {
  const { language, setLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'hi' : 'en');
  };

  const navItems = [
    { id: 'home', label: t.navDashboard, icon: <Home size={17} /> },
    { id: 'scan', label: t.navScan, icon: <Scan size={17} /> },
    { id: 'calculator', label: t.navCalculator, icon: <Calculator size={17} /> },
    { id: 'compare', label: t.navCompare, icon: <GitCompare size={17} /> },
    { id: 'food-log', label: t.navFoodLog, icon: <CalendarDays size={17} /> },
    { id: 'ingredients', label: t.navIngredients, icon: <BookOpen size={17} /> },
    { id: 'saved', label: t.navSaved, icon: <Bookmark size={17} /> },
    { id: 'reminders', label: t.navReminders, icon: <BellRing size={17} /> },
    { id: 'settings', label: t.navSettings, icon: <Settings size={17} /> },
  ];

  return (
    <>
      <header className="navbar">
        <div className="nav-wrapper">
          <button
            onClick={() => onNavigate('home')}
            className="nav-brand"
            style={{ textAlign: 'left' }}
          >
            <div className="brand-icon-box">
              <Search size={22} strokeWidth={2.6} />
            </div>
            <div className="brand-text">
              <h1>{t.brandName}</h1>
              <p>{t.tagline}</p>
            </div>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="nav-links">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`nav-item ${currentView === item.id ? 'active' : ''}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Actions: Status pill and Language Switcher */}
          <div className="nav-actions">
            <div
              className="status-pill"
              title={
                isBackendConnected
                  ? 'FastAPI Backend Connected & Running'
                  : 'Local Offline Engine Active'
              }
            >
              <div
                className="status-dot"
                style={{ backgroundColor: isBackendConnected ? 'var(--accent-emerald)' : '#06b6d4' }}
              />
              <span>{isBackendConnected ? 'Backend Live' : 'Local Engine'}</span>
            </div>

            <button
              onClick={toggleLanguage}
              className="lang-toggle"
              title="Switch Language / भाषा बदलें"
            >
              <Languages size={15} color="var(--accent-emerald)" />
              <span>{language === 'en' ? 'हिन्दी' : 'EN'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Bar */}
      <div className="mobile-nav">
        {navItems.slice(0, 5).map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`mobile-nav-item ${currentView === item.id ? 'active' : ''}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
        <button
          onClick={() => onNavigate('saved')}
          className={`mobile-nav-item ${currentView === 'saved' ? 'active' : ''}`}
        >
          <Bookmark size={17} />
          <span>{t.navSaved}</span>
        </button>
        <button
          onClick={() => onNavigate('settings')}
          className={`mobile-nav-item ${currentView === 'settings' ? 'active' : ''}`}
        >
          <Settings size={17} />
          <span>{t.navSettings}</span>
        </button>
      </div>
    </>
  );
};
