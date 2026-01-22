import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  variant?: 'pulse' | 'shimmer';
  showCheckbox?: boolean;
  showActions?: boolean;
}

export function TableSkeleton({ 
  rows = 5, 
  columns = 4, 
  variant = 'shimmer',
  showCheckbox = false,
  showActions = true 
}: TableSkeletonProps) {
  const totalColumns = columns + (showCheckbox ? 1 : 0) + (showActions ? 1 : 0);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {showCheckbox && (
              <TableHead className="w-12">
                <Skeleton variant={variant} className="h-4 w-4" />
              </TableHead>
            )}
            {Array.from({ length: columns }).map((_, i) => (
              <TableHead key={i}>
                <Skeleton variant={variant} className="h-4 w-20" />
              </TableHead>
            ))}
            {showActions && (
              <TableHead className="w-20">
                <Skeleton variant={variant} className="h-4 w-12" />
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, row) => (
            <TableRow key={row}>
              {showCheckbox && (
                <TableCell>
                  <Skeleton variant={variant} className="h-4 w-4" />
                </TableCell>
              )}
              {Array.from({ length: columns }).map((_, col) => (
                <TableCell key={col}>
                  {col === 0 ? (
                    <div className="flex items-center gap-3">
                      <Skeleton variant={variant} shape="circle" className="h-8 w-8" />
                      <div className="space-y-1">
                        <Skeleton variant={variant} className="h-4 w-24" />
                        <Skeleton variant={variant} className="h-3 w-32" />
                      </div>
                    </div>
                  ) : (
                    <Skeleton variant={variant} className="h-4 w-full max-w-[100px]" />
                  )}
                </TableCell>
              ))}
              {showActions && (
                <TableCell>
                  <div className="flex gap-2">
                    <Skeleton variant={variant} className="h-8 w-8 rounded-md" />
                    <Skeleton variant={variant} className="h-8 w-8 rounded-md" />
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Skeleton per DataTable con search bar
export function DataTableSkeleton({
  rows = 5,
  columns = 4,
  variant = 'shimmer',
  showSearch = true,
}: TableSkeletonProps & { showSearch?: boolean }) {
  return (
    <div className="space-y-4">
      {showSearch && (
        <div className="flex items-center justify-between gap-4">
          <Skeleton variant={variant} className="h-10 w-64 rounded-md" />
          <Skeleton variant={variant} className="h-10 w-32 rounded-md" />
        </div>
      )}
      <TableSkeleton rows={rows} columns={columns} variant={variant} showCheckbox showActions />
      <div className="flex items-center justify-between">
        <Skeleton variant={variant} className="h-4 w-40" />
        <div className="flex gap-2">
          <Skeleton variant={variant} className="h-8 w-8 rounded-md" />
          <Skeleton variant={variant} className="h-8 w-8 rounded-md" />
          <Skeleton variant={variant} className="h-8 w-8 rounded-md" />
        </div>
      </div>
    </div>
  );
}
