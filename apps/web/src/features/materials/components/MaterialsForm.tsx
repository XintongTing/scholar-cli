import { useState } from 'react';
import { CheckCircle, SkipForward, Upload, FileText } from 'lucide-react';
import { useQuestions, useMaterials, useSubmitMaterialText, useSubmitMaterialFile, useSkipMaterial, useConfirmMaterials } from '../hooks/useMaterials';
import { Button } from '../../../shared/components/Button';
import { Textarea } from '../../../shared/components/Textarea';
import { Spinner } from '../../../shared/components/Spinner';
import { useNavigate } from 'react-router-dom';
import type { Material, MaterialQuestion } from '../types';

interface MaterialsFormProps {
  projectId: string;
}

export function MaterialsForm({ projectId }: MaterialsFormProps) {
  const navigate = useNavigate();
  const { data: questions, isLoading: loadingQ } = useQuestions();
  const { data: materials, isLoading: loadingM } = useMaterials(projectId);
  const { mutate: submitText, isPending: submittingText } = useSubmitMaterialText(projectId);
  const { mutate: submitFile } = useSubmitMaterialFile(projectId);
  const { mutate: skip } = useSkipMaterial(projectId);
  const { mutateAsync: confirm, isPending: confirming } = useConfirmMaterials(projectId);

  const [textValues, setTextValues] = useState<Record<string, string>>({});

  const materialMap = (materials ?? []).reduce((acc: Record<string, Material>, m: Material) => {
    acc[m.questionKey] = m;
    return acc;
  }, {});

  async function handleConfirm() {
    await confirm();
    navigate(`/projects/${projectId}/generate`);
  }

  if (loadingQ || loadingM) {
    return (
      <div className="flex items-center justify-center h-32">
        <Spinner size="md" />
      </div>
    );
  }

  const allQuestions = questions ?? [];
  const answeredCount = allQuestions.filter((q: MaterialQuestion) => materialMap[q.key]).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          已完成 {answeredCount} / {allQuestions.length} 项
        </p>
        <Button
          variant="primary"
          size="md"
          onClick={handleConfirm}
          disabled={confirming || answeredCount === 0}
        >
          <CheckCircle size={16} strokeWidth={1.5} />
          {confirming ? '确认中...' : '确认素材，开始生成'}
        </Button>
      </div>

      {allQuestions.map((question: MaterialQuestion) => {
        const existing = materialMap[question.key];
        const isDone = !!existing;

        return (
          <div
            key={question.key}
            className={`rounded-lg border p-4 ${isDone ? 'border-success bg-success-subtle' : 'border-border bg-bg-base'}`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {question.label}
                  {question.required && <span className="text-danger ml-1">*</span>}
                </p>
                <p className="text-xs text-text-secondary mt-0.5">{question.description}</p>
              </div>
              {isDone && <CheckCircle size={16} strokeWidth={1.5} className="text-success flex-shrink-0" />}
            </div>

            {existing?.skipped ? (
              <p className="text-xs text-text-tertiary italic">已跳过</p>
            ) : existing?.textContent ? (
              <p className="text-xs text-text-secondary bg-bg-subtle rounded p-2 line-clamp-3">{existing.textContent}</p>
            ) : existing?.fileKey ? (
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <FileText size={12} strokeWidth={1.5} />
                <span>文件已上传</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2 mt-2">
                <Textarea
                  value={textValues[question.key] ?? ''}
                  onChange={(e) => setTextValues((v) => ({ ...v, [question.key]: e.target.value }))}
                  placeholder="输入文字内容..."
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!textValues[question.key]?.trim() || submittingText}
                    onClick={() => submitText({ questionKey: question.key, text: textValues[question.key] })}
                  >
                    保存文字
                  </Button>
                  <label className="inline-flex items-center gap-1 h-7 px-3 text-xs rounded-md border border-border bg-bg-subtle text-text-secondary hover:bg-bg-muted cursor-pointer transition-colors">
                    <Upload size={12} strokeWidth={1.5} />
                    上传文件
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) submitFile({ questionKey: question.key, file });
                      }}
                    />
                  </label>
                  {!question.required && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => skip(question.key)}
                    >
                      <SkipForward size={12} strokeWidth={1.5} />
                      跳过
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
