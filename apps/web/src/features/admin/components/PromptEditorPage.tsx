import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft } from 'lucide-react';
import { http } from '../../../services/http';
import { Button } from '../../../shared/components/Button';
import { Spinner } from '../../../shared/components/Spinner';

export function PromptEditorPage() {
  const { nodeId } = useParams<{ nodeId: string }>();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nodeName, setNodeName] = useState('');

  useEffect(() => {
    if (!nodeId) return;
    http.get(`/admin/prompts/${nodeId}`).then((res) => {
      const node = res.data.data;
      setNodeName(node.name);
      const latest = node.versions[0];
      if (latest) setContent(latest.content);
    }).finally(() => setLoading(false));
  }, [nodeId]);

  const handleSave = async () => {
    if (!nodeId) return;
    setSaving(true);
    try {
      await http.patch(`/admin/prompts/${nodeId}`, { content });
      navigate('/admin/prompts');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/prompts')}
            className="text-text-tertiary hover:text-text-primary transition-colors"
          >
            <ArrowLeft size={20} strokeWidth={1.5} />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-text-primary">编辑提示词</h1>
            <p className="text-sm text-text-secondary mt-0.5">{nodeName}</p>
          </div>
        </div>
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? <Spinner size="sm" /> : <Save size={16} strokeWidth={1.5} className="mr-1" />}
          保存新版本
        </Button>
      </div>

      <div className="bg-white border border-border rounded-lg p-4">
        <textarea
          className="w-full h-[600px] px-3 py-2 bg-bg-muted border border-border rounded text-sm text-text-primary font-mono focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="输入系统提示词内容，可使用 {{variable}} 占位符..."
        />
        <p className="text-xs text-text-tertiary mt-2">
          {'支持变量：{{user_identity}}, {{paper_type}}, {{field}}, {{goal}}, {{outline}}, {{literature_list}}, {{materials_summary}}'}
        </p>
      </div>
    </div>
  );
}
