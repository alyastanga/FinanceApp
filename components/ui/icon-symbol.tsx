// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left': 'chevron-left',
  'chevron.right': 'chevron-right',
  'chart.bar.fill': 'bar-chart',
  'sparkles': 'auto-awesome',
  'target': 'track-changes',
  'list.bullet': 'list',
  'dollarsign.circle': 'account-balance-wallet',
  'dollarsign.circle.fill': 'monetization-on',
  'gear': 'settings',
  'gearshape.fill': 'settings',
  'eye.fill': 'visibility',
  'eye.slash.fill': 'visibility-off',
  'moon.fill': 'dark-mode',
  'bell.fill': 'notifications',
  'person.fill': 'person',
  'arrow.down.doc.fill': 'file-download',
  'arrow.up.doc.fill': 'file-upload',
  'tray.and.arrow.down.fill': 'download',
  'trash.fill': 'delete',
  'trash': 'delete',
  'arrow.up': 'arrow-upward',
  'arrow.clockwise': 'refresh',
  'arrow.triangle.2.circlepath': 'sync',
  'arrow.up.arrow.down': 'swap-vert',
  'cpu.fill': 'memory',
  'bolt.fill': 'bolt',
  'lock.fill': 'lock',
  'lock.shield.fill': 'admin-panel-settings',
  'shield.fill': 'shield',
  'battery.100': 'battery-full',
  'xmark': 'close',
  'chart.pie.fill': 'pie-chart',
  'calendar': 'calendar-today',
  'calendar.badge.clock': 'event-note',
  'calendar.badge.plus': 'event-available',
  'tag': 'label',
  'text.alignleft': 'notes',
  'pencil': 'edit',
  'plus': 'add',
  'minus': 'remove',
  'plus.circle.fill': 'add-circle',
  'bubble.left.fill': 'chat-bubble',
  'at': 'alternate-email',
  'chevron.up': 'expand-less',
  'chevron.down': 'expand-more',
  'archivebox.fill': 'archive',
  'cloud.fill': 'cloud',
  'doc.fill': 'description',
  'envelope.fill': 'email',
  'hammer.fill': 'build',
  'lifepreserver.fill': 'support',
  'lightbulb.fill': 'lightbulb',
  'magnifyingglass': 'search',
  'square.and.arrow.up': 'share',
  'square.stack.3d.up.fill': 'layers',
  'chart.bar.xaxis': 'leaderboard',
  'chart.line.uptrend.xyaxis.circle.fill': 'trending-up',
  'arrow.left.square.fill': 'logout',
} as const;

type IconSymbolName = keyof typeof MAPPING;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
