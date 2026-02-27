import { useAppState } from './hooks/useAppState';
import { HomeView } from './views/HomeView';
import { ScannerView } from './views/ScannerView';
import { AgentChatView } from './views/AgentChatView';
import { OrderCardView } from './views/OrderCardView';
import { WaiterModeView } from './views/WaiterModeView';
import { ExploreView } from './views/ExploreView';
import { SettingsView } from './views/SettingsView';

function ViewRouter() {
  const { state } = useAppState();

  switch (state.currentView) {
    case 'home':
      return <HomeView />;
    case 'scanner':
      return <ScannerView isSupplementing={state.isSupplementing} />;
    case 'chat':
      return <AgentChatView />;
    case 'order':
      return <OrderCardView />;
    case 'waiter':
      return <WaiterModeView />;
    case 'explore':
      return <ExploreView />;
    case 'settings':
      return <SettingsView />;
  }
}

export default function App() {
  return <ViewRouter />;
}
