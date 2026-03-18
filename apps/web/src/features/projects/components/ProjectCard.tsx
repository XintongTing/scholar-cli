import { useNavigate } from 'react-router-dom';
import { Trash2, ArrowRight } from 'lucide-react';
import type { Project } from '../types';
import { useDeleteProject } from '../hooks/useProjects';
// cn imported for potential future use

const STATUS_LABELS: Record<Project['status'], string> = {
  OUTLINE: '大纲阶段',
  LITERATURE: '文献阶段',
  MATERIALS: '素材阶段',
  GENERATING: '生成中',
  EDITING: '编辑阶段',
  COMPLETED: '已完成',
};

const STATUS_ROUTES: Record<Project['status'], string> = {
  OUTLINE: 'outline',
  LITERATURE: 'literature',
  MATERIALS: 'materials',
  GENERATING: 'generate',
  EDITING: 'editor',
  COMPLETED: 'editor',
};

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate();
  const { mutate: deleteProject } = useDeleteProject();

  function handleOpen() {
    const route = STATUS_ROUTES[project.status];
    navigate(`/projects/${project.id}/${route}`);
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (confirm('确定要删除这个项目吗？')) {
      deleteProject(project.id);
    }
  }

  return (
    <div
      className="group flex items-center justify-between p-4 rounded-lg border border-border bg-bg-base hover:border-border-strong hover:shadow-sm transition-all cursor-pointer"
      onClick={handleOpen}
    >
      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-sm font-medium text-text-primary truncate">{project.title}</span>
        <span className="text-xs text-text-tertiary">
          {STATUS_LABELS[project.status]} · {new Date(project.updatedAt).toLocaleDateString('zh-CN')}
        </span>
      </div>
      <div className="flex items-center gap-2 ml-4">
        <button
          onClick={handleDelete}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-danger-subtle hover:text-danger text-text-tertiary transition-all"
          aria-label="删除项目"
        >
          <Trash2 size={14} strokeWidth={1.5} />
        </button>
        <ArrowRight size={16} strokeWidth={1.5} className="text-text-tertiary" />
      </div>
    </div>
  );
}
