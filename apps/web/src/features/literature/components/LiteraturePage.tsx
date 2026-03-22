import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import {
  CheckCircle,
  ChevronRight,
  FileText,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { literatureApi } from '../api';
import type { Literature } from '../types';
import { Button } from '../../../shared/components/Button';
import { Spinner } from '../../../shared/components/Spinner';

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
};

type IntakeMode = 'ai-search' | 'upload' | 'paste';

function createDefaultCheckedIds(items: Literature[]) {
  return new Set(items.filter((item) => !item.confirmed).map((item) => item.id));
}

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error?.message || fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function formatMeta(literature: Literature) {
  const parts = [
    literature.authors.length > 0 ? literature.authors.join(', ') : null,
    literature.year ? String(literature.year) : null,
    literature.source || null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' · ') : '暂无作者 / 来源信息';
}

function LiteratureCard({
  literature,
  checked,
  selectable = false,
  action,
  onToggle,
  onDelete,
  deleteLabel = '删除文献',
}: {
  literature: Literature;
  checked?: boolean;
  selectable?: boolean;
  action?: ReactNode;
  onToggle?: (checked: boolean) => void;
  onDelete: () => void;
  deleteLabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        {selectable ? (
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
            checked={checked}
            onChange={(event) => onToggle?.(event.target.checked)}
          />
        ) : (
          <FileText size={18} className="mt-0.5 shrink-0 text-text-tertiary" strokeWidth={1.5} />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium leading-6 text-text-primary">{literature.title}</p>
              <p className="mt-1 text-xs leading-5 text-text-secondary">{formatMeta(literature)}</p>
            </div>
            <button
              type="button"
              onClick={onDelete}
              className="shrink-0 text-text-tertiary transition-colors hover:text-danger"
              aria-label={deleteLabel}
              title={deleteLabel}
            >
              <Trash2 size={16} strokeWidth={1.5} />
            </button>
          </div>

          {literature.abstract ? (
            <p className="mt-3 line-clamp-3 text-xs leading-6 text-text-tertiary">{literature.abstract}</p>
          ) : null}

          {action ? <div className="mt-4">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function LiteraturePage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [items, setItems] = useState<Literature[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submittingPaste, setSubmittingPaste] = useState(false);
  const [aiSearching, setAiSearching] = useState(false);
  const [showSearchParams, setShowSearchParams] = useState(false);
  const [intakeMode, setIntakeMode] = useState<IntakeMode>('ai-search');
  const [mutatingItemId, setMutatingItemId] = useState<string | null>(null);
  const [mutatingSelection, setMutatingSelection] = useState(false);
  const [error, setError] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [pasteTitle, setPasteTitle] = useState('');
  const [searchParams, setSearchParams] = useState({
    totalCount: 20,
    cnCount: 15,
    enCount: 5,
    years: 5,
    keywords: '',
  });

  const syncItems = useCallback((nextItems: Literature[]) => {
    setItems(nextItems);
    setCheckedIds((prev) => {
      const next = new Set<string>();
      const defaultChecked = createDefaultCheckedIds(nextItems);

      for (const id of prev) {
        if (defaultChecked.has(id)) next.add(id);
      }

      for (const id of defaultChecked) {
        if (!prev.has(id)) next.add(id);
      }

      return next;
    });
  }, []);

  useEffect(() => {
    if (!projectId) return;

    literatureApi.list(projectId)
      .then((res) => {
        const loadedItems = (res.data.data || []) as Literature[];
        setItems(loadedItems);
        setCheckedIds(createDefaultCheckedIds(loadedItems));
      })
      .catch((err) => {
        setError(getErrorMessage(err, '加载文献失败，请刷新重试'));
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  const appendItems = useCallback((newItems: Literature[]) => {
    setItems((prev) => {
      const existingIds = new Set(prev.map((item) => item.id));
      return [...prev, ...newItems.filter((item) => !existingIds.has(item.id))];
    });

    setCheckedIds((prev) => {
      const next = new Set(prev);
      for (const item of newItems) {
        if (!item.confirmed) next.add(item.id);
      }
      return next;
    });
  }, []);

  const onDrop = useCallback(async (files: File[]) => {
    if (!projectId) return;

    setError('');
    setUploading(true);
    try {
      for (const file of files) {
        const res = await literatureApi.upload(projectId, file);
        appendItems([res.data.data as Literature]);
      }
    } catch (err) {
      setError(getErrorMessage(err, '上传文献失败，请重试'));
    } finally {
      setUploading(false);
    }
  }, [appendItems, projectId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    multiple: true,
  });

  const candidateItems = useMemo(
    () => items.filter((item) => !item.confirmed),
    [items]
  );

  const selectedItems = useMemo(
    () => items.filter((item) => item.confirmed),
    [items]
  );

  const selectedCandidateIds = useMemo(
    () => candidateItems.filter((item) => checkedIds.has(item.id)).map((item) => item.id),
    [candidateItems, checkedIds]
  );

  const allCandidatesChecked = candidateItems.length > 0 && selectedCandidateIds.length === candidateItems.length;

  const handlePasteSubmit = async () => {
    if (!projectId || !pasteText.trim()) return;

    setError('');
    setSubmittingPaste(true);
    try {
      const res = await literatureApi.uploadText(projectId, {
        title: pasteTitle.trim() || '粘贴文献',
        text: pasteText.trim(),
      });
      appendItems([res.data.data as Literature]);
      setPasteText('');
      setPasteTitle('');
    } catch (err) {
      setError(getErrorMessage(err, '手动添加文献失败，请重试'));
    } finally {
      setSubmittingPaste(false);
    }
  };

  const handleDelete = async (litId: string) => {
    if (!projectId) return;

    setError('');
    setMutatingItemId(litId);
    try {
      await literatureApi.delete(projectId, litId);
      setItems((prev) => prev.filter((item) => item.id !== litId));
      setCheckedIds((prev) => {
        const next = new Set(prev);
        next.delete(litId);
        return next;
      });
    } catch (err) {
      setError(getErrorMessage(err, '删除文献失败，请重试'));
    } finally {
      setMutatingItemId(null);
    }
  };

  const handleAiSearch = async () => {
    if (!projectId) return;

    setError('');
    setAiSearching(true);
    try {
      const res = await literatureApi.aiSearch(projectId, searchParams);
      appendItems((res.data.data || []) as Literature[]);
    } catch (err) {
      setError(getErrorMessage(err, 'AI 搜索文献失败，请重试'));
    } finally {
      setAiSearching(false);
    }
  };

  const handleSelectionUpdate = async (literatureIds: string[], confirmed: boolean) => {
    if (!projectId || literatureIds.length === 0) return;

    setError('');
    setMutatingSelection(true);
    try {
      const res = await literatureApi.updateSelection(projectId, { literatureIds, confirmed });
      syncItems((res.data.data || []) as Literature[]);
    } catch (err) {
      setError(getErrorMessage(err, confirmed ? '添加引用失败，请重试' : '移回候选区失败，请重试'));
    } finally {
      setMutatingSelection(false);
    }
  };

  const handleConfirm = async () => {
    if (!projectId) return;

    setError('');
    try {
      await literatureApi.confirm(projectId);
      navigate(`/projects/${projectId}/materials`);
    } catch (err) {
      setError(getErrorMessage(err, '确认文献失败，请重试'));
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex h-full bg-bg-base">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto px-8 py-8">
          <div className="mx-auto max-w-4xl space-y-9">
            <div className="space-y-3">
              <h1 className="text-2xl font-semibold tracking-tight text-text-primary">文献管理</h1>
              <p className="max-w-3xl text-xs leading-6 text-text-tertiary">
                搜索、上传、手动添加都会进入候选文献，再从中筛选到右侧引用栏。
              </p>
            </div>

            {error ? (
              <div className="rounded-2xl border border-danger/30 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <section className="rounded-3xl border border-border/70 bg-white px-6 py-6 shadow-sm">
              <div className="space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold text-text-primary">添加文献</h2>
                    <p className="text-xs text-text-tertiary">统一入口，减少操作切换成本。</p>
                  </div>
                  <div className="rounded-full bg-bg-subtle px-3 py-1 text-xs text-text-secondary">
                    候选 {candidateItems.length} 篇
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {[
                    { key: 'ai-search', label: 'AI 智能搜索' },
                    { key: 'upload', label: '上传文档' },
                    { key: 'paste', label: '手动添加文献' },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setIntakeMode(item.key as IntakeMode)}
                      className={`rounded-full px-4 py-2 text-sm transition-colors ${
                        intakeMode === item.key
                          ? 'bg-primary text-white shadow-sm'
                          : 'bg-bg-subtle text-text-secondary hover:bg-bg-muted hover:text-text-primary'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {intakeMode === 'ai-search' ? (
                  <div className="rounded-2xl bg-bg-subtle/35 p-5">
                    <div className="space-y-5">
                      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-text-primary">根据论文主题快速生成候选文献</p>
                          <p className="text-xs leading-6 text-text-tertiary">适合先铺一批文献，再进入候选区做筛选。</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setShowSearchParams((value) => !value)}
                            className="text-xs text-primary hover:underline"
                          >
                            {showSearchParams ? '收起高级设置' : '高级设置'}
                          </button>
                          <Button variant="secondary" size="sm" onClick={handleAiSearch} disabled={aiSearching}>
                            {aiSearching ? <Spinner size="sm" /> : <Search size={14} strokeWidth={1.5} className="mr-1.5" />}
                            {aiSearching ? '搜索中...' : '开始搜索'}
                          </Button>
                        </div>
                      </div>

                      {showSearchParams ? (
                        <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border/70 bg-white p-4 md:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs text-text-secondary">总篇数</label>
                            <input
                              type="number"
                              min={5}
                              max={50}
                              className="w-full rounded border border-border px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                              value={searchParams.totalCount}
                              onChange={(event) => setSearchParams((prev) => ({ ...prev, totalCount: Number(event.target.value) }))}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-text-secondary">近几年</label>
                            <input
                              type="number"
                              min={1}
                              max={20}
                              className="w-full rounded border border-border px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                              value={searchParams.years}
                              onChange={(event) => setSearchParams((prev) => ({ ...prev, years: Number(event.target.value) }))}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-text-secondary">中文篇数</label>
                            <input
                              type="number"
                              min={0}
                              max={50}
                              className="w-full rounded border border-border px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                              value={searchParams.cnCount}
                              onChange={(event) => setSearchParams((prev) => ({ ...prev, cnCount: Number(event.target.value) }))}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-text-secondary">英文篇数</label>
                            <input
                              type="number"
                              min={0}
                              max={50}
                              className="w-full rounded border border-border px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                              value={searchParams.enCount}
                              onChange={(event) => setSearchParams((prev) => ({ ...prev, enCount: Number(event.target.value) }))}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="mb-1 block text-xs text-text-secondary">关键词</label>
                            <input
                              type="text"
                              className="w-full rounded border border-border px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                              placeholder="留空时自动从大纲提取"
                              value={searchParams.keywords}
                              onChange={(event) => setSearchParams((prev) => ({ ...prev, keywords: event.target.value }))}
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {intakeMode === 'upload' ? (
                  <div
                    {...getRootProps()}
                    className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
                      isDragActive ? 'border-primary bg-primary-subtle' : 'border-border hover:border-border-strong'
                    }`}
                  >
                    <input {...getInputProps()} />
                    {uploading ? (
                      <div className="flex flex-col items-center gap-3">
                        <Spinner size="md" />
                        <p className="text-sm text-text-secondary">正在解析文献...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <Upload size={28} className="text-text-tertiary" strokeWidth={1.5} />
                        <p className="text-sm font-medium text-text-primary">
                          {isDragActive ? '松开以上传文献' : '拖拽文件到此处，或点击选择'}
                        </p>
                        <p className="max-w-xl text-xs leading-6 text-text-tertiary">
                          支持 PDF、DOCX、TXT、MD，上传后自动进入候选池。
                        </p>
                      </div>
                    )}
                  </div>
                ) : null}

                {intakeMode === 'paste' ? (
                  <div className="rounded-2xl bg-bg-subtle/35 p-5">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-text-primary">手动录入文献信息</p>
                        <p className="text-xs leading-6 text-text-tertiary">
                          适合从数据库或文献管理工具复制标题、摘要、引用文本后快速入池。
                        </p>
                      </div>
                      <div className="space-y-4 rounded-2xl border border-border/70 bg-white p-4">
                        <input
                          className="w-full rounded border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="文献标题，可选"
                          value={pasteTitle}
                          onChange={(event) => setPasteTitle(event.target.value)}
                        />
                        <textarea
                          className="w-full resize-none rounded border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          rows={5}
                          placeholder="粘贴文献摘要或全文"
                          value={pasteText}
                          onChange={(event) => setPasteText(event.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setPasteText('');
                              setPasteTitle('');
                            }}
                          >
                            <X size={14} className="mr-1" />
                            清空
                          </Button>
                          <Button variant="primary" size="sm" onClick={handlePasteSubmit} disabled={!pasteText.trim() || submittingPaste}>
                            {submittingPaste ? <Spinner size="sm" /> : '添加文献'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-3xl border border-border/70 bg-white p-6 shadow-sm">
              <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold text-text-primary">候选文献</h2>
                  <p className="text-xs leading-6 text-text-tertiary">默认勾选，但不会自动加入最终引用。</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => setCheckedIds(allCandidatesChecked ? new Set() : new Set(candidateItems.map((item) => item.id)))}
                    disabled={candidateItems.length === 0}
                  >
                    {allCandidatesChecked ? '取消全选' : '全选候选'}
                  </button>
                  <Button
                    size="sm"
                    onClick={() => handleSelectionUpdate(selectedCandidateIds, true)}
                    disabled={selectedCandidateIds.length === 0 || mutatingSelection}
                  >
                    {mutatingSelection ? <Spinner size="sm" /> : <ChevronRight size={14} strokeWidth={1.5} className="mr-1.5" />}
                    添加引用（{selectedCandidateIds.length}）
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {candidateItems.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-bg-subtle/25 px-6 py-12 text-center text-sm text-text-tertiary">
                    暂无候选文献，先从上面的统一入口里搜索、上传或手动添加。
                  </div>
                ) : (
                  candidateItems.map((literature) => (
                    <LiteratureCard
                      key={literature.id}
                      literature={literature}
                      selectable
                      checked={checkedIds.has(literature.id)}
                      action={(
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleSelectionUpdate([literature.id], true)}
                          disabled={mutatingSelection}
                        >
                          添加引用
                        </Button>
                      )}
                      onToggle={(checked) => {
                        setCheckedIds((prev) => {
                          const next = new Set(prev);
                          if (checked) next.add(literature.id);
                          else next.delete(literature.id);
                          return next;
                        });
                      }}
                      onDelete={() => handleDelete(literature.id)}
                    />
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      <div className="flex w-80 flex-col overflow-hidden border-l border-border/70 bg-bg-subtle/60">
        <div className="border-b border-border/70 px-4 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-primary">已添加引用</span>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs text-text-secondary">
              {selectedItems.length} 篇
            </span>
          </div>
          <p className="mt-2 text-xs leading-6 text-text-tertiary">这里存放最终参与后续生成的文献。</p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-4">
            {selectedItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-white px-5 py-10 text-center text-sm text-text-tertiary">
                还没有加入最终引用的文献。
              </div>
            ) : (
              selectedItems.map((literature) => (
                <LiteratureCard
                  key={literature.id}
                  literature={literature}
                  onDelete={() => handleSelectionUpdate([literature.id], false)}
                  deleteLabel="移回候选区"
                />
              ))
            )}
          </div>
        </div>

        <div className="border-t border-border/70 px-4 py-4">
          <button
            type="button"
            onClick={handleConfirm}
            className="mb-4 text-xs text-text-tertiary transition-colors hover:text-text-secondary"
          >
            跳过此步骤
          </button>
          <Button
            variant="primary"
            className="w-full"
            onClick={handleConfirm}
            disabled={uploading || submittingPaste || aiSearching || mutatingSelection || mutatingItemId !== null}
          >
            <CheckCircle size={16} strokeWidth={1.5} className="mr-1.5" />
            确认文献并进入下一步（{selectedItems.length} 篇）
          </Button>
        </div>
      </div>
    </div>
  );
}
