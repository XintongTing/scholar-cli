import * as adminService from '../../services/admin.service';

export async function listNodes() {
  return adminService.listNodes();
}

export async function getNode(nodeId: string) {
  return adminService.getNode(nodeId);
}

export async function updateContent(nodeId: string, content: string) {
  return adminService.updateContent(nodeId, content);
}

export async function rollback(nodeId: string, targetVersion: number) {
  return adminService.rollback(nodeId, targetVersion);
}

export async function setTestVersion(nodeId: string, version: number | null, testUserIds: string[]) {
  return adminService.setTestVersion(nodeId, version, testUserIds);
}

export async function getMetrics(nodeId: string) {
  return adminService.getMetrics(nodeId);
}
