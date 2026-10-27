import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HealthScreen } from '../../features/health';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Health" component={HealthScreen} options={{ title: 'ConnectMe' }} />
    </Stack.Navigator>
  );
}
