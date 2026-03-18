import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { PenLine, BookOpen, History, LogOut, Settings, ChevronLeft } from 'lucide-react';
import { useAuthStore } from '../features/auth/store';
import { cn } from '../shared/utils/cn';

const STEPS = [
  { key: 'outline',     label: '大纲',   path: 'outline' },
  { key: 'literature',  label: '文献',   path: 'literature' },
  { key: 'materials',   label: '素材',   path: 'materials' },
  { key: 'generation',  label: '生成',   path: 'generation' },
  { key: 'editor',      label: '编辑',   path: 'editor' },
];

const STEP_PREV: Record<string, string> = {
  literature: 'outline',
  materials:  'literature',
  generation: 'materials',
  editor:     'generation',
};

function useProjectStep() {
  const location = useLocation();
  const m = location.pathname.match(/\/projects\/([^/]+)\/([^/]+)/);
  if (!m) return { projectId: null, step: null };
  return { projectId: m[1], step: m[2] };
}

export function Layout() {
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();
  const { projectId, step } = useProjectStep();
  const isAdmin = user?.role === 'ADMIN';

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const handleBack = () => {
    if (!projectId || !step) return;
    const prev = STEP_PREV[step];
    if (prev) navigate(`/projects/${projectId}/${prev}`);
    else navigate('/projects');
  };

  const showSteps = !!step && STEPS.some((s) => s.key === step);

  return (
    <div className="flex flex-col h-screen bg-bg-base overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 border-b border-border bg-white shrink-0" style={{ height: 52 }}>
        <div className="flex items-center gap-3">
          <BookOpen size={20} className="text-primary" strokeWidth={1.5} />
          <span className="font-semibold text-text-primary text-base">ScholarCLI</span>

          {/* Step navigation */}
          {showSteps && (
            <div className="flex items-center gap-1 ml-6">
              {STEPS.map((s, idx) => {
                const isCurrent = s.key === step;
                const isDone = STEPS.findIndex((x) => x.key === step) > idx;
                return (
                  <div key={s.key} className="flex items-center">
                    {idx > 0 && (
                      <span className="w-6 h-px bg-border mx-1" />
                    )}
                    <button
                      onClick={() => projectId && navigate(`/projects/${projectId}/${s.path}`)}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors',
                        isCurrent && 'bg-primary text-white',
                        isDone && !isCurrent && 'text-primary hover:bg-primary-subtle',
                        !isCurrent && !isDone && 'text-text-tertiary cursor-default',
                      )}
                      disabled={!isCurrent && !isDone}
                    >
                      <span className={cn(
                        'w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                        isCurrent && 'bg-white/30 text-white',
                        isDone && !isCurrent && 'bg-primary text-white',
                        !isCurrent && !isDone && 'bg-border text-text-tertiary',
                      )}>
                        {idx + 1}
                      </span>
                      {s.label}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Back button */}
          {showSteps && (
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              <ChevronLeft size={16} strokeWidth={1.5} />
              返回上一步
            </button>
          )}

          <span className="text-sm text-text-secondary">{user?.name || user?.email}</span>

          {/* Admin entry — only visible to admins */}
          {isAdmin && (
            <a
              href="/admin"
              className="flex items-center gap-1 text-sm text-text-secondary hover:text-primary transition-colors"
              title="管理后台"
            >
              <Settings size={16} strokeWidth={1.5} />
              <span className="hidden sm:inline">管理后台</span>
            </a>
          )}

          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <LogOut size={16} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Nav */}
        <nav className="w-sidebar shrink-0 bg-bg-subtle border-r border-border flex flex-col py-2">
          {[
            { to: '/projects/new', icon: PenLine, label: '辅助写作' },
            { to: '/projects',     icon: History,  label: '历史记录' },
          ].map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 h-10 text-sm transition-colors',
                  isActive
                    ? 'bg-primary-subtle text-primary font-medium'
                    : 'text-text-secondary hover:bg-bg-muted hover:text-text-primary'
                )
              }
            >
              <Icon size={20} strokeWidth={1.5} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Main */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
