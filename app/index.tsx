import { Redirect } from 'expo-router';

export default function Index() {
  // Navigation guard is handled cleanly at the RootLayout (_layout.tsx)
  // If the user reaches this root path, it means they are authenticated.
  return <Redirect href="/(tabs)" />;
}
