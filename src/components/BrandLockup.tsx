import { StyleSheet, Text, View } from 'react-native';

import { BrandMark } from '@/components/BrandMark';
import { APP_LOCKUP_NAME, APP_TAGLINE } from '@/constants/brand';
import { useAppTheme } from '@/hooks/useAppTheme';

type BrandLockupSize = 'sm' | 'md' | 'lg';

type BrandLockupProps = {
  size?: BrandLockupSize;
  tone?: 'default' | 'onBrand';
  layout?: 'row' | 'stack';
  showTagline?: boolean;
};

const SIZE_TOKENS: Record<
  BrandLockupSize,
  { mark: number; name: number; tagline: number; gap: number }
> = {
  sm: { mark: 22, name: 15, tagline: 12, gap: 8 },
  md: { mark: 36, name: 20, tagline: 14, gap: 10 },
  lg: { mark: 64, name: 28, tagline: 16, gap: 14 },
};

export function BrandLockup({
  size = 'md',
  tone = 'default',
  layout = 'row',
  showTagline = false,
}: BrandLockupProps) {
  const { colors } = useAppTheme();
  const tokens = SIZE_TOKENS[size];
  const nameColor = tone === 'onBrand' ? colors.onBrand : colors.text;
  const taglineColor =
    tone === 'onBrand' ? 'rgba(255, 255, 255, 0.8)' : colors.textSecondary;
  const stacked = layout === 'stack';
  const label = showTagline ? `${APP_LOCKUP_NAME}, ${APP_TAGLINE}` : APP_LOCKUP_NAME;

  return (
    <View
      accessibilityLabel={label}
      accessible
      style={[
        styles.root,
        stacked ? styles.stack : styles.row,
        { gap: tokens.gap },
      ]}
    >
      <BrandMark accessible={false} size={tokens.mark} tone={tone} />
      <View style={stacked ? styles.stackCopy : styles.rowCopy}>
        <Text
          importantForAccessibility="no"
          style={[
            styles.name,
            {
              color: nameColor,
              fontSize: tokens.name,
              letterSpacing: stacked ? -0.4 : 0,
              textAlign: stacked ? 'center' : 'left',
            },
          ]}
        >
          {APP_LOCKUP_NAME}
        </Text>
        {showTagline ? (
          <Text
            importantForAccessibility="no"
            style={[
              styles.tagline,
              {
                color: taglineColor,
                fontSize: tokens.tagline,
                marginTop: stacked ? 4 : 1,
                textAlign: stacked ? 'center' : 'left',
              },
            ]}
          >
            {APP_TAGLINE}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexShrink: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stack: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  rowCopy: {
    flexShrink: 1,
  },
  stackCopy: {
    alignItems: 'center',
  },
  name: {
    fontWeight: '700',
  },
  tagline: {
    fontWeight: '500',
  },
});
