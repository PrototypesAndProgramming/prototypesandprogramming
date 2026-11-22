export const COLORS = ['#4d7fd9', '#e2564e', '#7dc0e0', '#5bbf7a', '#e0a43a', '#b07ad9', '#d96fa8', '#8a8f98'];

export function rgba(hex, a) {
  const h = (hex || '#4d7fd9').replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
