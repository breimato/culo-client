import { SessionBootstrap } from './components/SessionBootstrap';
import { AppRouter } from './router';

export function App() {
  return (
    <>
      <SessionBootstrap />
      <AppRouter />
    </>
  );
}
