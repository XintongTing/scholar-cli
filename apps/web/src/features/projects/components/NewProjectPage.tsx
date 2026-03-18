import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectApi } from '../api';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { cn } from '../../../shared/utils/cn';

const IDENTITY_OPTIONS = ['研究生', '本科生', '教师', '职场人士'];
const PAPER_TYPE_OPTIONS = ['毕业论文', '期刊论文', '会议论文', '综述'];

export function NewProjectPage() {
  const navigate = useNavigate();
  const [identity, setIdentity] = useState('');
  const [paperType, setPaperType] = useState('');
  const [field, setField] = useState('');
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identity || !paperType || !field || !goal) {
      setError('请填写所有必填项');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await projectApi.create({ identity, paperType, field, goal });
      const project = res.data.data;
      navigate(`/projects/${project.id}/outline`);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '创建失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary">开始写作</h1>
        <p className="mt-1 text-sm text-text-secondary">告诉我一些基本信息，AI 将为你生成专属大纲</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identity */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">我是</label>
          <div className="flex flex-wrap gap-2">
            {IDENTITY_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setIdentity(opt)}
                className={cn(
                  'px-4 py-2 rounded text-sm border transition-colors',
                  identity === opt
                    ? 'bg-primary-subtle border-primary text-primary font-medium'
                    : 'bg-white border-border text-text-secondary hover:border-border-strong'
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Paper Type */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">论文类型</label>
          <div className="flex flex-wrap gap-2">
            {PAPER_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setPaperType(opt)}
                className={cn(
                  'px-4 py-2 rounded text-sm border transition-colors',
                  paperType === opt
                    ? 'bg-primary-subtle border-primary text-primary font-medium'
                    : 'bg-white border-border text-text-secondary hover:border-border-strong'
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Field */}
        <Input
          label="研究领域"
          placeholder="例如：计算机视觉、经济学、教育学..."
          value={field}
          onChange={(e) => setField(e.target.value)}
          required
        />

        {/* Goal */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">写作目标</label>
          <textarea
            className="w-full px-3 py-2 bg-bg-muted border border-border rounded text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors resize-none"
            rows={3}
            placeholder="例如：做一篇关于联邦学习在医疗数据隐私保护中应用的综述..."
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            required
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" variant="primary" size="lg" disabled={loading}>
          {loading ? '创建中...' : '开始生成大纲 →'}
        </Button>
      </form>
    </div>
  );
}
