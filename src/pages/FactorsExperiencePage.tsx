import { getCurrentUser } from '../services/auth';
import { isPlatformAdmin } from '../utils/permissions';
import { ConversionFactorsPage } from './ConversionFactorsPage';
import { CustomerMethodologyFactorsPage } from './CustomerMethodologyFactorsPage';

export function FactorsExperiencePage() {
  return isPlatformAdmin(getCurrentUser())
    ? <ConversionFactorsPage />
    : <CustomerMethodologyFactorsPage />;
}
