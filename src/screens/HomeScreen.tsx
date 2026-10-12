import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { WatermarkRemover } from '../native/WatermarkRemover';
import { colors, radius, spacing } from '../theme';

interface Props {
  onImagePicked: (uri: string) => void;
}

export default function HomeScreen({ onImagePicked }: Props) {
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    setPicking(true);
    setError(null);
    try {
      const uri = await WatermarkRemover.pickImage();
      if (uri) {
        onImagePicked(uri);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to import image');
    } finally {
      setPicking(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>CleanText</Text>
        <Text style={styles.subtitle}>
          Remove unwanted text overlays from your photos — entirely on your device.
        </Text>
      </View>

      <View style={styles.offlineBadge}>
        <View style={styles.dot} />
        <Text style={styles.offlineText}>100% offline · no account · no uploads</Text>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        style={[styles.importButton, picking && styles.buttonDisabled]}
        onPress={handleImport}
        disabled={picking}
      >
        {picking ? (
          <ActivityIndicator color={colors.onAccent} />
        ) : (
          <Text style={styles.importText}>Import Image</Text>
        )}
      </Pressable>

      <Text style={styles.hint}>
        CleanText detects text on-device and reconstructs the background with classical
        inpainting. Results vary with complex backgrounds.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  hero: {
    marginBottom: spacing.xxl,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 17,
    lineHeight: 24,
    marginTop: spacing.md,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginRight: spacing.sm,
  },
  offlineText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    marginBottom: spacing.lg,
  },
  importButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  importText: {
    color: colors.onAccent,
    fontSize: 17,
    fontWeight: '700',
  },
  hint: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});
