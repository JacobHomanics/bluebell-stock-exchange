import { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

import type { AppThemeColors } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import {
  BALANCE_HISTORY_RANGES,
  snapshotsForRange,
  type BalanceHistoryRangeId,
  type BalanceSnapshot,
} from '@/lib/stocks/balanceHistory';
import { formatUsd } from '@/lib/stocks/fetchQuotes';

type BalanceChartProps = {
  points: readonly BalanceSnapshot[];
};

const CHART_HEIGHT = 112;
const PAD = { top: 10, right: 8, bottom: 10, left: 8 };

function formatAxisLabel(timestamp: number, includeDate: boolean): string {
  return new Intl.DateTimeFormat(
    'en-US',
    includeDate
      ? { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }
      : { hour: 'numeric', minute: '2-digit' },
  ).format(new Date(timestamp));
}

function sameLocalDay(left: number, right: number): boolean {
  const a = new Date(left);
  const b = new Date(right);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDelta(change: number): string {
  const formatted = formatUsd(Math.abs(change));
  if (change > 0) {
    return `+${formatted}`;
  }
  if (change < 0) {
    return `-${formatted}`;
  }
  return formatted;
}

export function BalanceChart({ points }: BalanceChartProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [width, setWidth] = useState(0);
  const [rangeId, setRangeId] = useState<BalanceHistoryRangeId>('1d');

  const range =
    BALANCE_HISTORY_RANGES.find((option) => option.id === rangeId) ??
    BALANCE_HISTORY_RANGES[2];
  const windowEnd = points[points.length - 1]?.t;
  const rangedPoints = useMemo(() => {
    const latest = points[points.length - 1];
    if (!latest) {
      return [];
    }
    return snapshotsForRange(points, range.ms, latest.t);
  }, [points, range.ms]);
  const windowStart =
    windowEnd == null ? 0 : windowEnd - range.ms;

  const first = rangedPoints[0];
  const last = rangedPoints[rangedPoints.length - 1];
  const change = first && last ? last.totalUsd - first.totalUsd : 0;
  const changeColor =
    change > 0
      ? colors.brandAccent
      : change < 0
        ? colors.error
        : colors.textMuted;

  const geometry = useMemo(
    () =>
      width > 0 && windowEnd != null
        ? buildChartGeometry(rangedPoints, width, range.ms, windowEnd)
        : null,
    [rangedPoints, width, range.ms, windowEnd],
  );

  const onLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    if (nextWidth !== width) {
      setWidth(nextWidth);
    }
  };

  const accessibilityLabel =
    first && last
      ? `Balance over ${range.label}, from ${formatUsd(first.totalUsd)} to ${formatUsd(last.totalUsd)}`
      : `Balance history for ${range.label}`;

  return (
    <View accessibilityLabel={accessibilityLabel} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.rangeGroup}>
          {BALANCE_HISTORY_RANGES.map((option) => {
            const selected = option.id === rangeId;
            return (
              <Pressable
                accessibilityLabel={`${option.label} range`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={option.id}
                onPress={() => {
                  setRangeId(option.id);
                }}
                style={({ pressed }) => [
                  styles.rangeButton,
                  selected && styles.rangeButtonSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.rangeLabel,
                    selected && styles.rangeLabelSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {rangedPoints.length >= 2 ? (
          <Text style={[styles.delta, { color: changeColor }]}>
            {formatDelta(change)}
          </Text>
        ) : null}
      </View>

      <View onLayout={onLayout}>
        {geometry && last ? (
          <Svg height={CHART_HEIGHT} width={width}>
            <Defs>
              <LinearGradient id="balanceAreaFill" x1="0" x2="0" y1="0" y2="1">
                <Stop
                  offset="0"
                  stopColor={colors.brandAccent}
                  stopOpacity={0.32}
                />
                <Stop
                  offset="1"
                  stopColor={colors.brandAccent}
                  stopOpacity={0.02}
                />
              </LinearGradient>
            </Defs>
            {geometry.areaPath ? (
              <Path d={geometry.areaPath} fill="url(#balanceAreaFill)" />
            ) : null}
            {geometry.linePath ? (
              <Path
                d={geometry.linePath}
                fill="none"
                stroke={colors.brandAccent}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            ) : null}
            <Circle
              cx={geometry.last.x}
              cy={geometry.last.y}
              fill={colors.brandAccent}
              r={4}
            />
          </Svg>
        ) : rangedPoints.length > 0 ? (
          <View style={styles.placeholder} />
        ) : null}
      </View>

      {rangedPoints.length >= 2 && windowEnd != null ? (
        <View style={styles.axis}>
          <Text style={styles.axisLabel}>
            {formatAxisLabel(
              windowStart,
              !sameLocalDay(windowStart, windowEnd),
            )}
          </Text>
          <Text style={styles.axisLabel}>
            {formatAxisLabel(
              windowEnd,
              !sameLocalDay(windowStart, windowEnd),
            )}
          </Text>
        </View>
      ) : (
        <Text style={styles.empty}>
          Balance is saved while the app is open. Check back to see this range.
        </Text>
      )}
    </View>
  );
}

function buildChartGeometry(
  points: readonly BalanceSnapshot[],
  width: number,
  rangeMs: number,
  windowEnd: number,
): {
  linePath: string | null;
  areaPath: string | null;
  last: { x: number; y: number };
} | null {
  if (points.length === 0) {
    return null;
  }

  const windowStart = windowEnd - rangeMs;
  const span = Math.max(windowEnd - windowStart, 1);
  const innerWidth = Math.max(width - PAD.left - PAD.right, 1);
  const innerHeight = CHART_HEIGHT - PAD.top - PAD.bottom;

  const values = points.map((point) => point.totalUsd);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue;
  const pad = range === 0 ? Math.max(Math.abs(maxValue) * 0.08, 1) : range * 0.12;
  const yMin = minValue - pad;
  const ySpan = maxValue + pad - yMin;

  const coords = points.map((point) => ({
    x: PAD.left + ((point.t - windowStart) / span) * innerWidth,
    y: PAD.top + (1 - (point.totalUsd - yMin) / ySpan) * innerHeight,
  }));

  const last = coords[coords.length - 1];
  if (!last) {
    return null;
  }

  if (coords.length === 1) {
    return { linePath: null, areaPath: null, last };
  }

  const linePath = coords
    .map((coord, index) => `${index === 0 ? 'M' : 'L'}${coord.x} ${coord.y}`)
    .join(' ');
  const first = coords[0];
  const baseline = CHART_HEIGHT - PAD.bottom;
  const areaPath = `${linePath} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`;

  return { linePath, areaPath, last };
}

function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    card: {
      marginTop: 20,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 16,
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 12,
    },
    rangeGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 10,
      padding: 3,
      gap: 2,
    },
    rangeButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    rangeButtonSelected: {
      backgroundColor: colors.brand,
    },
    rangeLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
    },
    rangeLabelSelected: {
      color: colors.onBrand,
    },
    pressed: {
      opacity: 0.75,
    },
    delta: {
      fontSize: 13,
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
    },
    placeholder: {
      height: CHART_HEIGHT,
    },
    axis: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    axisLabel: {
      fontSize: 12,
      color: colors.textMuted,
    },
    empty: {
      marginTop: 4,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
    },
  });
}
