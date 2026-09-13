export const BASE_PATH =
  process.env.NEXT_PUBLIC_BASE_PATH || "/passion";

export function apiUrl(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_PATH}${normalized}`;
}
