import { useState } from 'react';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { Textarea } from '../../../shared/components/Textarea';

const IDENTITY_TAGS = ['本科生', '硕士生', '博士生', '教师', '研究员', '其他'];
const PAPER_TYPES = ['学位论文', '期刊论文', '会议论文', '综述', '研究报告'];

interface OnboardingData {
  identity: string;
  paperType: string;
  field: string;
  goal: string;
}

interface OnboardingCardProps {
  onSubmit: (data: OnboardingData) => void;
}

export function OnboardingCard({ onSubmit }: OnboardingCardProps) {
  const [identity, setIdentity] = useState('');
  const [paperType, setPaperType] = useState('');
  const [field, setField] = useState('');
  const [goal, setGoal] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ identity, paperType, field, goal });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6 max-w-lg">
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-1">告诉我们关于您的研究</h2>
        <p className="text-sm text-text-secondary">这些信息将帮助 AI 更好地理解您的需求</p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-text-primary">您的身份</label>
        <div className="flex flex-wrap gap-2">
          {IDENTITY_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setIdentity(tag)}
              className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                identity === tag
                  ? 'bg-primary text-white border-primary'
                  : 'bg-bg-subtle text-text-secondary border-border hover:border-border-strong'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-text-primary">论文类型</label>
        <div className="flex flex-wrap gap-2">
          {PAPER_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setPaperType(type)}
              className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                paperType === type
                  ? 'bg-primary text-white border-primary'
                  : 'bg-bg-subtle text-text-secondary border-border hover:border-border-strong'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <Input
        label="研究领域"
        value={field}
        onChange={(e) => setField(e.target.value)}
        placeholder="例如：计算机科学、教育学、经济学..."
        required
      />

      <Textarea
        label="研究目标"
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        placeholder="简要描述您的研究目标和主要内容..."
        required
        rows={3}
      />

      <Button type="submit" variant="primary" disabled={!identity || !paperType || !field || !goal}>
        开始规划大纲
      </Button>
    </form>
  );
}
