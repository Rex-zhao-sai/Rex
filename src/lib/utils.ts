import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 获取应用的 basePath
 * GitHub Pages 项目站点使用 /Rex，其他环境为空
 * 通过检查 window.location.pathname 自动检测
 */
export function getBasePath(): string {
  if (typeof window === 'undefined') return '';
  const pathname = window.location.pathname;
  // GitHub Pages 项目站点：pathname 以 /Rex 开头（/Rex 或 /Rex/...）
  if (pathname.startsWith('/Rex')) return '/Rex';
  return '';
}
