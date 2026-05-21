const fs = require('fs');

const settingsPath = 'auris-vue/src/views/SettingsView.vue';
let settings = fs.readFileSync(settingsPath, 'utf8');
settings = settings.replace('<div class="setting-desc">v1.0.39</div>', '<div class="setting-desc">v1.0.40</div>');
settings = settings.replace('v1.0.39<br>', 'v1.0.40 (修復版)<br>\n            - 完全還原舊版的群組聊天歷史清洗與系統提示詞邏輯，解決 AI 回覆空白的問題。<br>\n            <br>\n            v1.0.39<br>');
fs.writeFileSync(settingsPath, settings, 'utf8');

const iniPath = 'Auris 完整開發進度總覽.ini';
let ini = fs.readFileSync(iniPath, 'utf8');
ini = ini.replace('[Version_History]\n', '[Version_History]\nv1.0.40 = 2026-05-21, 完全還原舊版的群組聊天歷史清洗與系統提示詞邏輯，解決 AI 回覆空白的問題\n');
fs.writeFileSync(iniPath, ini, 'utf8');
