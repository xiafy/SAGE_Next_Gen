import { useAppState } from './hooks/useAppState';
import { HomeView } from './views/HomeView';
import { ScannerView } from './views/ScannerView';
import { AgentChatView } from './views/AgentChatView';
import { OrderCardView } from './views/OrderCardView';
import { WaiterModeView } from './views/WaiterModeView';
import { ExploreView } from './views/ExploreView';
import { SettingsView } from './views/SettingsView';
import { BottomNav } from './components/BottomNav';

const HIDE_NAV_VIEWS = new Set(['scanner', 'waiter']);

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
  const { state, dispatch } = useAppState();
  const showNav = !HIDE_NAV_VIEWS.has(state.currentView);
  const isZh = state.preferences.language === 'zh';

  return (
    <div className={showNav ? 'pb-20' : ''}>
      <ViewRouter />
      {showNav && (
        <BottomNav
          currentView={state.currentView}
          onNavigate={(view) => dispatch({ type: 'NAV_TO', view })}
          isZh={isZh}
          orderCount={state.orderItems.length}
        />
      )}
    </div>
  );
}
