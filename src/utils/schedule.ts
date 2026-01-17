// src/constants/index.ts

import { Home, Briefcase, GraduationCap, Dumbbell, Plane, Music, Heart, Star, Gift, Coffee, ShoppingCart, Gamepad2, type LucideIcon } from 'lucide-react';

export const NOTIFICATION_OPTIONS = [
  { label: '알림 안함', value: 'none' },
  { label: '정시', value: '0' },
  { label: '5분 전', value: '5' },
  { label: '10분 전', value: '10' },
  { label: '30분 전', value: '30' },
  { label: '1시간 전', value: '60' },
  { label: '1일 전', value: '1440' },
];

export const COLOR_OPTIONS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#84cc16', // lime
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#007AFF', // primary
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#f43f5e', // rose
  '#64748b', // slate
  '#71717a', // zinc
];

export const ICON_MAP: Record<string, LucideIcon> = {
  home: Home,
  work: Briefcase,
  study: GraduationCap,
  workout: Dumbbell,
  travel: Plane,
  music: Music,
  love: Heart,
  star: Star,
  gift: Gift,
  food: Coffee,
  shopping: ShoppingCart,
  game: Gamepad2,
};

// (선택 사항) 아이콘 키값('home' | 'work' ...)을 다른 컴포넌트에서 타입으로 쓰기 위해 추출
export type IconKey = keyof typeof ICON_MAP;
