import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface CardSkeletonProps {
  variant?: 'pulse' | 'shimmer';
}

// Card utente con avatar e info
export function UserCardSkeleton({ variant = 'shimmer' }: CardSkeletonProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-center gap-4 p-4">
        <Skeleton variant={variant} shape="circle" className="h-12 w-12 shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton variant={variant} className="h-4 w-32" />
          <Skeleton variant={variant} className="h-3 w-48" />
        </div>
      </CardContent>
    </Card>
  );
}

// Card PT con rating e specializzazioni
export function PTCardSkeleton({ variant = 'shimmer' }: CardSkeletonProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start gap-4">
          <Skeleton variant={variant} shape="circle" className="h-16 w-16 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton variant={variant} className="h-5 w-40" />
            <Skeleton variant={variant} className="h-3 w-24" />
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} variant={variant} className="h-4 w-4" />
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton variant={variant} className="h-6 w-20 rounded-full" />
          <Skeleton variant={variant} className="h-6 w-24 rounded-full" />
          <Skeleton variant={variant} className="h-6 w-16 rounded-full" />
        </div>
        <div className="flex justify-between items-center pt-2">
          <Skeleton variant={variant} className="h-5 w-24" />
          <Skeleton variant={variant} className="h-9 w-28 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

// Card KPI per dashboard
export function KPICardSkeleton({ variant = 'shimmer' }: CardSkeletonProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton variant={variant} className="h-4 w-24" />
          <Skeleton variant={variant} className="h-8 w-8 rounded-md" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton variant={variant} className="h-8 w-20 mb-2" />
        <Skeleton variant={variant} className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

// Card workout
export function WorkoutCardSkeleton({ variant = 'shimmer' }: CardSkeletonProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton variant={variant} className="h-5 w-40" />
          <Skeleton variant={variant} className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton variant={variant} className="h-3 w-28" />
        <div className="flex items-center gap-4 pt-2">
          <Skeleton variant={variant} className="h-4 w-20" />
          <Skeleton variant={variant} className="h-4 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

// Card chat
export function ChatCardSkeleton({ variant = 'shimmer' }: CardSkeletonProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-center gap-3 p-4">
        <Skeleton variant={variant} shape="circle" className="h-12 w-12 shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Skeleton variant={variant} className="h-4 w-28" />
            <Skeleton variant={variant} className="h-3 w-12" />
          </div>
          <Skeleton variant={variant} className="h-3 w-full max-w-[200px]" />
        </div>
      </CardContent>
    </Card>
  );
}

// Card evento calendario
export function EventCardSkeleton({ variant = 'shimmer' }: CardSkeletonProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-3">
          <Skeleton variant={variant} className="h-10 w-10 rounded-md" />
          <div className="flex-1 space-y-1">
            <Skeleton variant={variant} className="h-4 w-32" />
            <Skeleton variant={variant} className="h-3 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Card stats compatta
export function StatsCardSkeleton({ variant = 'shimmer' }: CardSkeletonProps) {
  return (
    <Card>
      <CardContent className="p-4 text-center space-y-2">
        <Skeleton variant={variant} className="h-8 w-12 mx-auto" />
        <Skeleton variant={variant} className="h-3 w-16 mx-auto" />
      </CardContent>
    </Card>
  );
}
