import { createApp, defineComponent, h } from 'vue';
import DiscoveryPage from './DiscoveryPage.vue';
import { useShellRouter } from '../../router/shell-router';
// Development entry reuses the Shell controller; no second route parser/listener.
createApp(defineComponent({ setup() {
  const router = useShellRouter();
  if (!window.location.hash) router.navigate('/discover', true);
  return () => h(DiscoveryPage, { route: router.route.value, onNavigate: router.navigate });
} })).mount('#app');
