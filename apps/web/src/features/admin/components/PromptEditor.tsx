import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { useUpdateContent } from '../hooks/usePromptAdmin';
import { Button } from '../../../shared/components/Button';
import type { PromptNode } from '../types';

interface PromptEditorProps {
  node: PromptNode;
}

export function PromptEditor({ node }: PromptEditorProps) {
  const [content, setContent] = useState('');
  const { mutate: updateContent, isPending } = useUpdateContent(node.id);

  useEffect(() => {
    const currentVersion = node.versions.find((v) => v.version === node.currentVersion);
    setContent(currentVersion?.content ?? '');
  }, [node]);

  function handleSave() {
    updateContent(content);
  }

  // Highlight {{variable}} placeholders
  const highlighted = content.replace(
    /\{\{(\w+)\}\}/g,
    '<mark class="bg-warning-subtle text-warning px-0.5 rounded">{{$1}}</mark>',
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">{node.name}</h3>
          <p className="text-xs text-text-tertiary">当前版本: v{node.currentVersion}</p>
        </div>
        <Button variant="primary" size="sm" onClick={handleSave} disabled={isPending}>
          <Save size={14} strokeWidth={1.5} />
          {isPending ? '保存中...' : '保存新版本'}
        </Button>
      </div>

      <div className="relative">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-80 font-mono text-xs border border-border rounded-md p-3 bg-bg-base text-text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-y"
          placeholder="输入提示词内容，使用 {{variable}} 表示变量..."
          spellCheck={false}
        />
      </div>

      <div className="text-xs text-text-tertiary">
        变量预览：
        <span
          className="ml-2"
          dangerouslySetInnerHTML={{ __html: highlighted.slice(0, 200) + (highlighted.length > 200 ? '...' : '') }}
        />
      </div>
    </div>
  );
}
