import * as editorService from '../../services/editor.service';

export async function getDocument(projectId: string) {
  return editorService.getDocument(projectId);
}

export async function saveDocument(projectId: string, content: Record<string, unknown>) {
  return editorService.saveDocument(projectId, content);
}

export async function exportDocx(projectId: string) {
  return editorService.exportDocx(projectId);
}
