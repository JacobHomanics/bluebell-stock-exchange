import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, View } from 'react-native';

import { useAppTheme } from '@/hooks/useAppTheme';
import { useAuth } from '@/hooks/useAuth';
import { useIsDesktopWeb } from '@/hooks/useIsDesktopWeb';
import type { MainTabParamList } from '@/navigation/types';
import { ExploreScreen } from '@/screens/ExploreScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

function AuthTabPlaceholder() {
  return <View />;
}

export function MainTabs() {
  const isDesktopWeb = useIsDesktopWeb();
  const { isAuthenticated } = useAuth();
  const { colors } = useAppTheme();

  return (
    <Tab.Navigator
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        animation: isDesktopWeb ? 'none' : 'shift',
        tabBarPosition: isDesktopWeb ? 'top' : 'bottom',
        tabBarActiveTintColor: colors.brandAccent,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderTopColor: colors.border,
          borderBottomColor: colors.border,
        },
        sceneStyle:
          Platform.OS === 'web'
            ? { flex: 1, minHeight: 0, backgroundColor: colors.background }
            : { backgroundColor: colors.background },
      }}
    >
      <Tab.Screen
        name="home"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? 'stats-chart' : 'stats-chart-outline'}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tab.Screen
        name="explore"
        component={ExploreScreen}
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? 'search' : 'search-outline'}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tab.Screen
        name="profile"
        component={isAuthenticated ? ProfileScreen : AuthTabPlaceholder}
        options={{
          title: isAuthenticated ? 'Profile' : 'Sign in',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              color={color}
              size={size}
            />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (event) => {
            if (isAuthenticated) {
              return;
            }

            event.preventDefault();
            navigation.getParent()?.navigate('login');
          },
        })}
      />
    </Tab.Navigator>
  );
}
