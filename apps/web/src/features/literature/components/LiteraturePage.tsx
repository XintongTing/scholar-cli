import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { Upload, Trash2, CheckCircle, FileText, ClipboardPaste, X } from 'lucide-react';
import { literatureApi } from '../api';
import { Button } from '../../../shared/components/Button';
import { Spinner } from '../../../shared/components/Spinner';

interface Literature {
  id: string;
  title: string;
  authors: string[];
  year: number | null;
  abstract: string | null;
  source: string | null;
}

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
};

export function LiteraturePage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [items, setItems] = useState<Literature[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteTitle, setPasteTitle] = useState('');
  const [submittingPaste, setSubmittingPaste] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    literatureApi.list(projectId).then((res) => {
      setItems(res.data.data || []);
    }).finally(() => setLoading(false));
  }, [projectId]);

  const onDrop = useCallback(async (files: File[]) => {
    if (!projectId) return;
    setUploading(true);
    for (const file of files) {
      try {
        const res = await literatureApi.upload(projectId, file);
        setItems((prev) => [...prev, res.data.data]);
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }
    setUploading(false);
  }, [projectId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    multiple: true,
  });

  const handlePasteSubmit = async () => {
    if (!projectId || !pasteText.trim()) return;
    setSubmittingPaste(true);
    try {
      const res = await literatureApi.uploadText(projectId, {
        title: pasteTitle.trim() || '粘贴文献',
        text: pasteText.trim(),
      });
      setItems((prev) => [...prev, res.data.data]);
      setPasteText('');
      setPasteTitle('');
      setPasteMode(false);
    } catch (err) {
      console.error('Paste submit failed:', err);
    } finally {
      setSubmittingPaste(false);
    }
  };

  const handleDelete = async (litId: string) => {
    if (!projectId) return;
    await literatureApi.delete(projectId, litId);
    setItems((prev) => prev.filter((l) => l.id !== litId));
  };

  const handleConfirm = async () => {
    if (!projectId) return;
    await literatureApi.confirm(projectId);
    navigate(`/projects/${projectId}/materials`);
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary">文献管理</h1>
        <p className="mt-1 text-sm text-text-secondary">上传参考文献，AI 将自动提取元数据</p>
      </div>

      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors mb-3 ${
          isDragActive ? 'border-primary bg-primary-subtle' : 'border-border hover:border-border-strong'
        }`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Spinner size="md" />
            <p className="text-sm text-text-secondary">正在解析文献...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload size={32} className="text-text-tertiary" strokeWidth={1.5} />
            <p className="text-sm text-text-primary font-medium">
              {isDragActive ? '松开以上传' : '拖拽文件到此处，或点击选择'}
            </p>
            <p className="text-xs text-text-tertiary">支持 PDF、DOCX、TXT、MD 格式，可多文件同时上传</p>
          </div>
        )}
      </div>

      {/* Paste text toggle */}
      <div className="mb-6">
        <button
          onClick={() => setPasteMode((v) => !v)}
          className="flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <ClipboardPaste size={15} strokeWidth={1.5} />
          {pasteMode ? '收起' : '直接粘贴文献文本'}
        </button>

        {pasteMode && (
          <div className="mt-3 border border-border rounded-lg p-4 bg-white space-y-3">
            <input
              className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="文献标题（可选）"
              value={pasteTitle}
              onChange={(e) => setPasteTitle(e.target.value)}
            />
            <textarea
              className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={6}
              placeholder="粘贴文献摘要或全文..."
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setPasteMode(false); setPasteText(''); setPasteTitle(''); }}>
                <X size={14} className="mr-1" />取消
              </Button>
              <Button variant="primary" size="sm" onClick={handlePasteSubmit} disabled={!pasteText.trim() || submittingPaste}>
                {submittingPaste ? <Spinner size="sm" /> : '添加文献'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Literature List */}
      {items.length > 0 && (
        <div className="space-y-3 mb-8">
          <p className="text-sm font-medium text-text-primary">已添加文献（{items.length} 篇）</p>
          {items.map((lit) => (
            <div key={lit.id} className="flex items-start gap-3 p-4 bg-white border border-border rounded-lg">
              <FileText size={20} className="text-text-tertiary shrink-0 mt-0.5" strokeWidth={1.5} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">{lit.title}</p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {lit.authors.join(', ')}{lit.year ? ` · ${lit.year}` : ''}
                  {lit.source ? ` · ${lit.source}` : ''}
                </p>
                {lit.abstract && (
                  <p className="text-xs text-text-tertiary mt-1 line-clamp-2">{lit.abstract}</p>
                )}
              </div>
              <button
                onClick={() => handleDelete(lit.id)}
                className="text-text-tertiary hover:text-danger transition-colors shrink-0"
              >
                <Trash2 size={16} strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
      )}

      {items.length === 0 && !uploading && (
        <p className="text-center text-sm text-text-tertiary py-8">
          暂无文献，可以直接跳过此步骤
        </p>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" onClick={handleConfirm}>
          跳过此步骤
        </Button>
        <Button variant="primary" onClick={handleConfirm} disabled={uploading}>
          <CheckCircle size={16} strokeWidth={1.5} className="mr-1.5" />
          确认文献（{items.length} 篇）
        </Button>
      </div>
    </div>
  );
}
