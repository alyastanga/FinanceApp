// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight } from 'expo-symbols';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

const MAPPING = {
  'house.fill': 'home',
  'house': 'home',
  'paperplane.fill': 'send',
  'paperplane': 'send',
  'chevron.left': 'chevron-left',
  'chevron.right': 'chevron-right',
  'chart.bar.fill': 'bar-chart',
  'chart.bar': 'bar-chart',
  'sparkles': 'auto-awesome',
  'target': 'track-changes',
  'list.bullet': 'list',
  'chart.line.uptrend.xyaxis': 'show-chart',
  'building.columns.fill': 'account-balance',
  'building.columns': 'account-balance',
  'dollarsign.circle': 'monetization-on',
  'dollarsign.circle.fill': 'monetization-on',
  'bitcoinsign.circle': 'currency-bitcoin',
  'bitcoinsign.circle.fill': 'currency-bitcoin',
  'gear': 'settings',
  'gearshape.fill': 'settings',
  'eye.fill': 'visibility',
  'eye': 'visibility',
  'eye.slash.fill': 'visibility-off',
  'eye.slash': 'visibility-off',
  'moon.fill': 'dark-mode',
  'moon': 'dark-mode',
  'bell.fill': 'notifications',
  'bell': 'notifications',
  'person.fill': 'person',
  'person': 'person',
  'arrow.down.doc.fill': 'file-download',
  'arrow.down.doc': 'file-download',
  'arrow.up.doc.fill': 'file-upload',
  'arrow.up.doc': 'file-upload',
  'tray.and.arrow.down.fill': 'download',
  'tray.and.arrow.down': 'download',
  'trash.fill': 'delete',
  'trash': 'delete',
  'arrow.up': 'arrow-upward',
  'arrow.clockwise': 'refresh',
  'arrow.triangle.2.circlepath': 'sync',
  'arrow.up.arrow.down': 'swap-vert',
  'cpu.fill': 'memory',
  'cpu': 'memory',
  'bolt.fill': 'bolt',
  'bolt': 'bolt',
  'lock.fill': 'lock',
  'lock': 'lock',
  'lock.shield.fill': 'admin-panel-settings',
  'lock.shield': 'admin-panel-settings',
  'shield.fill': 'shield',
  'shield': 'shield',
  'battery.100': 'battery-full',
  'xmark': 'close',
  'chart.pie.fill': 'pie-chart',
  'chart.pie': 'pie-chart',
  'calendar': 'calendar-today',
  'calendar.badge.clock': 'event-note',
  'calendar.badge.plus': 'event-available',
  'tag': 'label',
  'text.alignleft': 'notes',
  'pencil': 'edit',
  'plus': 'add',
  'minus': 'remove',
  'plus.circle.fill': 'add-circle',
  'plus.circle': 'add-circle-outline',
  'bubble.left.fill': 'chat-bubble',
  'bubble.left': 'chat-bubble-outline',
  'at': 'alternate-email',
  'chevron.up': 'expand-less',
  'chevron.down': 'expand-more',
  'archivebox.fill': 'archive',
  'cloud.fill': 'cloud',
  'doc.fill': 'description',
  'envelope.fill': 'email',
  'envelope': 'email',
  'hammer.fill': 'build',
  'hammer': 'build',
  'lifepreserver.fill': 'support',
  'lifepreserver': 'support',
  'lightbulb.fill': 'lightbulb',
  'lightbulb': 'lightbulb',
  'magnifyingglass': 'search',
  'square.and.arrow.up': 'share',
  'square.stack.3d.up.fill': 'layers',
  'square.stack.3d.up': 'layers',
  'chart.bar.xaxis': 'leaderboard',
  'chart.line.uptrend.xyaxis.circle.fill': 'trending-up',
  'chart.line.uptrend.xyaxis.circle': 'trending-up',
  'arrow.left.square.fill': 'logout',
  'banknote': 'payments',
  'key.fill': 'vpn-key',
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
