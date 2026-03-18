import { useState } from 'react';
import { Plus, FileText } from 'lucide-react';
import { useProjects, useCreateProject } from '../hooks/useProjects';
import { ProjectCard } from './ProjectCard';
import { Button } from '../../../shared/components/Button';
import { Spinner } from '../../../shared/components/Spinner';
import { EmptyState } from '../../../shared/components/EmptyState';
import { Modal } from '../../../shared/components/Modal';
import { Input } from '../../../shared/components/Input';
import { useNavigate } from 'react-router-dom';
import type { Project } from '../types';

export function ProjectList() {
  const { data, isLoading } = useProjects();
  const { mutateAsync: createProject, isPending } = useCreateProject();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const project = await createProject({ userProfile: {}, title: title || undefined });
    setShowModal(false);
    setTitle('');
    navigate(`/projects/${project.id}/outline`);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const projects = data?.items ?? [];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-text-primary">我的项目</h1>
        <Button variant="primary" size="md" onClick={() => setShowModal(true)}>
          <Plus size={16} strokeWidth={1.5} />
          新建项目
        </Button>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={<FileText size={32} strokeWidth={1.5} />}
          title="还没有项目"
          description="创建您的第一个学术写作项目"
          action={
            <Button variant="primary" onClick={() => setShowModal(true)}>
              新建项目
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {projects.map((project: Project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="新建项目">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input
            label="项目标题（可选）"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="未命名项目"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
              取消
            </Button>
            <Button variant="primary" type="submit" disabled={isPending}>
              {isPending ? '创建中...' : '创建'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
