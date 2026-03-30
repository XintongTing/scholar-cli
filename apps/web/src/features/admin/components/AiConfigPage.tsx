import axios from 'axios';
import { useEffect, useState } from 'react';
import { getAiConfig, updateAiConfig } from '../../../services/admin.service';
import type { AiConfig } from '../../../services/admin.service';
import { Button } from '../../../shared/components/Button';
import { Spinner } from '../../../shared/components/Spinner';

function sourceLabel(source: AiConfig['apiKeySource']) {
  if (source === 'database') return '数据库';
  if (source === 'env') return '环境变量';
  return '未设置';
}

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error?.message || fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function AiConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<AiConfig | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const loadConfig = async (successMessage?: string) => {
    try {
      const data = await getAiConfig();
      setConfig(data);
      setBaseUrl(data.baseUrl || '');
      if (successMessage) {
        setMessageType('success');
        setMessage(successMessage);
      }
    } catch (error) {
      setMessageType('error');
      setMessage(getErrorMessage(error, '读取 AI 配置失败，请刷新后重试。'));
    }
  };

  useEffect(() => {
    loadConfig().finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await updateAiConfig({
        apiKey: apiKey.trim() ? apiKey.trim() : undefined,
        baseUrl: baseUrl.trim(),
      });
      setApiKey('');
      await loadConfig('AI 配置已保存并重新加载。');
    } catch (error) {
      setMessageType('error');
      setMessage(getErrorMessage(error, '保存 AI 配置失败，请稍后重试。'));
    } finally {
      setSaving(false);
    }
  };

  const handleResetToEnv = async () => {
    setSaving(true);
    setMessage('');
    try {
      await updateAiConfig({
        apiKey: '',
        baseUrl: '',
      });
      setApiKey('');
      await loadConfig('已清除数据库覆盖配置，当前回退使用环境变量。');
    } catch (error) {
      setMessageType('error');
      setMessage(getErrorMessage(error, '恢复环境变量失败，请稍后重试。'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Spinner size="lg" /></div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary">AI 配置</h1>
        <p className="mt-1 text-sm text-text-secondary">在后台管理 Anthropic 的 API Key 与代理地址配置。</p>
      </div>

      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-white p-5">
          <div className="mb-4">
            <p className="text-sm font-medium text-text-primary">当前生效配置</p>
            <div className="mt-3 space-y-2 text-sm text-text-secondary">
              <p>API Key：{config?.hasApiKey ? config.apiKeyMasked : '未配置'} · 来源：{sourceLabel(config?.apiKeySource || 'unset')}</p>
              <p>Base URL：{config?.baseUrl || '未配置'} · 来源：{sourceLabel(config?.baseUrlSource || 'unset')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">ANTHROPIC_API_KEY</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={config?.apiKeyMasked ? `当前：${config.apiKeyMasked}` : '输入新的 API Key'}
                className="w-full rounded border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-text-tertiary">留空表示保持当前 Key 不变；点击“恢复环境变量”会删除数据库覆盖值。</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">ANTHROPIC_BASE_URL</label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="例如：https://code.ppchat.vip"
                className="w-full rounded border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-text-tertiary">这里填写根地址即可，比如 `https://code.ppchat.vip`。系统会自动拼接 `/v1/messages`，不需要手动填写完整接口路径。</p>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存配置'}
            </Button>
            <Button variant="secondary" onClick={handleResetToEnv} disabled={saving}>
              恢复环境变量
            </Button>
            {message && (
              <span className={`text-sm ${messageType === 'error' ? 'text-red-600' : 'text-text-secondary'}`}>
                {message}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
