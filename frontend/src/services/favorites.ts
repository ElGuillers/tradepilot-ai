const FAVORITES_KEY = 'tradepilot_favorites';

export function getStoredFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length > 0) {
        return new Set(arr.map((s: string) => s.toUpperCase()));
      }
    }
  } catch (e) {}
  return new Set(['BTCUSDT', 'ETHUSDT', 'PAXGUSDT', 'NVDA']);
}

export function saveStoredFavorites(favorites: Set<string>): void {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(favorites)));
  } catch (e) {}
}

export function isStoredFavorite(symbol: string): boolean {
  return getStoredFavorites().has(symbol.toUpperCase());
}

export function toggleStoredFavorite(symbol: string): boolean {
  const favs = getStoredFavorites();
  const sym = symbol.toUpperCase();
  let isFav = false;
  if (favs.has(sym)) {
    favs.delete(sym);
    isFav = false;
  } else {
    favs.add(sym);
    isFav = true;
  }
  saveStoredFavorites(favs);
  window.dispatchEvent(new Event('tradepilot_favorites_updated'));
  return isFav;
}
