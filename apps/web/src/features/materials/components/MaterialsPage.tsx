import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Upload, Type, SkipForward, CheckCircle, Check } from 'lucide-react';
import { materialsApi } from '../api';
import { Button } from '../../../shared/components/Button';
import { Spinner } from '../../../shared/components/Spinner';
import { cn } from '../../../shared/utils/cn';

interface Question {
  key: string;
  label: string;
  description: string;
}

interface MaterialStatus {
  [key: string]: 'pending' | 'uploaded' | 'text' | 'skipped';
}

export function MaterialsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [status, setStatus] = useState<MaterialStatus>({});
  const [textInputs, setTextInputs] = useState<Record<string, string>>({});
  const [activeTextKey, setActiveTextKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    Promise.all([
      materialsApi.getQuestions(projectId),
      materialsApi.list(projectId),
    ]).then(([qRes, mRes]) => {
      setQuestions(qRes.data.data || []);
      const existing = mRes.data.data || [];
      const s: MaterialStatus = {};
      for (const m of existing) {
        if (m.skipped) s[m.questionKey] = 'skipped';
        else if (m.fileKey) s[m.questionKey] = 'uploaded';
        else if (m.textContent) s[m.questionKey] = 'text';
      }
      setStatus(s);
    }).finally(() => setLoading(false));
  }, [projectId]);

  const handleFileUpload = async (key: string, file: File) => {
    if (!projectId) return;
    setSubmitting(key);
    try {
      await materialsApi.uploadFile(projectId, key, file);
      setStatus((s) => ({ ...s, [key]: 'uploaded' }));
    } finally {
      setSubmitting(null);
    }
  };

  const handleTextSubmit = async (key: string) => {
    if (!projectId || !textInputs[key]?.trim()) return;
    setSubmitting(key);
    try {
      await materialsApi.submitText(projectId, key, textInputs[key]);
      setStatus((s) => ({ ...s, [key]: 'text' }));
      setActiveTextKey(null);
    } finally {
      setSubmitting(null);
    }
  };

  const handleSkip = async (key: string) => {
    if (!projectId) return;
    setSubmitting(key);
    try {
      await materialsApi.skip(projectId, key);
      setStatus((s) => ({ ...s, [key]: 'skipped' }));
    } finally {
      setSubmitting(null);
    }
  };

  const handleConfirm = async () => {
    if (!projectId) return;
    await materialsApi.confirm(projectId);
    navigate(`/projects/${projectId}/generation`);
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Spinner size="lg" /></div>;

  const doneCount = Object.values(status).filter((s) => s !== 'pending').length;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary">补充材料</h1>
        <p className="mt-1 text-sm text-text-secondary">
          提供以下材料可以让 AI 生成更准确的论文内容，所有项目均可跳过
        </p>
      </div>

      <div className="space-y-4 mb-8">
        {questions.map((q) => {
          const s = status[q.key] || 'pending';
          const isDone = s !== 'pending';
          const isActive = activeTextKey === q.key;

          return (
            <div
              key={q.key}
              className={cn(
                'border rounded-lg p-4 transition-colors',
                isDone ? 'border-success bg-success-subtle' : 'border-border bg-white'
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {isDone && <Check size={16} className="text-success shrink-0" strokeWidth={2} />}
                    <p className="text-sm font-medium text-text-primary">{q.label}</p>
                    {s === 'skipped' && (
                      <span className="text-xs text-text-tertiary bg-bg-muted px-2 py-0.5 rounded">已跳过</span>
                    )}
                    {s === 'uploaded' && (
                      <span className="text-xs text-success bg-success-subtle px-2 py-0.5 rounded">已上传</span>
                    )}
                    {s === 'text' && (
                      <span className="text-xs text-success bg-success-subtle px-2 py-0.5 rounded">已填写</span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary mt-1">{q.description}</p>
                </div>

                {!isDone && (
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(q.key, file);
                        }}
                      />
                      <span className={cn(
                        'inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-border rounded hover:bg-bg-muted transition-colors',
                        submitting === q.key ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                      )}>
                        <Upload size={12} strokeWidth={1.5} />
                        上传文件
                      </span>
                    </label>
                    <button
                      onClick={() => setActiveTextKey(isActive ? null : q.key)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-border rounded hover:bg-bg-muted transition-colors"
                    >
                      <Type size={12} strokeWidth={1.5} />
                      粘贴文本
                    </button>
                    <button
                      onClick={() => handleSkip(q.key)}
                      disabled={submitting === q.key}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
                    >
                      <SkipForward size={12} strokeWidth={1.5} />
                      跳过
                    </button>
                  </div>
                )}
              </div>

              {isActive && !isDone && (
                <div className="mt-3 space-y-2">
                  <textarea
                    className="w-full px-3 py-2 bg-bg-muted border border-border rounded text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                    rows={4}
                    placeholder="在此粘贴或输入相关内容..."
                    value={textInputs[q.key] || ''}
                    onChange={(e) => setTextInputs((t) => ({ ...t, [q.key]: e.target.value }))}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => setActiveTextKey(null)}>取消</Button>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleTextSubmit(q.key)}
                      disabled={!textInputs[q.key]?.trim() || submitting === q.key}
                    >
                      {submitting === q.key ? <Spinner size="sm" /> : '确认'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          已完成 {doneCount} / {questions.length} 项
        </p>
        <Button variant="primary" size="lg" onClick={handleConfirm}>
          <CheckCircle size={16} strokeWidth={1.5} className="mr-1.5" />
          开始生成论文
        </Button>
      </div>
    </div>
  );
}
