import * as generationService from '../../services/generation.service';

export async function pauseGeneration(projectId: string) {
  return generationService.pauseGeneration(projectId);
}

export function getGenerationUrl(projectId: string) {
  return generationService.getGenerationUrl(projectId);
}
