import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';
import { cn } from '../utils/cn';

interface FileDropzoneProps {
  onDrop: (files: File[]) => void;
  accept?: Record<string, string[]>;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  label?: string;
}

export function FileDropzone({
  onDrop,
  accept,
  multiple = false,
  disabled = false,
  className,
  label = '拖拽文件到此处，或点击选择',
}: FileDropzoneProps) {
  const handleDrop = useCallback(
    (acceptedFiles: File[]) => {
      onDrop(acceptedFiles);
    },
    [onDrop],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept,
    multiple,
    disabled,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-8 cursor-pointer transition-colors',
        isDragActive && 'border-primary bg-primary-subtle',
        !isDragActive && 'hover:border-border-strong hover:bg-bg-subtle',
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
    >
      <input {...getInputProps()} />
      <Upload size={24} strokeWidth={1.5} className="text-text-tertiary" />
      <p className="text-sm text-text-secondary text-center">{label}</p>
    </div>
  );
}
