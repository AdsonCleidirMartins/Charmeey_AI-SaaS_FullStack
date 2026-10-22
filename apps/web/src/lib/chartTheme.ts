import { useTheme } from '@/context/ThemeContext';

/**
 * Chart colors per resolved theme. Categorical slots are used in fixed order
 * (never cycled) and were validated for CVD separation against each mode's
 * card surface. Light slots 3–5 sit below 3:1 contrast, so every chart ships
 * a legend/direct labels plus a table view.
 */
const light = {
  series: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4'],
  surface: '#ffffff',
  grid: '#e4e6ec',
  axis: '#c3c6d0',
  muted: '#6b6f7b',
  text: '#161a26',
  textSecondary: '#4a4f5c',
  tooltipBg: '#ffffff',
  tooltipBorder: 'rgba(22,26,38,0.12)',
  good: '#006300',
  bad: '#d03b3b',
};

const dark: typeof light = {
  series: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181'],
  surface: '#13131a',
  grid: '#25252f',
  axis: '#3a3a46',
  muted: '#8f8f9c',
  text: '#f0efec',
  textSecondary: '#c3c2b7',
  tooltipBg: '#1c1c26',
  tooltipBorder: 'rgba(255,255,255,0.12)',
  good: '#0ca30c',
  bad: '#e66767',
};

export type ChartColors = typeof light;

export function useChartColors(): ChartColors {
  const { resolved } = useTheme();
  return resolved === 'light' ? light : dark;
}

export function compact(n: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

export function currency(n: number, digits = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}
