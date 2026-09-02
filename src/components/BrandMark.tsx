import Svg, { Line, Rect } from 'react-native-svg';

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
      <Line
        stroke={foreground}
        strokeLinecap="round"
        strokeWidth={1.6}
        x1={8.5}
        x2={8.5}
        y1={15}
        y2={24}
      />
      <Rect fill={foreground} height={5} rx={0.6} width={4} x={6.5} y={17.5} />
      <Line
        stroke={foreground}
        strokeLinecap="round"
        strokeWidth={1.6}
        x1={16}
        x2={16}
        y1={10}
        y2={22.5}
      />
      <Rect fill={foreground} height={8} rx={0.6} width={4} x={14} y={12} />
      <Line
        stroke={foreground}
        strokeLinecap="round"
        strokeWidth={1.6}
        x1={23.5}
        x2={23.5}
        y1={6.5}
        y2={18}
      />
      <Rect fill={foreground} height={9} rx={0.6} width={4} x={21.5} y={7.5} />
    </Svg>
  );
}
