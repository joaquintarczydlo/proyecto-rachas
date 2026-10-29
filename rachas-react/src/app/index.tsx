import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { listarDesafios } from '@/services/desafios';
import type { Desafio } from '@/types/desafio';

const ESTADO_COLOR: Record<Desafio['estado'], string> = {
  PROGRAMADO: '#3b82f6',
  ACTIVO: '#22c55e',
  FINALIZADO: '#6b7280',
  CANCELADO: '#ef4444',
};

const CATEGORIA_LABEL: Record<Desafio['categoria'], string> = {
  SALUD: 'Salud',
  ESTUDIO: 'Estudio',
  FINANZAS: 'Finanzas',
  BIENESTAR: 'Bienestar',
  OTRO: 'Otro',
};

export default function DesafiosScreen() {
  const theme = useTheme();
  const [desafios, setDesafios] = useState<Desafio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const data = await listarDesafios();
      setDesafios(data);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'No se pudo conectar con el servidor.',
      );
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const onRefresh = useCallback(() => {
    setRefrescando(true);
    cargar();
  }, [cargar]);

  if (cargando) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" color={theme.text} />
        <ThemedText themeColor="textSecondary">Cargando desafíos…</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText type="subtitle">Error</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.errorText}>
          {error}
        </ThemedText>
        <Pressable
          style={[styles.retryButton, { backgroundColor: theme.backgroundElement }]}
          onPress={() => {
            setCargando(true);
            cargar();
          }}>
          <ThemedText type="smallBold">Reintentar</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={desafios}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <ThemedText type="title" style={styles.title}>
            Desafíos
          </ThemedText>
        }
        ListEmptyComponent={
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            No hay desafíos disponibles.
          </ThemedText>
        }
        renderItem={({ item }) => (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold" style={styles.cardTitle}>
              {item.nombre}
            </ThemedText>
            <ThemedView style={styles.row}>
              <ThemedText type="small" themeColor="textSecondary">
                Categoría:
              </ThemedText>
              <ThemedText type="small">
                {CATEGORIA_LABEL[item.categoria] ?? item.categoria}
              </ThemedText>
            </ThemedView>
            <ThemedView style={styles.row}>
              <ThemedText type="small" themeColor="textSecondary">
                Estado:
              </ThemedText>
              <ThemedText
                type="small"
                style={{ color: ESTADO_COLOR[item.estado] ?? theme.text }}>
                {item.estado}
              </ThemedText>
            </ThemedView>
            <ThemedView style={styles.row}>
              <ThemedText type="small" themeColor="textSecondary">
                Fechas:
              </ThemedText>
              <ThemedText type="small">
                {item.fechaInicio} → {item.fechaFin}
              </ThemedText>
            </ThemedView>
          </ThemedView>
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  errorText: {
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    marginTop: Spacing.two,
  },
  title: {
    marginBottom: Spacing.three,
  },
  list: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
  },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  cardTitle: {
    fontSize: 18,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.one,
    alignItems: 'center',
  },
  empty: {
    textAlign: 'center',
    marginTop: Spacing.five,
  },
});
