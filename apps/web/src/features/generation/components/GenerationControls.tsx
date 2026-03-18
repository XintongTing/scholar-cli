import { Pause, Play, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '../../../shared/components/Button';

interface GenerationControlsProps {
  status: 'idle' | 'generating' | 'paused' | 'completed' | 'error';
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
}

export function GenerationControls({ status, onStart, onPause, onResume }: GenerationControlsProps) {
  if (status === 'idle') {
    return (
      <Button variant="primary" size="md" onClick={onStart}>
        <Play size={16} strokeWidth={1.5} />
        开始生成
      </Button>
    );
  }

  if (status === 'generating') {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Loader2 size={14} strokeWidth={1.5} className="animate-spin text-primary" />
          生成中...
        </div>
        <Button variant="secondary" size="md" onClick={onPause}>
          <Pause size={16} strokeWidth={1.5} />
          暂停
        </Button>
      </div>
    );
  }

  if (status === 'paused') {
    return (
      <Button variant="primary" size="md" onClick={onResume}>
        <Play size={16} strokeWidth={1.5} />
        继续生成
      </Button>
    );
  }

  if (status === 'completed') {
    return (
      <div className="flex items-center gap-2 text-sm text-success">
        <CheckCircle size={16} strokeWidth={1.5} />
        生成完成
      </div>
    );
  }

  return null;
}
