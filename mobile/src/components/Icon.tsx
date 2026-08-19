/**
 * Thin wrapper around Ionicons from @expo/vector-icons.
 * Use this everywhere instead of raw emoji or letter placeholders.
 *
 * Usage:
 *   <Icon name="medical" size={20} color="#0D9488" />
 *
 * Full list: https://ionic.io/ionicons
 */
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

interface IconProps {
  name: IoniconsName;
  size?: number;
  color?: string;
}

export default function Icon({ name, size = 20, color = '#0D9488' }: IconProps) {
  return <Ionicons name={name} size={size} color={color} />;
}
