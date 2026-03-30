import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from './Layout';
import { LoginForm } from '../features/auth/components/LoginForm';
import { RegisterForm } from '../features/auth/components/RegisterForm';
import { useAuthStore } from '../features/auth/store';

// Lazy pages
import { ProjectListPage } from '../features/projects/components/ProjectListPage';
import { NewProjectPage } from '../features/projects/components/NewProjectPage';
import { OutlinePage } from '../features/outline/components/OutlinePage';
import { LiteraturePage } from '../features/literature/components/LiteraturePage';
import { MaterialsPage } from '../features/materials/components/MaterialsPage';
import { GenerationPage } from '../features/generation/components/GenerationPage';
import { EditorPage } from '../features/editor/components/EditorPage';
import { AdminLayout } from '../features/admin/components/AdminLayout';
import { PromptNodeListPage } from '../features/admin/components/PromptNodeListPage';
import { PromptEditorPage } from '../features/admin/components/PromptEditorPage';
import { AiCallLogPage } from '../features/admin/components/AiCallLogPage';
import { AiConfigPage } from '../features/admin/components/AiConfigPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'ADMIN') return <Navigate to="/projects" replace />;
  return <>{children}</>;
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginForm /> },
  { path: '/register', element: <RegisterForm /> },
  {
    path: '/',
    element: <RequireAuth><Layout /></RequireAuth>,
    children: [
      { index: true, element: <Navigate to="/projects" replace /> },
      { path: 'projects', element: <ProjectListPage /> },
      { path: 'projects/new', element: <NewProjectPage /> },
      { path: 'projects/:id/start', element: <NewProjectPage /> },
      { path: 'projects/:id/outline', element: <OutlinePage /> },
      { path: 'projects/:id/literature', element: <LiteraturePage /> },
      { path: 'projects/:id/materials', element: <MaterialsPage /> },
      { path: 'projects/:id/generation', element: <GenerationPage /> },
      { path: 'projects/:id/editor', element: <EditorPage /> },
    ],
  },
  {
    path: '/admin',
    element: <RequireAdmin><AdminLayout /></RequireAdmin>,
    children: [
      { index: true, element: <Navigate to="/admin/prompts" replace /> },
      { path: 'prompts', element: <PromptNodeListPage /> },
      { path: 'prompts/:nodeId', element: <PromptEditorPage /> },
      { path: 'ai-config', element: <AiConfigPage /> },
      { path: 'ai-logs', element: <AiCallLogPage /> },
    ],
  },
]);
