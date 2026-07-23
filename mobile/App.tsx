import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

// Use 10.0.2.2 for Android emulator, localhost for iOS simulator,
// or your machine's LAN IP / ngrok URL for a physical device.
const API_BASE = 'http://10.0.2.2:8080';

interface Medicine {
  id: string;
  name: string;
  quantity: number;
}

export default function App() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/medicines`)
      .then((res: Response) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((body: Medicine[]) => setMedicines(body))
      .catch((err: any) => setError(err.message));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Medicines</Text>
      {error ? (
        <Text style={styles.error}>Could not load: {error}</Text>
      ) : (
        <FlatList
          data={medicines}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <Text style={styles.item}>
              {item.name} – {item.quantity}
            </Text>
          )}
          style={{ width: '100%' }}
        />
      )}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  item: {
    fontSize: 16,
    paddingVertical: 8,
  },
  error: {
    color: 'red',
  },
});
