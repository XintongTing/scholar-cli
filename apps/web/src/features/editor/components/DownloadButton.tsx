import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '../../../shared/components/Button';
import { exportToDocx } from '../utils/exportDocx';
import * as api from '../api';

interface DownloadButtonProps {
  projectId: string;
  filename?: string;
}

export function DownloadButton({ projectId, filename = 'paper.docx' }: DownloadButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const result = await api.exportDocx(projectId);
      await exportToDocx(result.content as Record<string, unknown>, filename);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="secondary" size="md" onClick={handleDownload} disabled={loading}>
      <Download size={16} strokeWidth={1.5} />
      {loading ? '导出中...' : '导出 Word'}
    </Button>
  );
}
