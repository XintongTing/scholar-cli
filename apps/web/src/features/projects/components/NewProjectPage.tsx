import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileText } from 'lucide-react';
import { projectApi } from '../api';
import { useProject } from '../hooks/useProjects';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { Spinner } from '../../../shared/components/Spinner';
import { cn } from '../../../shared/utils/cn';

const IDENTITY_OPTIONS = ['研究生', '本科生', '教师', '职场人士'];
const PAPER_TYPE_OPTIONS = ['毕业论文', '期刊论文', '会议论文', '综述'];
const OUTLINE_LEVELS = [
  { value: 1, label: '1 级', desc: '仅章节标题' },
  { value: 2, label: '2 级', desc: '章节 + 小节' },
  { value: 3, label: '3 级', desc: '章节 + 小节 + 子节' },
];

const GUIDANCE_HINTS: Record<string, string[]> = {
  毕业论文: [
    '系统或研究面向哪类用户？',
    '核心功能或研究内容有哪些？',
    '有没有特别想突出的创新点？',
    '论文大概要多少字，学校是否有格式要求？',
    '使用了哪些技术栈或研究方法？',
  ],
  期刊论文: [
    '研究问题是什么？',
    '采用了哪种研究方法，比如实验、调研或理论推导？',
    '有哪些核心发现或创新点？',
    '目标投稿期刊或字数要求是什么？',
  ],
  会议论文: [
    '研究问题与核心贡献是什么？',
    '实验设置和对比基线是什么？',
    '目标会议及页数限制是什么？',
  ],
  综述: [
    '综述的核心主题和时间范围是什么？',
    '主要覆盖哪些子方向或流派？',
    '有没有特定的分类框架或对比维度？',
    '字数要求是多少？',
  ],
};

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
};

export function NewProjectPage() {
  const navigate = useNavigate();
  const { id: projectId } = useParams<{ id: string }>();
  const isProjectStartPage = Boolean(projectId);
  const { data: project, isLoading: projectLoading } = useProject(projectId ?? '');

  const [identity, setIdentity] = useState('');
  const [paperType, setPaperType] = useState('');
  const [field, setField] = useState('');
  const [goal, setGoal] = useState('');
  const [outlineLevel, setOutlineLevel] = useState(1);
  const [refFiles, setRefFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!project || !isProjectStartPage) return;
    const profile = (project.userProfile ?? {}) as Record<string, string>;
    setIdentity(profile.identity || '');
    setPaperType(profile.paperType || '');
    setField(profile.field || '');
    setGoal(profile.goal || '');
    setOutlineLevel(Number(profile.outlineLevel || '1'));
  }, [project, isProjectStartPage]);

  const hints = paperType ? (GUIDANCE_HINTS[paperType] || []) : [];

  const onDrop = useCallback((accepted: File[]) => {
    if (isProjectStartPage) return;
    setRefFiles((prev) => [...prev, ...accepted]);
  }, [isProjectStartPage]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    multiple: true,
    disabled: isProjectStartPage,
  });

  const removeFile = (idx: number) => {
    if (isProjectStartPage) return;
    setRefFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isProjectStartPage && projectId) {
      navigate(`/projects/${projectId}/outline`);
      return;
    }

    if (!identity || !paperType || !field || !goal) {
      setError('请填写所有必填项');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await projectApi.create({
        identity,
        paperType,
        field,
        goal,
        outlineLevel: String(outlineLevel),
      });
      const createdProject = res.data.data;
      navigate(`/projects/${createdProject.id}/outline`);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '创建失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  if (isProjectStartPage && projectLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary">开始写作</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {isProjectStartPage ? '这里展示该项目开始阶段填写的基础信息。' : '告诉我一些基础信息，AI 将为你生成专属大纲。'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">我是</label>
          <div className="flex flex-wrap gap-2">
            {IDENTITY_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                disabled={isProjectStartPage}
                onClick={() => setIdentity(opt)}
                className={cn(
                  'px-4 py-2 rounded text-sm border transition-colors disabled:cursor-default',
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

        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">论文类型</label>
          <div className="flex flex-wrap gap-2">
            {PAPER_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                disabled={isProjectStartPage}
                onClick={() => setPaperType(opt)}
                className={cn(
                  'px-4 py-2 rounded text-sm border transition-colors disabled:cursor-default',
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

        <Input
          label="研究领域"
          placeholder="例如：计算机视觉、经济学、教育学..."
          value={field}
          onChange={(e) => setField(e.target.value)}
          required
          disabled={isProjectStartPage}
        />

        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">大纲层级</label>
          <div className="flex gap-2">
            {OUTLINE_LEVELS.map((level) => (
              <button
                key={level.value}
                type="button"
                disabled={isProjectStartPage}
                onClick={() => setOutlineLevel(level.value)}
                className={cn(
                  'flex-1 px-3 py-2 rounded text-sm border transition-colors text-center disabled:cursor-default',
                  outlineLevel === level.value
                    ? 'bg-primary-subtle border-primary text-primary font-medium'
                    : 'bg-white border-border text-text-secondary hover:border-border-strong'
                )}
              >
                <div className="font-medium">{level.label}</div>
                <div className="text-xs mt-0.5 opacity-70">{level.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">其他要求</label>
          {hints.length > 0 && (
            <div className="mb-2 p-3 bg-bg-subtle border border-border rounded text-xs text-text-secondary space-y-1">
              <p className="font-medium text-text-primary mb-1">这些信息越具体，生成的大纲越准确：</p>
              {hints.map((hint, idx) => (
                <p key={idx}>- {hint}</p>
              ))}
            </div>
          )}
          <textarea
            className="w-full px-3 py-2 bg-bg-muted border border-border rounded text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors resize-none disabled:opacity-100"
            rows={4}
            placeholder={
              paperType === '毕业论文'
                ? '例如：基于 Spring Boot + Vue 的高校宿舍管理系统，面向宿管和学生，核心功能包括宿舍分配、报修管理，约 1 万字。'
                : '描述你的研究目标、主要内容、字数要求等。'
            }
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            required
            disabled={isProjectStartPage}
          />
        </div>

        {!isProjectStartPage && (
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              上传参考文档<span className="text-text-tertiary font-normal">（可选）</span>
            </label>
            <p className="text-xs text-text-secondary mb-2">上传开题报告、草稿、相关文献等，后续可作为写作参考。</p>
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors',
                isDragActive ? 'border-primary bg-primary-subtle' : 'border-border hover:border-border-strong'
              )}
            >
              <input {...getInputProps()} />
              <Upload size={20} className="text-text-tertiary mx-auto mb-1" strokeWidth={1.5} />
              <p className="text-sm text-text-secondary">
                {isDragActive ? '松开以上传' : '拖拽文件到此处，或点击选择'}
              </p>
              <p className="text-xs text-text-tertiary mt-0.5">支持 PDF、DOCX、TXT、MD</p>
            </div>

            {refFiles.length > 0 && (
              <div className="mt-2 space-y-1">
                {refFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-bg-subtle border border-border rounded text-sm">
                    <FileText size={14} className="text-text-tertiary shrink-0" strokeWidth={1.5} />
                    <span className="flex-1 truncate text-text-primary">{file.name}</span>
                    <button type="button" onClick={() => removeFile(idx)} className="text-text-tertiary hover:text-danger">
                      <X size={14} strokeWidth={1.5} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" variant="primary" size="lg" disabled={loading}>
          {loading ? '处理中...' : isProjectStartPage ? '继续到大纲' : '开始生成大纲'}
        </Button>
      </form>
    </div>
  );
}
