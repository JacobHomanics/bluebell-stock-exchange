import { Ionicons } from '@expo/vector-icons';
import {
  BottomTabBar,
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { Platform, StyleSheet, View } from 'react-native';

import { BrandLockup } from '@/components/BrandLockup';
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

function DesktopTabBar(props: BottomTabBarProps) {
  const { colors } = useAppTheme();

  return (
    <View
      style={[
        styles.desktopChrome,
        {
          backgroundColor: colors.tabBarBackground,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.desktopBrand}>
        <BrandLockup size="sm" />
      </View>
      <View style={styles.desktopTabs}>
        <BottomTabBar {...props} />
      </View>
    </View>
  );
}

export function MainTabs() {
  const isDesktopWeb = useIsDesktopWeb();
  const { isAuthenticated } = useAuth();
  const { colors } = useAppTheme();

  return (
    <Tab.Navigator
      initialRouteName="home"
      tabBar={isDesktopWeb ? (props) => <DesktopTabBar {...props} /> : undefined}
      screenOptions={{
        headerShown: false,
        animation: isDesktopWeb ? 'none' : 'shift',
        tabBarPosition: isDesktopWeb ? 'top' : 'bottom',
        tabBarActiveTintColor: colors.brandAccent,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelVisibilityMode: isDesktopWeb ? 'labeled' : 'unlabeled',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        tabBarStyle: {
          backgroundColor: isDesktopWeb
            ? 'transparent'
            : colors.tabBarBackground,
          borderTopColor: isDesktopWeb ? 'transparent' : colors.border,
          borderBottomColor: isDesktopWeb ? 'transparent' : colors.border,
          borderTopWidth: isDesktopWeb ? 0 : StyleSheet.hairlineWidth,
          borderBottomWidth: isDesktopWeb ? 0 : undefined,
          elevation: isDesktopWeb ? 0 : undefined,
        },
        tabBarItemStyle: isDesktopWeb
          ? { flexGrow: 0, flexBasis: 'auto', width: 108 }
          : undefined,
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
          tabBarAccessibilityLabel: 'Home',
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
          tabBarAccessibilityLabel: 'Explore',
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
          tabBarAccessibilityLabel: isAuthenticated ? 'Profile' : 'Sign in',
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

const styles = StyleSheet.create({
  desktopChrome: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingLeft: 20,
  },
  desktopBrand: {
    marginRight: 12,
  },
  desktopTabs: {
    flex: 1,
  },
});
