import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Clock } from 'lucide-react';
import { projectApi } from '../api';
import { Button } from '../../../shared/components/Button';
import { Spinner } from '../../../shared/components/Spinner';

interface Project {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  outline?: { title: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  OUTLINE: '生成大纲',
  LITERATURE: '文献管理',
  MATERIALS: '补充材料',
  GENERATING: '生成中',
  EDITING: '编辑中',
  COMPLETED: '已完成',
};

const STATUS_ROUTES: Record<string, string> = {
  OUTLINE: 'outline',
  LITERATURE: 'literature',
  MATERIALS: 'materials',
  GENERATING: 'generation',
  EDITING: 'editor',
  COMPLETED: 'editor',
};

export function ProjectListPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    projectApi.list().then((res) => {
      setProjects(res.data.data.items || []);
    }).finally(() => setLoading(false));
  }, []);

  const handleOpen = (project: Project) => {
    const route = STATUS_ROUTES[project.status] || 'outline';
    navigate(`/projects/${project.id}/${route}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">历史记录</h1>
          <p className="mt-1 text-sm text-text-secondary">你的所有写作项目</p>
        </div>
        <Button variant="primary" onClick={() => navigate('/projects/new')}>
          <Plus size={16} strokeWidth={1.5} className="mr-1" />
          新建项目
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-20">
          <FileText size={40} className="mx-auto text-text-tertiary mb-4" strokeWidth={1} />
          <p className="text-text-secondary">还没有写作项目</p>
          <Button variant="primary" className="mt-4" onClick={() => navigate('/projects/new')}>
            开始第一篇论文
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => handleOpen(project)}
              className="flex items-center justify-between p-4 bg-white border border-border rounded-lg hover:border-border-strong cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText size={20} className="text-text-tertiary shrink-0" strokeWidth={1.5} />
                <div className="min-w-0">
                  <p className="font-medium text-text-primary truncate">
                    {project.outline?.title || project.title || '未命名项目'}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-text-tertiary flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(project.updatedAt).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                </div>
              </div>
              <span className="text-xs text-text-secondary bg-bg-muted px-2 py-1 rounded shrink-0 ml-4">
                {STATUS_LABELS[project.status] || project.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
