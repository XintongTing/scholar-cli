import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Clock, Cpu, FileText } from 'lucide-react';
import { listAiCallLogs, getAiCallLog } from '../../../services/admin.service';
import type { AiCallLogSummary, AiCallLogDetail } from '../../../services/admin.service';
import { Spinner } from '../../../shared/components/Spinner';
import { cn } from '../../../shared/utils/cn';

const NODE_NAMES = [
  { value: '', label: '全部节点' },
  { value: 'outline_generation', label: 'outline_generation' },
  { value: 'chapter_generation', label: 'chapter_generation' },
  { value: 'literature_ai_search', label: 'literature_ai_search' },
  { value: 'material_requirement_inference', label: 'material_requirement_inference' },
];

function formatMs(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('zh-CN', { hour12: false });
}

function LogDetailPanel({ logId, onClose }: { logId: string; onClose: () => void }) {
  const [log, setLog] = useState<AiCallLogDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'prompt' | 'messages' | 'output'>('prompt');

  useEffect(() => {
    getAiCallLog(logId).then(setLog).finally(() => setLoading(false));
  }, [logId]);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Spinner size="md" />
    </div>
  );
  if (!log) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div>
          <span className="text-sm font-medium text-text-primary">{log.nodeName}</span>
          <span className="ml-3 text-xs text-text-tertiary">{formatTime(log.createdAt)}</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-text-secondary">
          <span className="flex items-center gap-1"><Clock size={12} />{formatMs(log.durationMs)}</span>
          <span className="flex items-center gap-1"><Cpu size={12} />in:{log.inputTokens} out:{log.outputTokens}</span>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary ml-2">✕</button>
        </div>
      </div>

      <div className="flex gap-0 border-b border-border shrink-0">
        {(['prompt', 'messages', 'output'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 text-xs font-medium border-b-2 transition-colors',
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            )}
          >
            {tab === 'prompt' ? 'System Prompt' : tab === 'messages' ? '消息列表' : 'AI 输出'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'prompt' && (
          <pre className="text-xs text-text-primary whitespace-pre-wrap font-mono bg-bg-subtle rounded p-3 leading-relaxed">
            {log.systemPrompt}
          </pre>
        )}
        {activeTab === 'messages' && (
          <div className="space-y-3">
            {log.messages.map((msg, i) => (
              <div key={i} className={cn('rounded p-3', msg.role === 'user' ? 'bg-primary-subtle' : 'bg-bg-subtle')}>
                <p className="text-xs font-medium text-text-secondary mb-1">{msg.role}</p>
                <pre className="text-xs text-text-primary whitespace-pre-wrap font-mono leading-relaxed">
                  {msg.content}
                </pre>
              </div>
            ))}
          </div>
        )}
        {activeTab === 'output' && (
          <pre className="text-xs text-text-primary whitespace-pre-wrap font-mono bg-bg-subtle rounded p-3 leading-relaxed">
            {log.output}
          </pre>
        )}
      </div>
    </div>
  );
}

export function AiCallLogPage() {
  const [logs, setLogs] = useState<AiCallLogSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterNode, setFilterNode] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = async (nodeName?: string) => {
    setLoading(true);
    try {
      const data = await listAiCallLogs({ nodeName: nodeName || undefined, limit: 100 });
      setLogs(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(filterNode); }, [filterNode]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* List */}
      <div className={cn('flex flex-col border-r border-border', selectedId ? 'w-96 shrink-0' : 'flex-1')}>
        <div className="px-4 py-3 border-b border-border flex items-center gap-3 shrink-0">
          <FileText size={16} className="text-text-secondary" strokeWidth={1.5} />
          <span className="text-sm font-medium text-text-primary">AI 调用日志</span>
          <select
            className="ml-auto h-7 px-2 text-xs border border-border rounded bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
            value={filterNode}
            onChange={e => setFilterNode(e.target.value)}
          >
            {NODE_NAMES.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center flex-1"><Spinner size="md" /></div>
        ) : logs.length === 0 ? (
          <p className="text-center text-sm text-text-tertiary py-12">暂无日志</p>
        ) : (
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {logs.map(log => (
              <button
                key={log.id}
                onClick={() => setSelectedId(log.id === selectedId ? null : log.id)}
                className={cn(
                  'w-full text-left px-4 py-3 hover:bg-bg-muted transition-colors',
                  selectedId === log.id && 'bg-primary-subtle'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text-primary">{log.nodeName}</span>
                  <span className="flex items-center gap-1 text-xs text-text-tertiary">
                    {selectedId === log.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-text-secondary">
                  <span>{formatTime(log.createdAt)}</span>
                  <span className="flex items-center gap-0.5"><Clock size={10} />{formatMs(log.durationMs)}</span>
                  <span className="flex items-center gap-0.5"><Cpu size={10} />{log.inputTokens + log.outputTokens} tok</span>
                </div>
                {log.projectId && (
                  <p className="text-xs text-text-tertiary mt-0.5 truncate">项目: {log.projectId}</p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detail */}
      {selectedId && (
        <div className="flex-1 overflow-hidden">
          <LogDetailPanel logId={selectedId} onClose={() => setSelectedId(null)} />
        </div>
      )}
    </div>
  );
}
