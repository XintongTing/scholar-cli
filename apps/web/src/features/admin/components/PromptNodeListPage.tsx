import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit, TrendingUp } from 'lucide-react';
import { http } from '../../../services/http';
import { Spinner } from '../../../shared/components/Spinner';

interface PromptNode {
  id: string;
  name: string;
  description: string;
  currentVersion: number;
  callCount: number;
  avgTokens: number;
  updatedAt: string;
}

export function PromptNodeListPage() {
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<PromptNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    http.get('/admin/prompts').then((res) => {
      setNodes(res.data.data || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary">提示词管理</h1>
        <p className="mt-1 text-sm text-text-secondary">管理 AI 生成的系统提示词模板</p>
      </div>

      <div className="space-y-3">
        {nodes.map((node) => (
          <div
            key={node.id}
            onClick={() => navigate(`/admin/prompts/${node.id}`)}
            className="flex items-center justify-between p-4 bg-white border border-border rounded-lg hover:border-border-strong cursor-pointer transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-text-primary">{node.name}</p>
                <span className="text-xs text-text-tertiary bg-bg-muted px-2 py-0.5 rounded">
                  v{node.currentVersion}
                </span>
              </div>
              {node.description && (
                <p className="text-sm text-text-secondary mt-0.5">{node.description}</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-xs text-text-tertiary">
                <span className="flex items-center gap-1">
                  <TrendingUp size={12} strokeWidth={1.5} />
                  调用 {node.callCount} 次
                </span>
                <span>平均 {Math.round(node.avgTokens)} tokens</span>
                <span>更新于 {new Date(node.updatedAt).toLocaleDateString('zh-CN')}</span>
              </div>
            </div>
            <Edit size={16} className="text-text-tertiary shrink-0 ml-4" strokeWidth={1.5} />
          </div>
        ))}
      </div>
    </div>
  );
}
