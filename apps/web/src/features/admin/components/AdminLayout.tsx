import { Outlet, NavLink } from 'react-router-dom';
import { Settings, ArrowLeft } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

export function AdminLayout() {
  return (
    <div className="flex flex-col h-screen bg-bg-base">
      <header className="h-13 flex items-center justify-between px-4 border-b border-border bg-white shrink-0" style={{ height: 52 }}>
        <div className="flex items-center gap-3">
          <Settings size={20} className="text-primary" strokeWidth={1.5} />
          <span className="font-semibold text-text-primary">管理员后台</span>
        </div>
        <a href="/projects" className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors">
          <ArrowLeft size={16} strokeWidth={1.5} />
          返回主页
        </a>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <nav className="w-sidebar shrink-0 bg-bg-subtle border-r border-border flex flex-col py-2">
          <NavLink
            to="/admin/prompts"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 h-10 text-sm transition-colors',
                isActive
                  ? 'bg-primary-subtle text-primary font-medium'
                  : 'text-text-secondary hover:bg-bg-muted hover:text-text-primary'
              )
            }
          >
            提示词管理
          </NavLink>
        </nav>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
