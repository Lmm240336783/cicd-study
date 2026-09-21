import { useNavigate } from 'react-router-dom';
import { HOME_ROUTE } from '../appRoutes';
import { VoiceDebugPage } from './VoiceDebugPage';

export function VoiceDebugRoutePage() {
  const navigate = useNavigate();
  return <VoiceDebugPage onBack={() => navigate(HOME_ROUTE)} />;
}
