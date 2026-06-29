<template>
  <div class="page active" id="pg-char-edit" style="display:flex;flex-direction:column;z-index:999">
    <!-- 頁首 -->
    <div class="ph">
      <div class="ph-back" @click="$router.back()"><svg viewBox="0 0 8 14"><path d="M7 1L1 7L7 13"/></svg>返回</div>
      <div class="ph-title">{{ isEdit ? '編輯角色' : '新增角色' }}</div>
      <div class="ph-act" @click="saveChar">儲存</div>
    </div>

    <!-- Tab 列 -->
    <div class="tab-bar">
      <div class="tab-item" :class="{ active: curTab === 0 }" @click="curTab = 0">基本資訊</div>
      <div class="tab-item" :class="{ active: curTab === 1 }" @click="curTab = 1">個性背景</div>
      <div class="tab-item" :class="{ active: curTab === 2 }" @click="curTab = 2">說話方式</div>
      <div class="tab-item" :class="{ active: curTab === 3 }" @click="curTab = 3">關係設定</div>
      <div class="tab-item" :class="{ active: curTab === 4 }" @click="curTab = 4">進階設定</div>
    </div>

    <!-- Tab 內容滾動區 -->
    <div style="flex:1;overflow-y:auto;scrollbar-width:none" id="char-edit-scroll">

      <!-- ── Tab 0：基本資訊 ── -->
      <div class="tab-panel" :class="{ active: curTab === 0 }">
        <div class="av-hero">
          <div class="av-circle" :class="{'has-img': hasAvImg}" @click="showAvMenu = !showAvMenu">
            <img v-if="hasAvImg" :src="char.avatar">
            <span v-else>{{ char.avatar || '🌸' }}</span>
            <div class="av-edit"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div>
          </div>
          <div class="av-hint">點擊更換頭像</div>
        </div>
        
        <input type="file" ref="avFileInput" accept="image/*" style="display:none" @change="onAvFileChange">
        
        <div class="av-menu" :class="{ open: showAvMenu }">
          <div class="av-menu-item" @click="triggerAvUpload">
            <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>從相簿上傳圖片
          </div>
          <div class="av-menu-item" @click="showAvMenu=false; showEmojiPicker=true">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>選擇 Emoji
          </div>
          <div class="av-menu-item" v-if="hasAvImg" style="color:var(--red)" @click="removeAvImg">
            <svg viewBox="0 0 24 24" style="stroke:var(--red)"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>移除圖片
          </div>
        </div>
        
        <div class="emoji-picker" :class="{ open: showEmojiPicker }">
          <div v-for="e in EMOJIS" :key="e" class="emoji-opt" :class="{ sel: char.avatar === e }" @click="pickEmoji(e)">{{ e }}</div>
        </div>

        <div class="sec-label">基本資訊</div>
        <div class="form-group">
          <div class="form-row">
            <div class="form-label">角色名字 <span class="form-label-badge">必填</span></div>
            <div class="form-input-row">
              <input class="form-input" type="text" v-model="char.name" placeholder="例：阿翔、Leo、Kai…" maxlength="20">
              <span class="form-counter">{{ char.name.length }}/20</span>
            </div>
          </div>
          <div class="form-row">
            <div class="form-label">一句話介紹</div>
            <div class="form-input-row">
              <input class="form-input" type="text" v-model="char.tagline" placeholder="例：總是在深夜打籃球的男生" maxlength="50">
              <span class="form-counter">{{ char.tagline.length }}/50</span>
            </div>
          </div>
        </div>
        <div class="form-group">
          <div class="form-row">
            <div class="form-label">年齡</div>
            <input class="form-input" type="number" v-model="char.age" placeholder="例：22" min="1" max="120" style="width:80px">
          </div>
          <div class="form-row">
            <div class="form-label">職業 / 身份</div>
            <input class="form-input" type="text" v-model="char.job" placeholder="例：研究生、攝影師、樂手…">
          </div>
          <div class="form-row">
            <div class="form-label">居住地 / 生活環境</div>
            <input class="form-input" type="text" v-model="char.location" placeholder="例：台北信義區、東京下北澤…">
          </div>
        </div>
      </div>

      <!-- ── Tab 1：個性背景 ── -->
      <div class="tab-panel" :class="{ active: curTab === 1 }">
        <div class="sec-label" style="margin-top:8px">個性</div>
        <div class="form-group">
          <div class="form-row">
            <div class="form-label">個性描述 <span class="form-label-badge">必填</span></div>
            <textarea class="form-input" rows="5" v-model="char.persona" placeholder="描述他的性格。例：外表隨性但內心細膩，不擅長直接說出感受，喜歡用行動代替言語，對在乎的人會默默付出…"></textarea>
          </div>
        </div>
        <div class="form-group">
          <div class="form-row">
            <div class="form-label">性格標籤 <span style="font-size:11px;color:var(--text-3);font-weight:300;letter-spacing:.02em">（已選 {{ char.tags.length }} / 最多 5 個）</span></div>
            <div class="opt-group">
              <div v-for="t in TAGS" :key="t" class="opt-btn" :class="{ sel: char.tags.includes(t) }" @click="toggleTag(t)">{{ t }}</div>
            </div>
          </div>
        </div>

        <div class="sec-label">背景故事</div>
        <div id="story-blocks">
          <div v-for="(b, idx) in char.stories" :key="b.id" class="story-block" :class="{ open: b.open }">
            <div class="story-header" @click="b.open = !b.open">
              <span class="story-icon">{{ b.icon }}</span>
              <span class="story-title">{{ b.title }}</span>
              <span class="story-chars" v-if="b.content">{{ b.content.length }} 字</span>
              <span class="story-chevron"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></span>
            </div>
            <div class="story-body">
              <textarea class="story-ta" :placeholder="b.ph" v-model="b.content"></textarea>
              <div class="story-del" v-if="b.custom" @click="removeStory(idx)">刪除此章節</div>
            </div>
          </div>
        </div>
        <div class="add-story" @click="addStoryPrompt = true">
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span>新增自訂章節</span>
        </div>

        <div class="sec-label">近況</div>
        <div class="form-group">
          <div class="form-row">
            <div class="form-label">目前狀態 / 近況</div>
            <textarea class="form-input" rows="2" v-model="char.status" placeholder="例：剛換了新工作，還在適應中…"></textarea>
          </div>
          <div class="form-row">
            <div class="form-label">喜好與興趣</div>
            <textarea class="form-input" rows="2" v-model="char.hobby" placeholder="例：喜歡深夜騎車、黑膠唱片、討厭人際應酬…"></textarea>
          </div>
        </div>

        <div class="sec-label">作息 / 行程</div>
        <div class="form-group" style="margin-bottom:0">
          <div class="form-row">
            <div class="form-label">上班 / 上課時間</div>
            <input class="form-input" type="text" v-model="char.workTime" placeholder="例：週一到五 09:00–18:00、輪班制…">
          </div>
          <div class="form-row">
            <div class="form-label">上班 / 上課地點</div>
            <input class="form-input" type="text" v-model="char.workPlace" placeholder="例：信義區的設計公司、學校…">
          </div>
          <div class="form-row">
            <div class="form-label">作息習慣</div>
            <textarea class="form-input" rows="2" v-model="char.restTime" placeholder="例：通常凌晨1點睡、早上8點起；週末會睡到中午…"></textarea>
            <div class="form-hint">搭配「時間感」開啟時，角色會依現在時間推測自己在上班、通勤還是睡覺，主動訊息更有情境感</div>
          </div>
        </div>
      </div>

      <!-- ── Tab 2：說話方式 ── -->
      <div class="tab-panel" :class="{ active: curTab === 2 }">
        <div class="sec-label" style="margin-top:8px">風格</div>
        <div class="form-group">
          <div class="form-row">
            <div class="form-label">說話風格 <span class="form-label-badge">必填</span></div>
            <div class="opt-group">
              <div v-for="o in STYLES" :key="o.v" class="opt-btn" :class="{ sel: char.style === o.v }" @click="char.style = o.v">{{ o.l }}</div>
            </div>
          </div>
        </div>
        <div class="form-group">
          <div class="form-row">
            <div class="form-label">對你的稱呼</div>
            <input class="form-input" type="text" v-model="char.call" placeholder="例：小丫頭、你這個傻瓜、直接叫名字…">
          </div>
          <div class="form-row">
            <div class="form-label">口頭禪 / 慣用語</div>
            <input class="form-input" type="text" v-model="char.phrase" placeholder="例：「說真的」、句尾常加「耶」…">
          </div>
        </div>

        <div class="sec-label">行為傾向</div>
        <div class="form-group">
          <div class="form-row">
            <div class="form-label">話量傾向</div>
            <div class="opt-group">
              <div v-for="o in TALKATIVE" :key="o.v" class="opt-btn" :class="{ sel: char.talkative === o.v }" @click="char.talkative = o.v">{{ o.l }}</div>
            </div>
          </div>
          <div class="form-row">
            <div class="form-label">面對衝突</div>
            <div class="opt-group">
              <div v-for="o in CONFLICT" :key="o.v" class="opt-btn" :class="{ sel: char.conflict === o.v }" @click="char.conflict = o.v">{{ o.l }}</div>
            </div>
          </div>
          <div class="form-row">
            <div class="form-label">主動關心頻率</div>
            <div class="opt-group">
              <div v-for="o in CARE" :key="o.v" class="opt-btn" :class="{ sel: char.care === o.v }" @click="char.care = o.v">{{ o.l }}</div>
            </div>
          </div>
        </div>

        <div class="sec-label">範例對話</div>
        <div class="form-group">
          <div class="form-hint" style="margin-bottom:10px">寫幾組「你說 → 角色怎麼回」的範例，AI 會模仿這種語氣與用詞（這是抓住角色「說話聲音」最有效的方式）。不必照抄內容，留空欄位會自動略過。</div>
          <div v-for="(ex, i) in char.examples" :key="i" style="margin-bottom:12px;padding:10px 12px;background:var(--surface);border-radius:12px;border:.5px solid var(--border)">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
              <span style="font-size:12px;color:var(--text-3)">範例 {{ i + 1 }}</span>
              <div @click="char.examples.splice(i, 1)" style="cursor:pointer;color:var(--text-3);font-size:18px;line-height:1">×</div>
            </div>
            <textarea class="form-input" rows="2" v-model="ex.user" placeholder="你說…" style="margin-bottom:6px"></textarea>
            <textarea class="form-input" rows="2" v-model="ex.char" placeholder="角色怎麼回…"></textarea>
          </div>
          <div class="form-hint" style="cursor:pointer;color:var(--accent);margin-top:4px" @click="char.examples.push({ user: '', char: '' })">＋ 新增範例對話</div>
        </div>
      </div>

      <!-- ── Tab 3：關係設定 ── -->
      <div class="tab-panel" :class="{ active: curTab === 3 }">
        <div v-if="isEdit" style="margin:16px 16px 0;padding:12px 14px;background:var(--surface);border-radius:12px;border:.5px solid var(--border);display:flex;align-items:center;justify-content:space-between;cursor:pointer" @click="$router.push('/relation/' + charId)">
          <div style="font-size:13px;font-weight:400;color:var(--text)">查看關係主頁</div>
          <div style="font-size:13px;color:var(--rose)">›</div>
        </div>
        <div class="sec-label" style="margin-top:8px">與你的關係</div>
        <div class="form-group">
          <div class="form-row">
            <div class="form-label">關係類型</div>
            <div class="opt-group">
              <div v-for="o in RELATIONS" :key="o.v" class="opt-btn" :class="{ sel: char.relation === o.v }" @click="char.relation = o.v">{{ o.l }}</div>
            </div>
          </div>
        </div>
        <div class="form-group">
          <div class="form-row">
            <div class="form-label">關係背景</div>
            <textarea class="form-input" rows="3" v-model="char.rel_bg" placeholder="你們是怎麼認識的、目前關係狀態、共同回憶…"></textarea>
          </div>
          <div class="form-row">
            <div class="form-label">你在角色心中的地位</div>
            <input class="form-input" type="text" v-model="char.rel_pos" placeholder="例：他把你當唯一傾訴對象、他喜歡你但不說出口…">
          </div>
        </div>

        <div class="sec-label">紀念日</div>
        <div class="form-group">
          <div class="form-row">
            <div class="form-label">角色生日</div>
            <input class="form-input" type="date" v-model="char.birthday" style="color-scheme:var(--color-scheme,light)">
          </div>
          <div class="form-row">
            <div class="form-label">在一起的日期</div>
            <input class="form-input" type="date" v-model="char.togetherDate" style="color-scheme:var(--color-scheme,light)">
            <div class="form-hint">用於計算「在一起 X 天」</div>
          </div>
        </div>

        <div class="sec-label">自訂紀念日</div>
        <div class="form-group">
          <div v-for="(ann, i) in char.anniversaries" :key="ann.id" style="display:flex;gap:8px;align-items:center;margin-bottom:10px">
            <input type="text" v-model="ann.label" class="form-input" placeholder="例：認識、訂婚、結婚…" style="flex:1">
            <input type="date" v-model="ann.date" class="form-input" style="width:auto;flex-shrink:0;color-scheme:var(--color-scheme,light)">
            <div @click="removeAnniversary(i)" style="cursor:pointer;color:var(--text-3);font-size:18px;line-height:1;flex-shrink:0">×</div>
          </div>
          <div class="form-hint" style="cursor:pointer;color:var(--accent);margin-top:4px" @click="addAnniversary">＋ 新增紀念日</div>
        </div>

        <div class="sec-label">在這段關係中——你是誰</div>
        <div class="form-group">
          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-name">覆蓋全局設定</div>
              <div class="toggle-desc">開啟後可設定你在這段故事裡的獨立身份（需先填寫「我的設定」）</div>
            </div>
            <div class="toggle" :class="{ on: char.overrideMe }" @click="char.overrideMe = !char.overrideMe"><div class="toggle-knob"></div></div>
          </div>
        </div>
        <div v-if="char.overrideMe">
          <div class="form-group">
            <div class="form-row">
              <div class="form-label">角色怎麼叫你</div>
              <input class="form-input" type="text" v-model="char.you_name" placeholder="例：小丫頭、晴晴、或你的英文名…">
            </div>
            <div class="form-row">
              <div class="form-label">你在這段故事裡的身份</div>
              <input class="form-input" type="text" v-model="char.you_role" placeholder="例：高中生、他的學妹、剛搬來的新鄰居…">
            </div>
            <div class="form-row">
              <div class="form-label">你的個性補充</div>
              <textarea class="form-input" rows="2" v-model="char.you_persona" placeholder="角色眼中的你是什麼樣的人…"></textarea>
            </div>
          </div>
        </div>

      </div>

      <!-- ── Tab 4：進階設定 ── -->
      <div class="tab-panel" :class="{ active: curTab === 4 }">
        <div class="sec-label" style="margin-top:8px">回覆行為</div>
        <div class="form-group">
          <div class="form-row">
            <div class="form-label">回覆模式</div>
            <div class="opt-group">
              <div v-for="o in REPLY_MODES" :key="o.v" class="opt-btn" :class="{ sel: char.replyMode === o.v }" @click="char.replyMode = o.v">{{ o.l }}</div>
            </div>
            <div class="form-hint" v-if="char.replyMode === 'manual'">手動：你送出訊息後角色才回覆，不會主動打擾。</div>
            <div class="form-hint" v-if="char.replyMode === 'auto'">自動：角色會像真人一樣，偶爾主動傳訊息給你。</div>
            <div class="form-hint" v-if="char.replyMode === 'auto-interrupt'">自動可打斷：角色主動傳訊息時，若你開始打字，角色會停止輸入等你說完。</div>
          </div>
        </div>
        <div class="form-group">
          <div class="slider-row">
            <div class="slider-header">
              <span class="slider-label">回覆延遲</span>
              <span class="slider-val">{{ char.delay }} 秒</span>
            </div>
            <input type="range" min="0" max="30" v-model.number="char.delay">
            <div class="form-hint" style="margin-top:6px">0 = 即時回覆，數字越大越像真人打字</div>
          </div>
          <div class="slider-row">
            <div class="slider-header">
              <span class="slider-label">最少回覆條數</span>
              <span class="slider-val">{{ char.minMsg }} 條</span>
            </div>
            <input type="range" min="1" max="5" v-model.number="char.minMsg">
          </div>
          <div class="slider-row">
            <div class="slider-header">
              <span class="slider-label">最多回覆條數</span>
              <span class="slider-val">{{ char.maxMsg }} 條</span>
            </div>
            <input type="range" min="1" max="8" v-model.number="char.maxMsg">
          </div>
        </div>

        <div class="sec-label">AI 參數</div>
        <div class="form-group">
          <div class="slider-row">
            <div class="slider-header">
              <span class="slider-label">記憶條數</span>
              <span class="slider-val">{{ char.memory }} 條</span>
            </div>
            <input type="range" min="5" max="100" step="5" v-model.number="char.memory">
            <div class="form-hint" style="margin-top:6px">AI 每次回覆時參考的歷史對話數量</div>
          </div>
          <div class="slider-row">
            <div class="slider-header">
              <span class="slider-label">溫度 Temperature</span>
              <span class="slider-val">{{ char.temperature }}</span>
            </div>
            <input type="range" min="0" max="2" step="0.1" v-model.number="char.temperature">
            <div class="form-hint" style="margin-top:6px">越高越有創意，越低越貼合人設</div>
          </div>
        </div>

        <div class="sec-label">自動功能</div>
        <div class="form-group">
          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-name">時間感</div>
              <div class="toggle-desc">角色知道現在幾點、星期幾，會在對話中自然提及</div>
            </div>
            <div class="toggle" :class="{ on: char.timeAware }" @click="char.timeAware = !char.timeAware"><div class="toggle-knob"></div></div>
          </div>
          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-name">天氣感</div>
              <div class="toggle-desc">角色會偶爾感知你所在地的天氣（如下雨提醒帶傘）。需先到「設定」開啟定位</div>
            </div>
            <div class="toggle" :class="{ on: char.weatherAware }" @click="char.weatherAware = !char.weatherAware"><div class="toggle-knob"></div></div>
          </div>
          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-name">Heart Voice（心聲）</div>
              <div class="toggle-desc">AI 在背景生成角色說不出口的內心話，存入黑盒子</div>
            </div>
            <div class="toggle" :class="{ on: char.heartVoice }" @click="char.heartVoice = !char.heartVoice"><div class="toggle-knob"></div></div>
          </div>
          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-name">自動生成日記</div>
              <div class="toggle-desc">每天固定時間讓角色自動寫一篇日記</div>
            </div>
            <div class="toggle" :class="{ on: char.autoDiary }" @click="char.autoDiary = !char.autoDiary"><div class="toggle-knob"></div></div>
          </div>
          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-name">自動發貼文</div>
              <div class="toggle-desc">每天固定時間讓角色自動發佈一則貼文</div>
            </div>
            <div class="toggle" :class="{ on: char.autoPost }" @click="char.autoPost = !char.autoPost"><div class="toggle-knob"></div></div>
          </div>
          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-name">暫停主動訊息（總開關）</div>
              <div class="toggle-desc">開啟後，這個角色完全不會主動傳訊息（想你、每日一問、生理期關心、定時提醒、聊天室即時主動全部暫停），你傳訊息時仍會正常回覆</div>
            </div>
            <div class="toggle" :class="{ on: char.proactiveMute }" @click="char.proactiveMute = !char.proactiveMute"><div class="toggle-knob"></div></div>
          </div>
          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-name">生理期關心</div>
              <div class="toggle-desc">讓這個角色知道你的生理期，聊天時體貼帶到，並在經期前後主動傳訊息關心（需先在「我的設定」開啟週期追蹤）</div>
            </div>
            <div class="toggle" :class="{ on: char.cycleCare }" @click="char.cycleCare = !char.cycleCare"><div class="toggle-knob"></div></div>
          </div>
          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-name">我想你</div>
              <div class="toggle-desc">角色偶爾會主動傳一則短訊息告訴你「突然想到你了」，每天最多一次（約 4 成機率，不一定每天都有）</div>
            </div>
            <div class="toggle" :class="{ on: char.missYouEnabled }" @click="char.missYouEnabled = !char.missYouEnabled"><div class="toggle-knob"></div></div>
          </div>
          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-name">每日一問</div>
              <div class="toggle-desc">角色每天主動向你提出一個問題，了解你的生活或想法，每天一次</div>
            </div>
            <div class="toggle" :class="{ on: char.dailyQuestionEnabled }" @click="char.dailyQuestionEnabled = !char.dailyQuestionEnabled"><div class="toggle-knob"></div></div>
          </div>
          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-name">自動總結記憶</div>
              <div class="toggle-desc">對話累積到一定則數時，自動讓 AI 濃縮成長期記憶，不必手動按總結</div>
            </div>
            <div class="toggle" :class="{ on: char.autoSummarize }" @click="char.autoSummarize = !char.autoSummarize"><div class="toggle-knob"></div></div>
          </div>
          <div class="slider-row" v-if="char.autoSummarize">
            <div class="slider-header">
              <span class="slider-label">每幾則自動總結</span>
              <span class="slider-val">{{ char.autoSumEvery }} 則</span>
            </div>
            <input type="range" min="10" max="80" step="5" v-model.number="char.autoSumEvery">
            <div class="form-hint" style="margin-top:6px">每累積這麼多則新對話，就自動總結一次</div>
          </div>
        </div>

        <div class="sec-label">語言</div>
        <div class="form-group">
          <div class="form-row">
            <div class="form-label">角色輸出語言</div>
            <div class="opt-group">
              <div v-for="o in LANGS" :key="o.v" class="opt-btn" :class="{ sel: char.lang === o.v }" @click="char.lang = o.v">{{ o.l }}</div>
            </div>
          </div>
        </div>

        <div class="sec-label">主動訊息時段</div>
        <div class="form-group">
          <div class="form-row">
            <div class="form-hint" style="margin-bottom:8px">設定後角色會在指定時間主動傳訊，每個時段每天只發一次</div>
            <div v-for="(t, i) in char.scheduleTriggers" :key="i" style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
              <input type="time" v-model="t.time" class="form-input" style="width:100px;flex-shrink:0">
              <input type="text" v-model="t.desc" class="form-input" placeholder="例：提醒我吃午餐、叫我起床…" style="flex:1">
              <div class="toggle" :class="{ on: t.enabled }" @click="t.enabled = !t.enabled" style="flex-shrink:0"><div class="toggle-knob"></div></div>
              <div @click="char.scheduleTriggers.splice(i, 1)" style="cursor:pointer;color:var(--text-3);font-size:18px;line-height:1;flex-shrink:0">×</div>
            </div>
            <div class="form-hint" style="cursor:pointer;color:var(--accent);margin-top:4px" @click="char.scheduleTriggers.push({ time: '12:00', desc: '', enabled: true })">＋ 新增時段</div>
          </div>
        </div>

        <div class="sec-label">行為規範</div>
        <div class="form-group">
          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-name">角色知道自己是 AI</div>
              <div class="toggle-desc">關閉時角色完全沉浸人設，不承認是程式</div>
            </div>
            <div class="toggle" :class="{ on: char.isAI }" @click="char.isAI = !char.isAI"><div class="toggle-knob"></div></div>
          </div>
        </div>
        <div class="form-group" style="margin-bottom:0">
          <div class="form-row">
            <div class="form-label">禁止話題</div>
            <textarea class="form-input" rows="2" v-model="char.taboo" placeholder="例：不談前任、不討論政治…"></textarea>
          </div>
          <div class="form-row">
            <div class="form-label">補充指令 <span style="font-size:11px;color:var(--text-3);font-weight:300">進階</span></div>
            <textarea class="form-input" rows="3" v-model="char.extra" placeholder="直接給 AI 的額外 prompt 指令…"></textarea>
          </div>
        </div>
      </div>

    </div><!-- /char-edit-scroll -->

    <!-- 底部固定儲存列 -->
    <div class="tab-save-bar">
      <button class="tab-save-primary" @click="saveChar">儲存角色</button>
      <button class="tab-save-danger" v-if="isEdit" @click="confirmDeletePrompt = true">刪除</button>
    </div>

    <!-- Modals -->
    <div class="modal-overlay" :class="{ open: addStoryPrompt }" @click.self="addStoryPrompt = false">
      <div class="modal-box">
        <div class="modal-handle"></div>
        <div class="modal-title">新增背景故事章節</div>
        <div class="modal-msg" style="display:block">幫這個章節取個名字，例如：高中時期、初戀、最低潮的時刻</div>
        <div class="modal-input-wrap" style="display:block">
          <input class="modal-input" type="text" v-model="newStoryTitle" placeholder="章節名稱…">
        </div>
        <div class="modal-actions">
          <button class="modal-btn modal-btn-primary" @click="doAddStory">新增</button>
          <button class="modal-btn modal-btn-cancel" @click="addStoryPrompt = false; newStoryTitle=''">取消</button>
        </div>
      </div>
    </div>

    <div class="modal-overlay" :class="{ open: confirmDeletePrompt }" @click.self="confirmDeletePrompt = false">
      <div class="modal-box">
        <div class="modal-handle"></div>
        <div class="modal-title">刪除「{{ char.name }}」</div>
        <div class="modal-msg" style="display:block">這個角色的所有設定和聊天記錄都會一起刪除，無法復原。</div>
        <div class="modal-actions">
          <button class="modal-btn modal-btn-danger" @click="doDeleteChar">確定刪除</button>
          <button class="modal-btn modal-btn-cancel" @click="confirmDeletePrompt = false">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { dbGet, dbPut, dbDel, dbIdx } from '../services/db.js';
import { globalStore } from '../store/index.js';

const route = useRoute();
const router = useRouter();

const EMOJIS=['🌸','🌙','⭐','🍀','🎀','🌿','🦋','🌺','💎','🕊️','🌷','🍃','🌻','🍓','🎵','🌊','🦊','🐰','🌈','✨','🍵','📖','🎨','🌑'];
const TAGS=['溫柔','活潑','冷淡','傲嬌','開朗','內斂','毒舌','體貼','可愛','成熟','文藝','神秘','霸道','腹黑','元氣','憂鬱'];
const STYLES=[{v:'casual',l:'輕鬆日常'},{v:'sweet',l:'甜蜜撒嬌'},{v:'cool',l:'冷靜高冷'},{v:'gentle',l:'溫柔體貼'},{v:'playful',l:'活潑俏皮'},{v:'mature',l:'成熟穩重'},{v:'literary',l:'文藝感性'}];
const TALKATIVE=[{v:'quiet',l:'話很少'},{v:'mid',l:'適中'},{v:'lots',l:'話很多'}];
const CONFLICT=[{v:'direct',l:'直接表達'},{v:'cold',l:'冷戰迴避'},{v:'cute',l:'撒嬌化解'},{v:'rational',l:'理性溝通'}];
const CARE=[{v:'rarely',l:'幾乎不主動'},{v:'sometimes',l:'偶爾'},{v:'often',l:'經常'}];
const RELATIONS=[{v:'lover',l:'戀人'},{v:'childhood',l:'青梅竹馬'},{v:'friend',l:'好友'},{v:'online',l:'網友'},{v:'colleague',l:'同事'},{v:'stranger',l:'陌生人'}];
const REPLY_MODES=[{v:'manual',l:'手動'},{v:'auto',l:'自動'},{v:'auto-interrupt',l:'自動可打斷'}];
const LANGS=[{v:'zh-tw',l:'繁體中文'},{v:'zh-cn',l:'簡體中文'},{v:'en',l:'English'},{v:'ja',l:'日本語'},{v:'ko',l:'한국어'}];

const curTab = ref(0);
const isEdit = computed(() => !!route.params.id);
const charId = computed(() => route.params.id);

const DEFAULT_STORIES=[
  {id:'s_childhood',icon:'🌱',title:'童年與家庭',ph:'成長環境、家庭關係、童年重要事件…',content:'',custom:false,open:false},
  {id:'s_school',icon:'📚',title:'求學經歷',ph:'學生時代的故事、重要的人、關鍵轉折…',content:'',custom:false,open:false},
  {id:'s_love',icon:'💔',title:'感情史',ph:'曾經的感情、對感情的態度、受過的傷…',content:'',custom:false,open:false},
  {id:'s_turning',icon:'🌀',title:'重要轉折',ph:'改變人生方向的事件、最難忘的經歷…',content:'',custom:false,open:false},
  {id:'s_now',icon:'🏠',title:'現在的生活',ph:'目前的日常、生活節奏、居住狀況…',content:'',custom:false,open:false},
];

const char = ref({
  id: '',
  name: '',
  tagline: '',
  avatar: '🌸',
  age: '',
  job: '',
  location: '',
  persona: '',
  tags: [],
  stories: JSON.parse(JSON.stringify(DEFAULT_STORIES)),
  status: '',
  hobby: '',
  workTime: '',
  workPlace: '',
  restTime: '',
  scheduleTriggers: [],
  anniversaries: [],
  meetDate: '',
  style: 'casual',
  talkative: 'mid',
  call: '',
  phrase: '',
  examples: [],
  conflict: 'direct',
  care: 'sometimes',
  relation: '',
  rel_bg: '',
  rel_pos: '',
  overrideMe: false,
  you_name: '',
  you_role: '',
  you_persona: '',
  isAI: false,
  taboo: '',
  extra: '',
  replyMode: 'manual',
  delay: 1,
  minMsg: 1,
  maxMsg: 2,
  memory: 20,
  temperature: 0.8,
  timeAware: true,
  weatherAware: true,
  heartVoice: false,
  autoDiary: false,
  autoPost: false,
  proactiveMute: false,
  cycleCare: false,
  missYouEnabled: false,
  dailyQuestionEnabled: false,
  autoSummarize: false,
  autoSumEvery: 30,
  lang: 'zh-tw'
});

const showAvMenu = ref(false);
const showEmojiPicker = ref(false);
const hasAvImg = computed(() => char.value.avatar && char.value.avatar.startsWith('data:'));
const avFileInput = ref(null);

const addStoryPrompt = ref(false);
const confirmDeletePrompt = ref(false);
const newStoryTitle = ref('');

onMounted(async () => {
  if (isEdit.value) {
    const c = await dbGet('characters', charId.value);
    if (c) {
      char.value = { ...char.value, ...c };
      if (!c.stories) char.value.stories = JSON.parse(JSON.stringify(DEFAULT_STORIES));
      if (!char.value.anniversaries) char.value.anniversaries = [];
      // migrate legacy meetDate into anniversaries
      if (char.value.meetDate && char.value.anniversaries.length === 0) {
        char.value.anniversaries.push({ id: 'ann_meet_' + Date.now(), label: '認識紀念日', date: char.value.meetDate });
      }
    }
  } else {
    char.value.id = 'char_' + Date.now();
  }
});

function addAnniversary() {
  char.value.anniversaries.push({ id: 'ann_' + Date.now(), label: '', date: '' });
}

function removeAnniversary(i) {
  char.value.anniversaries.splice(i, 1);
}

function toggleTag(t) {
  const idx = char.value.tags.indexOf(t);
  if (idx > -1) {
    char.value.tags.splice(idx, 1);
  } else if (char.value.tags.length < 5) {
    char.value.tags.push(t);
  } else {
    window.toast_('最多選 5 個標籤');
  }
}

function triggerAvUpload() {
  showAvMenu.value = false;
  avFileInput.value.click();
}

function removeAvImg() {
  char.value.avatar = '🌸';
  showAvMenu.value = false;
}

function pickEmoji(e) {
  char.value.avatar = e;
  showEmojiPicker.value = false;
}

function onAvFileChange(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 200;
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      const s = Math.min(img.width, img.height);
      const ox = (img.width - s) / 2, oy = (img.height - s) / 2;
      ctx.drawImage(img, ox, oy, s, s, 0, 0, size, size);
      char.value.avatar = canvas.toDataURL('image/jpeg', 0.8);
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function doAddStory() {
  const val = newStoryTitle.value.trim();
  if (!val) {
    window.toast_('請輸入章節名稱');
    return;
  }
  const nb = {
    id: 'custom_' + Date.now(),
    icon: '📝',
    title: val,
    ph: '在這裡描述這個人生階段…',
    content: '',
    custom: true,
    open: true
  };
  char.value.stories.push(nb);
  addStoryPrompt.value = false;
  newStoryTitle.value = '';
}

async function removeStory(idx) {
  if (await window.confirm_('確定要刪除這個章節嗎？內容將無法復原。')) {
    char.value.stories.splice(idx, 1);
  }
}

async function saveChar() {
  if (!char.value.name.trim()) {
    window.toast_('請輸入角色名字');
    return;
  }
  if (!char.value.persona.trim()) {
    window.toast_('請填寫個性描述');
    return;
  }

  const wasNew = !isEdit.value;
  char.value.updatedAt = Date.now();
  if (wasNew && !char.value.createdAt) char.value.createdAt = Date.now();
  if (!char.value.worldId) char.value.worldId = 'main';

  await dbPut('characters', JSON.parse(JSON.stringify(char.value)));
  await globalStore.loadCharacters();
  window.toast_('角色已儲存');
  if (wasNew) router.replace('/char-edit/' + char.value.id);
}

async function doDeleteChar() {
  confirmDeletePrompt.value = false;
  await dbDel('characters', charId.value);
  // 連同角色所有衍生資料一併清除（與 CharManageView 一致），含 notifications，避免孤兒資料與死通知。
  const stores = ['messages', 'memories', 'chat_memories', 'moments', 'diary', 'dreams', 'notifications', 'wishes', 'notes'];
  for (const store of stores) {
    const items = await dbIdx(store, 'charId', charId.value);
    for (const item of items) await dbDel(store, item.id);
  }
  await globalStore.loadCharacters();
  router.push('/char-manage');
}
</script>
