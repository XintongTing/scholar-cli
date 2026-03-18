import { FileDropzone } from '../../../shared/components/FileDropzone';
import { useUploadLiterature } from '../hooks/useLiterature';
import { Spinner } from '../../../shared/components/Spinner';

interface LiteratureUploadProps {
  projectId: string;
}

export function LiteratureUpload({ projectId }: LiteratureUploadProps) {
  const { mutate: upload, isPending } = useUploadLiterature(projectId);

  function handleDrop(files: File[]) {
    files.forEach((file) => upload(file));
  }

  return (
    <div className="relative">
      <FileDropzone
        onDrop={handleDrop}
        accept={{ 'application/pdf': ['.pdf'] }}
        multiple
        disabled={isPending}
        label="拖拽 PDF 文件到此处，或点击选择（支持多文件）"
      />
      {isPending && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg-base/70 rounded-lg">
          <Spinner size="md" />
        </div>
      )}
    </div>
  );
}
