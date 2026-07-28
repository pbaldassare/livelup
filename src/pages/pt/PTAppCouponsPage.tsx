import PTCouponsPage from './PTCouponsPage';
import { PTAppPageShell } from '@/components/app/PTAppPageShell';

export function PTAppCouponsPage() {
  return (
    <PTAppPageShell title="Coupon" description="Offerte e codici sconto per i tuoi atleti" showBack>
      <PTCouponsPage embedded />
    </PTAppPageShell>
  );
}

export default PTAppCouponsPage;
