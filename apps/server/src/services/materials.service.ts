import { randomUUID } from 'crypto';
import { prisma } from '../db.js';
import * as projectRepo from '../repositories/project.repository.js';
import { uploadFile } from './integrations/s3.service.js';

export const MATERIAL_QUESTIONS = [
  { key: 'research_data',   label: '研究数据/数据集',   description: '提供数据集可以让 AI 生成更准确的结果描述（Excel、CSV 等）' },
  { key: 'code_files',      label: '代码文件/实验结果', description: '上传代码或实验截图，AI 将在论文中准确描述实验过程' },
  { key: 'survey_data',     label: '问卷/调研数据',     description: '问卷原文或回收数据，用于生成调研分析部分' },
  { key: 'case_materials',  label: '案例资料/政策文件', description: '相关案例或政策文件，用于支撑论文论点' },
  { key: 'figures',         label: '图表素材',           description: '已有图表或图片素材，AI 将在合适位置引用' },
];

export function getQuestions() {
  return MATERIAL_QUESTIONS;
}

export async function getMaterials(projectId: string) {
  return prisma.material.findMany({
    where: { projectId },
    orderBy: { createdAt: 'asc' }
  });
}

export async function submitMaterial(
  projectId: string,
  questionKey: string,
  data: {
    file?: Buffer;
    filename?: string;
    contentType?: string;
    text?: string;
    skip?: boolean;
  }
) {
  const question = MATERIAL_QUESTIONS.find(q => q.key === questionKey);
  if (!question) throw Object.assign(new Error('问题不存在'), { code: 'NOT_FOUND' });

  let fileKey: string | undefined;
  if (data.file && data.filename) {
    fileKey = `projects/${projectId}/materials/${questionKey}/${randomUUID()}-${data.filename}`;
    await uploadFile(fileKey, data.file, data.contentType || 'application/octet-stream');
  }

  return prisma.material.upsert({
    where: { projectId_questionKey: { projectId, questionKey } },
    create: {
      projectId,
      questionKey,
      label: question.label,
      fileKey,
      textContent: data.text,
      skipped: data.skip ?? false
    },
    update: {
      fileKey,
      textContent: data.text,
      skipped: data.skip ?? false
    }
  });
}

export async function confirmMaterials(projectId: string) {
  await projectRepo.updateStatus(projectId, 'GENERATING');
  return projectRepo.findById(projectId);
}
