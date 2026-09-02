import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BrandMark } from '@/components/BrandMark';
import { APP_LOCKUP_NAME } from '@/constants/brand';
import type { AppThemeColors } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useIsDesktopWeb } from '@/hooks/useIsDesktopWeb';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  /** Defaults to hidden on desktop web, where the tab bar shows the lockup. */
  showBrand?: boolean;
};

export function ScreenHeader({
  title,
  subtitle,
  showBrand,
}: ScreenHeaderProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isDesktopWeb = useIsDesktopWeb();
  const shouldShowBrand = showBrand ?? !isDesktopWeb;

  return (
    <View>
      {shouldShowBrand ? (
        <View style={styles.brandRow}>
          <BrandMark accessible={false} size={18} />
          <Text style={styles.kicker}>{APP_LOCKUP_NAME}</Text>
        </View>
      ) : null}
      <Text
        accessibilityRole="header"
        style={[styles.title, !shouldShowBrand && styles.titleFlush]}
      >
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    kicker: {
      fontSize: 13,
      fontWeight: '600',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: colors.brandAccent,
    },
    title: {
      fontSize: 32,
      fontWeight: '700',
      marginTop: 8,
      color: colors.text,
    },
    titleFlush: {
      marginTop: 0,
    },
    subtitle: {
      fontSize: 16,
      lineHeight: 24,
      marginTop: 12,
      color: colors.textSecondary,
    },
  });
}
