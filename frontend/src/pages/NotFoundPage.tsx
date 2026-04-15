import { Link } from 'react-router-dom';
import { ROUTES } from 'app/router/routes';

export function NotFoundPage() {
  return (
    <div className="py-16 text-center">
      <div className="text-6xl font-extrabold text-brand-bright mb-2">404</div>
      <div className="text-muted mb-6">Aradiginiz sayfa bulunamadi</div>
      <Link to={ROUTES.tasks} className="text-brand hover:text-brand-bright underline">
        Gorevlere don
      </Link>
    </div>
  );
}
