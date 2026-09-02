import * as WebBrowser from 'expo-web-browser';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useWebViewportHeightFix } from '@/hooks/useWebViewportHeightFix';
import { AuthFlowProvider } from '@/lib/privy/context/AuthFlowContext';
import { RootNavigator } from '@/navigation/RootNavigator';
import { PrivyProvider } from '@/providers/PrivyProvider';

WebBrowser.maybeCompleteAuthSession();

export default function App() {
  useWebViewportHeightFix();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PrivyProvider>
          <AuthFlowProvider>
            <RootNavigator />
          </AuthFlowProvider>
        </PrivyProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
