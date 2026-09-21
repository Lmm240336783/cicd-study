import { useNavigate } from 'react-router-dom';
import { HOME_ROUTE } from '../appRoutes';
import { SlotGame } from './SlotGame';

export function SlotRoutePage() {
  const navigate = useNavigate();
  return <SlotGame onBack={() => navigate(HOME_ROUTE)} />;
}
