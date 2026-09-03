import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { APP_LOCKUP_NAME } from '@/constants/brand';
import { useAppTheme } from '@/hooks/useAppTheme';

type BrandMarkProps = {
  size?: number;
  tone?: 'default' | 'onBrand';
  accessible?: boolean;
};

export function BrandMark({
  size = 32,
  tone = 'default',
  accessible = true,
}: BrandMarkProps) {
  const { colors } = useAppTheme();
  const background = tone === 'onBrand' ? colors.onBrand : colors.brand;
  const foreground = tone === 'onBrand' ? colors.brand : colors.onBrand;

  return (
    <Svg
      accessibilityLabel={accessible ? APP_LOCKUP_NAME : undefined}
      accessible={accessible}
      height={size}
      viewBox="0 0 32 32"
      width={size}
    >
      <Rect fill={background} height={32} rx={8} width={32} x={0} y={0} />
      <Path
        d="M13.1 9.7c0-1.9 1.3-3.3 2.9-3.3s2.9 1.4 2.9 3.3"
        fill="none"
        stroke={foreground}
        strokeLinecap="round"
        strokeWidth={2}
      />
      <Path
        d="M10.4 13.6c0-3.2 2.45-5.35 5.6-5.35s5.6 2.15 5.6 5.35v5.05l2.45 2.85c.4.46.12 1.2-.5 1.2H8.45c-.62 0-.9-.74-.5-1.2l2.45-2.85V13.6Z"
        fill={foreground}
      />
      <Circle cx={16} cy={25} fill={foreground} r={1.7} />
    </Svg>
  );
}
