import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { WatermarkRemover } from '../native/WatermarkRemover';
import { colors, radius, spacing } from '../theme';

interface Props {
  visible: boolean;
  outputUri: string | null;
  onClose: () => void;
}

/**
 * Bottom sheet for exporting a processed image to the gallery. Uses MediaStore on
 * the native side (no broad storage permission on API 29+).
 */
export default function ExportSheet({ visible, outputUri, onClose }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setSaving(false);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSave = async () => {
    if (!outputUri) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await WatermarkRemover.exportImage(outputUri);
      reset();
      onClose();
    } catch (e) {
      setSaving(false);
      setError(e instanceof Error ? e.message : 'Export failed');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={saving ? undefined : handleClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.grabber} />
          <Text style={styles.title}>Save Image</Text>
          <Text style={styles.subtitle}>
            The processed image is saved to your gallery. The original is never modified.
          </Text>
          {error && <Text style={styles.error}>{error}</Text>}
          <Pressable
            style={[styles.saveButton, saving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <Text style={styles.saveText}>Save to Gallery</Text>
            )}
          </Pressable>
          <Pressable style={styles.cancelButton} onPress={handleClose} disabled={saving}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: spacing.md,
  },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveText: {
    color: colors.onAccent,
    fontSize: 15,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  cancelText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
});
