import { useState } from 'react';
import { PromptNodeList } from '../features/admin/components/PromptNodeList';
import { PromptEditor } from '../features/admin/components/PromptEditor';
import { VersionHistory } from '../features/admin/components/VersionHistory';
import { GrayTestPanel } from '../features/admin/components/GrayTestPanel';
import { MetricsPanel } from '../features/admin/components/MetricsPanel';
import { usePromptNode } from '../features/admin/hooks/usePromptAdmin';
import type { PromptNode } from '../features/admin/types';

export function AdminPage() {
  const [selectedNode, setSelectedNode] = useState<PromptNode | null>(null);
  const { data: nodeDetail } = usePromptNode(selectedNode?.id ?? '');

  const node = nodeDetail ?? selectedNode;

  return (
    <div className="flex h-full">
      {/* Left: node list */}
      <div className="w-[240px] flex-shrink-0 border-r border-border overflow-y-auto p-3">
        <PromptNodeList selectedId={selectedNode?.id ?? null} onSelect={setSelectedNode} />
      </div>

      {/* Right: node detail */}
      <div className="flex-1 overflow-y-auto p-6">
        {!node ? (
          <div className="flex items-center justify-center h-full text-sm text-text-tertiary">
            选择一个提示词节点进行编辑
          </div>
        ) : (
          <div className="flex flex-col gap-8 max-w-3xl">
            <MetricsPanel nodeId={node.id} />
            <PromptEditor node={node} />
            <VersionHistory node={node} />
            <GrayTestPanel node={node} />
          </div>
        )}
      </div>
    </div>
  );
}
