import { Outlet } from 'react-router-dom';
import { ErrorBoundary } from 'shared/ui/ErrorBoundary';
import { CommandPalette } from 'features/command/CommandPalette';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-navy-950">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-[1200px] mx-auto">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
