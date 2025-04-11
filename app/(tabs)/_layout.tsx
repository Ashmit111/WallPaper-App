import { Tabs } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#4169E1',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: {
          backgroundColor: '#121212',
          borderTopWidth: 0,
        },
        headerBackground: () => (
          <LinearGradient
            colors={["#1e3c72", "#2a5298"]}
            style={{ flex: 1 }}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        ),
        headerTitleStyle: {
          color: 'white',
          fontWeight: 'bold',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Wallpaper Gallery',
          tabBarIcon: ({ color }) => (
            <Ionicons name="images-outline" size={24} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="aigeneratedImage"
        options={{
          title: 'Create Wallpaper',
          tabBarIcon: ({ color }) => (
            <Ionicons name="sparkles-outline" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}