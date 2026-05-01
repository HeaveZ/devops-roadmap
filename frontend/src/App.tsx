import { AppProviders } from 'app/providers/AppProviders';
import { AppRouter } from 'app/router/AppRouter';
import { CommandPalette } from 'features/command/CommandPalette';

export default function App() {
  return (
    <AppProviders>
      <AppRouter />
      <CommandPalette />
    </AppProviders>
  );
}
