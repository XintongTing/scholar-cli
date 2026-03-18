import { useState } from 'react';
import { useSetTestVersion } from '../hooks/usePromptAdmin';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import type { PromptNode } from '../types';

interface GrayTestPanelProps {
  node: PromptNode;
}

export function GrayTestPanel({ node }: GrayTestPanelProps) {
  const { mutate: setTestVersion, isPending } = useSetTestVersion(node.id);
  const [version, setVersion] = useState(String(node.testVersion ?? ''));
  const [userIds, setUserIds] = useState(node.testUserIds.join('\n'));

  function handleSave() {
    const v = version.trim() ? parseInt(version, 10) : null;
    const ids = userIds.split('\n').map((s) => s.trim()).filter(Boolean);
    setTestVersion({ version: v, testUserIds: ids });
  }

  function handleClear() {
    setVersion('');
    setUserIds('');
    setTestVersion({ version: null, testUserIds: [] });
  }

  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">灰度测试</h4>

      <Input
        label="测试版本号"
        type="number"
        value={version}
        onChange={(e) => setVersion(e.target.value)}
        placeholder="留空则禁用灰度测试"
        min={1}
        max={node.currentVersion}
      />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text-primary">测试用户 ID（每行一个）</label>
        <textarea
          value={userIds}
          onChange={(e) => setUserIds(e.target.value)}
          rows={4}
          className="w-full rounded-md border border-border bg-bg-base px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary resize-y"
          placeholder="user_id_1&#10;user_id_2"
        />
      </div>

      <div className="flex gap-2">
        <Button variant="primary" size="sm" onClick={handleSave} disabled={isPending}>
          {isPending ? '保存中...' : '保存配置'}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleClear} disabled={isPending}>
          清除
        </Button>
      </div>

      {node.testVersion && (
        <p className="text-xs text-warning bg-warning-subtle px-3 py-2 rounded-md">
          当前灰度版本: v{node.testVersion}，影响 {node.testUserIds.length} 个用户
        </p>
      )}
    </div>
  );
}
