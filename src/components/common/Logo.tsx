import livelappMark from '@/assets/livelapp-mark.png';

interface LogoProps {
  variant?: 'full' | 'icon';
  className?: string;
}

export function Logo({ variant = 'full', className = '' }: LogoProps) {
  if (variant === 'icon') {
    return <img src={livelappMark} alt="Livelapp" className={className} />;
  }

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <img src={livelappMark} alt="Livelapp" className="h-full w-auto aspect-square rounded-md" />
      <span className="text-lg font-bold tracking-tight leading-none">Livelapp</span>
    </span>
  );
}

export default Logo;
