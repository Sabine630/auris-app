// ── 版號常數（P105 版號常數手術）────────────────────────────────────────────
// 全站唯一的版號來源：設定頁顯示、診斷匯出、錯誤日誌逐筆蓋版號都引用這裡。
// 版更時只改這個檔（check-version-bump hook 盯的也是這個檔）。
export const APP_VERSION = 'P115';
export const VERSION_NOTE = 'P115 iOS 鍵盤修復：修正 safe-area 與 visualViewport 的座標換算，穩定聊天室、群聊與貼文留言的鍵盤版面';
