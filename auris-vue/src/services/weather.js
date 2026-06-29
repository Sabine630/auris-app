import { getSetting } from './db.js';
import { fetchWithTimeout } from './api.js';

// 天氣感知：取使用者所在地當下天氣，組成一行克制的 context 注入 system prompt。
// 設計原則——天氣只是「偶發性」情境，多數對話不該提；措辭已寫進 getWeatherCtx 的回傳字串。
// 成本 0：定位用瀏覽器原生 Geolocation（在 SettingsView 取得），天氣與地名反查皆用 Open-Meteo（免費、免 key）。

// WMO weather_code → 中文天氣詞。對照 https://open-meteo.com/en/docs（WMO 4677）。
const WMO_ZH = {
  0: '晴朗', 1: '大致晴朗', 2: '多雲', 3: '陰天',
  45: '有霧', 48: '凍霧',
  51: '毛毛雨', 53: '毛毛雨', 55: '毛毛雨',
  56: '凍毛毛雨', 57: '凍毛毛雨',
  61: '小雨', 63: '雨', 65: '大雨',
  66: '凍雨', 67: '凍雨',
  71: '小雪', 73: '雪', 75: '大雪', 77: '雪粒',
  80: '陣雨', 81: '陣雨', 82: '強陣雨',
  85: '陣雪', 86: '強陣雪',
  95: '雷雨', 96: '雷雨夾冰雹', 99: '雷雨夾冰雹',
};

export function weatherCodeToZh(code) {
  return WMO_ZH[code] || '天氣未知';
}

// 城市名 → 座標（手動備案用）。回傳 { lat, lon, city } 或 null。
export async function geocodeCity(name) {
  const q = (name || '').trim();
  if (!q) return null;
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=zh&format=json`;
  try {
    const res = await fetchWithTimeout(url, {}, 10000);
    if (!res.ok) return null;
    const data = await res.json();
    const r = data?.results?.[0];
    if (!r) return null;
    return { lat: r.latitude, lon: r.longitude, city: r.name };
  } catch {
    return null;
  }
}

// 座標 → 城市名（自動定位後反查地名，純為顯示與 prompt 用）。失敗回 ''，不影響功能。
// 用 BigDataCloud 免費、免 key 的 client-side 反查（Open-Meteo 無反查端點）。
export async function reverseGeocode(lat, lon) {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=zh`;
  try {
    const res = await fetchWithTimeout(url, {}, 10000);
    if (!res.ok) return '';
    const data = await res.json();
    return data?.city || data?.locality || data?.principalSubdivision || '';
  } catch {
    return '';
  }
}

// 對外抓當下天氣。回傳 { code, temp } 或 null。
async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`;
  try {
    const res = await fetchWithTimeout(url, {}, 10000);
    if (!res.ok) return null;
    const data = await res.json();
    const cur = data?.current;
    if (!cur) return null;
    return { code: cur.weather_code, temp: Math.round(cur.temperature_2m) };
  } catch {
    return null;
  }
}

// 模組級快取（仿 api.js 的 Vertex token 快取）：同座標 30 分鐘內不重打 API。
const WEATHER_CACHE_MS = 30 * 60 * 1000;
let _cache = null;      // { code, temp }
let _cacheKey = '';     // `${lat},${lon}`
let _cacheExp = 0;

async function getWeather(lat, lon) {
  const key = `${lat},${lon}`;
  if (_cache && _cacheKey === key && Date.now() < _cacheExp) return _cache;
  const data = await fetchWeather(lat, lon);
  if (data) {
    _cache = data;
    _cacheKey = key;
    _cacheExp = Date.now() + WEATHER_CACHE_MS;
  }
  return data;
}

// 給 chatEngine 用：組成注入 system prompt 易變段的字串。
// 任何失敗（未定位、API 掛掉）都回空字串——天氣壞掉絕不能拖垮聊天，角色就當作沒有天氣感。
export async function getWeatherCtx() {
  const loc = await getSetting('weather_loc');
  if (!loc || loc.lat == null || loc.lon == null) return '';
  const w = await getWeather(loc.lat, loc.lon);
  if (!w) return '';
  const place = loc.city ? `使用者所在地（${loc.city}）` : '使用者所在地';
  return `\n【天氣】${place}現在${weatherCodeToZh(w.code)}，氣溫 ${w.temp}°C。`
    + `僅在自然、合適的時候偶爾關心（例如剛下雨可提醒帶傘、天氣劇烈變化時），`
    + `多數時候不必主動提天氣，絕不要每則訊息都報告天氣。`;
}
