import { useNavigate } from 'react-router-dom';
import { HOME_ROUTE } from '../appRoutes';
import { DiceGame } from './DiceGame';

export function DiceRoutePage() {
  const navigate = useNavigate();
  return <DiceGame onBack={() => navigate(HOME_ROUTE)} />;
}
