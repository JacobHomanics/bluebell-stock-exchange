// Import required polyfills first (Privy)
import 'fast-text-encoding';
import 'react-native-get-random-values';
import '@ethersproject/shims';

import 'react-native-gesture-handler';
import '@expo/metro-runtime';
import { registerRootComponent } from 'expo';

import App from './App';

registerRootComponent(App);
