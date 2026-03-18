import { cn } from '../utils/cn';

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
}

export function Skeleton({ className, width, height }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-bg-muted', className)}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}
