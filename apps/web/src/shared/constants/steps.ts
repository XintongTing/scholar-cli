export const STEPS = {
  OUTLINE: 'OUTLINE',
  LITERATURE: 'LITERATURE',
  MATERIALS: 'MATERIALS',
  GENERATING: 'GENERATING',
  EDITING: 'EDITING',
  COMPLETED: 'COMPLETED',
} as const;

export type Step = keyof typeof STEPS;

export const STEP_LABELS: Record<Step, string> = {
  OUTLINE: '大纲',
  LITERATURE: '文献',
  MATERIALS: '素材',
  GENERATING: '生成',
  EDITING: '编辑',
  COMPLETED: '完成',
};

export const STEP_ORDER: Step[] = ['OUTLINE', 'LITERATURE', 'MATERIALS', 'GENERATING', 'EDITING', 'COMPLETED'];
