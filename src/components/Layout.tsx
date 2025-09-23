import React from 'react';
import { useLocation, NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, GitCompare, BarChart3, Database } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  
  const navigation = [
    { name: 'Configuration', href: '/', icon: Settings },
    { name: 'Compare', href: '/compare', icon: GitCompare },
    { name: 'Summary', href: '/summary', icon: BarChart3 },
    // { name: 'Config Management', href: '/config-management', icon: Database },
  ];

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">JSON Comparator</h1>
                <p className="text-xs text-muted-foreground">Multi-instance configuration comparison</p>
              </div>
            </div>
            
            <Badge variant="secondary" className="text-xs">
              Professional
            </Badge>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b border-border/40 bg-muted/20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex space-x-8">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;