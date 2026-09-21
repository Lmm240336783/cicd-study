import { useNavigate } from 'react-router-dom';
import { HOME_ROUTE } from '../appRoutes';
import { ImageGeneratorPanel } from './ImageGeneratorPanel';

export function ImageRoutePage() {
  const navigate = useNavigate();

  return (
    <main className="mode-shell image-page">
      <div className="image-page-header">
        <button className="back-button image-back-button" type="button" onClick={() => navigate(HOME_ROUTE)}>返回</button>
      </div>
      <ImageGeneratorPanel />
    </main>
  );
}
