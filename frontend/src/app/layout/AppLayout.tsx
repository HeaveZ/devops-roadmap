import { Outlet } from 'react-router-dom';
import { ErrorBoundary } from 'shared/ui/ErrorBoundary';
import { Header } from './Header';
import { Footer } from './Footer';

export function AppLayout() {
  return (
    <div className="relative min-h-screen">
      <div className="grid-bg" />
      <div className="relative z-10 max-w-[960px] mx-auto px-6 py-9">
        <Header />
        <main>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
        <Footer />
      </div>
    </div>
  );
}
