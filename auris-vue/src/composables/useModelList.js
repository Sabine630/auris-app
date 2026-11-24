// 模型清單 composable（P138）：API 設定頁與 Onboarding 共用。
// 有金鑰時（debounce）向供應商抓清單，失敗安靜退回內建；已選模型一律保留在清單內。
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { getBuiltinModels, mergeModelList, fetchProviderModels, hasPlausibleKey } from '../services/modelCatalog.js';

// getters：{ provider, apiKey, apiBase?, selected? } 皆為 () => value
export function useModelList({ provider, apiKey, apiBase = () => '', selected = () => '' }, { debounceMs = 700 } = {}) {
  const fetched = ref(null);
  const loading = ref(false);
  let seq = 0;
  let timer = null;
  let ctrl = null;

  const models = computed(() => mergeModelList(getBuiltinModels(provider()), fetched.value, selected()));

  async function refresh() {
    const mySeq = ++seq;
    ctrl?.abort();
    ctrl = new AbortController();
    loading.value = true;
    const list = await fetchProviderModels({
      provider: provider(), apiKey: apiKey(), apiBase: apiBase(), signal: ctrl.signal,
    });
    if (mySeq !== seq) return; // 已被較新的請求取代（換供應商／改金鑰）
    fetched.value = list;
    loading.value = false;
  }

  // 供應商／金鑰／位址任一改變：先丟掉舊清單（避免別家的清單殘留），再 debounce 重抓。
  watch([provider, apiKey, apiBase], ([p], [oldP]) => {
    if (p !== oldP) fetched.value = null;
    clearTimeout(timer);
    // 金鑰明顯不完整就不排請求；並作廢進行中的舊請求（用過期金鑰的回應不該套用）
    if (!hasPlausibleKey(apiKey())) {
      seq++; ctrl?.abort(); loading.value = false; fetched.value = null;
      return;
    }
    timer = setTimeout(refresh, debounceMs);
  });
  onBeforeUnmount(() => { clearTimeout(timer); ctrl?.abort(); seq++; });

  return { models, loading, refresh };
}
