import livellappLogo from '@/assets/livellapp-logo.svg';
import livellappIcon from '@/assets/livellapp-icon.svg';

interface LogoProps {
  variant?: 'full' | 'icon';
  className?: string;
}

export function Logo({ variant = 'full', className = '' }: LogoProps) {
  return (
    <img 
      src={variant === 'full' ? livellappLogo : livellappIcon} 
      alt="LIVEL APP"
      className={className}
    />
  );
}

export default Logo;
