import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ProfileSkeletonProps {
  variant?: 'pulse' | 'shimmer';
}

// Skeleton per pagina profilo completa (Atleta/PT)
export function ProfilePageSkeleton({ variant = 'shimmer' }: ProfileSkeletonProps) {
  return (
    <div className="space-y-6 p-4">
      {/* Header con avatar grande */}
      <div className="flex flex-col items-center gap-4 text-center">
        <Skeleton variant={variant} shape="circle" className="h-24 w-24" />
        <div className="space-y-2">
          <Skeleton variant={variant} className="h-6 w-48 mx-auto" />
          <Skeleton variant={variant} className="h-4 w-32 mx-auto" />
        </div>
        <Skeleton variant={variant} className="h-6 w-20 rounded-full" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-3 text-center space-y-1">
              <Skeleton variant={variant} className="h-6 w-10 mx-auto" />
              <Skeleton variant={variant} className="h-3 w-14 mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} variant={variant} className="h-8 w-20 rounded-md" />
        ))}
      </div>

      {/* Content cards */}
      <div className="space-y-4">
        <Skeleton variant={variant} className="h-32 w-full rounded-lg" />
        <Skeleton variant={variant} className="h-24 w-full rounded-lg" />
      </div>
    </div>
  );
}

// Skeleton per header profilo compatto
export function ProfileHeaderSkeleton({ variant = 'shimmer' }: ProfileSkeletonProps) {
  return (
    <div className="flex items-center gap-4 p-4">
      <Skeleton variant={variant} shape="circle" className="h-16 w-16 shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton variant={variant} className="h-5 w-40" />
        <Skeleton variant={variant} className="h-4 w-28" />
        <div className="flex gap-2">
          <Skeleton variant={variant} className="h-5 w-16 rounded-full" />
          <Skeleton variant={variant} className="h-5 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// Skeleton per sezione statistiche profilo
export function ProfileStatsSkeleton({ variant = 'shimmer' }: ProfileSkeletonProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="text-center p-4 rounded-lg bg-muted/30 space-y-2">
          <Skeleton variant={variant} className="h-8 w-12 mx-auto" />
          <Skeleton variant={variant} className="h-3 w-16 mx-auto" />
        </div>
      ))}
    </div>
  );
}

// Skeleton per profilo PT pubblico
export function PTProfilePageSkeleton({ variant = 'shimmer' }: ProfileSkeletonProps) {
  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex gap-4">
        <Skeleton variant={variant} shape="circle" className="h-20 w-20 shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton variant={variant} className="h-6 w-48" />
          <div className="flex items-center gap-2">
            <Skeleton variant={variant} className="h-4 w-4" />
            <Skeleton variant={variant} className="h-4 w-24" />
          </div>
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} variant={variant} className="h-4 w-4" />
            ))}
            <Skeleton variant={variant} className="h-4 w-16 ml-2" />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 text-center space-y-1">
              <Skeleton variant={variant} className="h-6 w-12 mx-auto" />
              <Skeleton variant={variant} className="h-3 w-16 mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Specializzazioni */}
      <div className="space-y-3">
        <Skeleton variant={variant} className="h-5 w-32" />
        <div className="flex flex-wrap gap-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} variant={variant} className="h-7 w-24 rounded-full" />
          ))}
        </div>
      </div>

      {/* Bio */}
      <div className="space-y-3">
        <Skeleton variant={variant} className="h-5 w-24" />
        <Skeleton variant={variant} className="h-4 w-full" />
        <Skeleton variant={variant} className="h-4 w-full" />
        <Skeleton variant={variant} className="h-4 w-3/4" />
      </div>

      {/* Gallery */}
      <div className="space-y-3">
        <Skeleton variant={variant} className="h-5 w-28" />
        <div className="grid grid-cols-3 gap-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} variant={variant} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>

      {/* CTA fisso */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="space-y-1">
            <Skeleton variant={variant} className="h-4 w-20" />
            <Skeleton variant={variant} className="h-6 w-28" />
          </div>
          <Skeleton variant={variant} className="h-12 w-36 rounded-md" />
        </div>
      </div>
    </div>
  );
}

// Skeleton per dashboard home
export function DashboardSkeleton({ variant = 'shimmer' }: ProfileSkeletonProps) {
  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton variant={variant} shape="circle" className="h-10 w-10" />
          <div className="space-y-1">
            <Skeleton variant={variant} className="h-4 w-24" />
            <Skeleton variant={variant} className="h-5 w-32" />
          </div>
        </div>
        <Skeleton variant={variant} className="h-10 w-10 rounded-full" />
      </div>

      {/* Week Calendar */}
      <div className="flex gap-2 overflow-hidden">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="flex-1 text-center space-y-1">
            <Skeleton variant={variant} className="h-3 w-8 mx-auto" />
            <Skeleton variant={variant} className="h-10 w-10 mx-auto rounded-full" />
          </div>
        ))}
      </div>

      {/* Today's Workout */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton variant={variant} className="h-5 w-36" />
            <Skeleton variant={variant} className="h-6 w-16 rounded-full" />
          </div>
          <Skeleton variant={variant} className="h-4 w-24" />
          <div className="flex gap-4">
            <Skeleton variant={variant} className="h-4 w-20" />
            <Skeleton variant={variant} className="h-4 w-16" />
          </div>
          <Skeleton variant={variant} className="h-10 w-full rounded-md" />
        </CardContent>
      </Card>

      {/* Progress Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-3 text-center space-y-1">
              <Skeleton variant={variant} className="h-4 w-4 mx-auto" />
              <Skeleton variant={variant} className="h-5 w-10 mx-auto" />
              <Skeleton variant={variant} className="h-3 w-12 mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
