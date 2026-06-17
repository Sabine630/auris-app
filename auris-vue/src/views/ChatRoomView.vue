<template>
  <div class="page active" id="pg-chat-room" style="display:flex;flex-direction:column; height: 100%">
    <!-- Header -->
    <div class="chat-hd">
      <div class="chat-hd-back" @click="$router.back()">
        <svg viewBox="0 0 8 14"><path d="M7 1L1 7L7 13"/></svg>
      </div>
      <div class="chat-hd-av" id="chat-av">
        <img v-if="cAvatar && cAvatar.startsWith('data:')" :src="cAvatar" style="width:100%;height:100%;object-fit:cover;border-radius:10px">
        <span v-else>{{ cAvatar || '🌸' }}</span>
      </div>
      <div class="chat-hd-info">
        <div class="chat-hd-name" id="chat-name">{{ cName }}</div>
        <div class="chat-hd-status" id="chat-status">在線</div>
      </div>
      <div class="chat-hd-mem" @click="openMemDrawer" :title="enabledMemCount ? `${enabledMemCount} 筆記憶已開啟` : '記憶抽屜'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
          <path d="M8 12c0-2.21 1.79-4 4-4s4 1.79 4 4-1.79 4-4 4"/>
          <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
        </svg>
        <span v-if="enabledMemCount" class="mem-badge">{{ enabledMemCount }}</span>
      </div>
      <div class="chat-hd-search" @click="openSearch" title="搜尋對話">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/>
        </svg>
      </div>
      <div class="chat-hd-more" @click="showMenu = true">⋯</div>
    </div>

    <!-- 全文搜尋列 -->
    <div class="chat-search" v-if="searchOpen">
      <svg class="chat-search-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/>
      </svg>
      <input class="chat-search-in" ref="searchInput" v-model="searchQuery" @input="runSearch"
        @keyup.enter="prevMatch" placeholder="搜尋這段對話…" />
      <span class="chat-search-count">{{ searchQuery.trim() ? (searchMatchIds.length ? (searchIdx + 1) + '/' + searchMatchIds.length : '0') : '' }}</span>
      <div class="chat-search-nav" :class="{ dis: searchMatchIds.length < 2 }" @click="prevMatch" title="上一則">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
      </div>
      <div class="chat-search-nav" :class="{ dis: searchMatchIds.length < 2 }" @click="nextMatch" title="下一則">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div class="chat-search-close" @click="closeSearch">取消</div>
    </div>

    <!-- Scroll Area -->
    <div style="flex:1;overflow-y:auto;scrollbar-width:none" id="chat-scroll" ref="scrollArea">
      <div class="chat-msgs" id="chat-msgs">
        
        <div v-if="!messages.length" style="text-align:center;padding:32px 0;font-size:12px;font-weight:300;color:var(--text-3);letter-spacing:.04em">
          說點什麼，開始你們的故事
        </div>

        <template v-for="(m, i) in messages" :key="m.id">
          <!-- Date Separator -->
          <div v-if="showDateSep(i)" class="chat-date-sep">{{ fmtDateSep(m.createdAt) }}</div>

          <!-- Heart Voice Insert -->
          <div v-if="m.type === 'hv'" class="hv-inline">
            <div class="hv-label">heart voice</div>
            <div class="hv-text">{{ m.content }}</div>
          </div>

          <!-- User Message -->
          <div v-else-if="m.role === 'user'" class="msg-with-av me-side">
            <div v-if="!isCont(i)" class="msg-av">
              <img v-if="meAvatar && meAvatar.startsWith('data:')" :src="meAvatar" style="width:100%;height:100%;object-fit:cover;border-radius:8px">
              <span v-else>{{ meAvatar || '🙂' }}</span>
            </div>
            <div v-else class="msg-av-spacer"></div>
            <div class="msg me">
              <img v-if="m.image" :src="m.image" class="msg-image msg-image-me" @click="viewImage(m.image)" />
              <div class="msg-bubble" :class="{ 'long-pressing': pressingMsgId === m.id }" :data-msg-id="m.id" data-role="user" v-html="m.content ? formatContent(m.content, globalStore.chatFormatStyle) : ''" @touchstart="startPress($event, m)" @touchmove="cancelPress" @touchend="cancelPress" @touchcancel="cancelPress" @mousedown="startPress($event, m)" @mousemove="cancelPress" @mouseup="cancelPress" @mouseleave="cancelPress" @contextmenu.prevent v-show="!!m.content"></div>
              <div v-if="m.reaction" class="msg-reaction" @click="removeReaction(m)">{{ m.reaction }}</div>
              <div v-if="isLastInGroup(i)" class="msg-time">{{ fmtT(m.createdAt) }}</div>
            </div>
          </div>

          <!-- AI Message -->
          <template v-else>
            <div v-if="!isCont(i)" class="msg-with-av">
              <div class="msg-av">
                <img v-if="cAvatar && cAvatar.startsWith('data:')" :src="cAvatar" style="width:100%;height:100%;object-fit:cover;border-radius:8px">
                <span v-else>{{ cAvatar || '🌸' }}</span>
              </div>
              <div class="msg them">
                <div class="msg-bubble" :class="{ 'long-pressing': pressingMsgId === m.id, streaming: m.isStreaming }" :data-msg-id="m.id" data-role="assistant" v-html="formatContent(m.content, globalStore.chatFormatStyle)" @touchstart="startPress($event, m)" @touchmove="cancelPress" @touchend="cancelPress" @touchcancel="cancelPress" @mousedown="startPress($event, m)" @mousemove="cancelPress" @mouseup="cancelPress" @mouseleave="cancelPress" @contextmenu.prevent></div>
                <div v-if="m.reaction" class="msg-reaction" @click="removeReaction(m)">{{ m.reaction }}</div>
                <div v-if="isLastInGroup(i)" class="msg-time">{{ fmtT(m.createdAt) }}</div>
              </div>
            </div>
            <div v-else class="msg-cont them">
              <div class="msg-bubble" :class="{ 'long-pressing': pressingMsgId === m.id, streaming: m.isStreaming }" :data-msg-id="m.id" data-role="assistant" v-html="formatContent(m.content, globalStore.chatFormatStyle)" @touchstart="startPress($event, m)" @touchmove="cancelPress" @touchend="cancelPress" @touchcancel="cancelPress" @mousedown="startPress($event, m)" @mousemove="cancelPress" @mouseup="cancelPress" @mouseleave="cancelPress" @contextmenu.prevent></div>
              <div v-if="m.reaction" class="msg-reaction msg-reaction-cont" @click="removeReaction(m)">{{ m.reaction }}</div>
              <div v-if="isLastInGroup(i)" class="msg-time">{{ fmtT(m.createdAt) }}</div>
            </div>
          </template>
        </template>

        <!-- Typing Indicator -->
        <div v-if="isTyping" class="msg them" id="typing">
          <div class="msg-bubble" style="padding:12px 16px;border:.5px solid var(--border);background:var(--surface);border-radius:18px 18px 18px 4px;box-shadow:var(--sh)">
            <div style="display:flex;gap:4px;align-items:center">
              <div class="tdot"></div><div class="tdot"></div><div class="tdot"></div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- Edit Mode Bar -->
    <div v-if="editingMsgRef" style="background:var(--rose);color:#fff;font-size:12px;padding:8px 16px;display:flex;justify-content:space-between;align-items:center;animation:fade-in .2s ease">
      <div style="display:flex;align-items:center;gap:6px">
        <svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        <span>正在編輯歷史訊息...</span>
      </div>
      <div @click="cancelEdit" style="font-weight:600;padding:4px 8px;border-radius:4px;background:rgba(255,255,255,0.2);cursor:pointer">取消</div>
    </div>

    <!-- Image Preview Bar -->
    <div v-if="pendingImage" class="chat-img-preview">
      <img :src="pendingImage" class="chat-img-thumb" />
      <button class="chat-img-rm" @click="pendingImage = null">✕</button>
    </div>

    <!-- Input Area -->
    <div class="chat-ia">
      <input type="file" ref="fileInputRef" accept="image/*" style="display:none" @change="handleImageFile" />
      <input type="file" id="chat-import-input" accept=".json" style="display:none" @change="importChat" />
      <button class="chat-img-btn" @click="pickImage" :disabled="isTyping" title="傳送圖片">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
      </button>
      <button class="chat-img-btn chat-mic-btn" :class="{ recording: isRecording }" @click="toggleVoice" :disabled="isTyping" title="語音輸入">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10a7 7 0 01-14 0"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>
      </button>
      <textarea class="chat-in" ref="chatInp" v-model="inputContent" placeholder="說點什麼…" rows="1"
        @keydown.enter.exact.prevent="sendMsg" @input="handleInput"></textarea>
      <button class="chat-send" @click="sendMsg" :disabled="isTyping">
        <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>

    <!-- Options Menu -->
    <div class="menu-overlay" v-if="showMenu" @click="showMenu = false"></div>
    <div class="bottom-menu" :style="{ display: showMenu ? 'block' : 'none' }">
      <div style="padding:16px;border-bottom:.5px solid var(--border);text-align:center;font-weight:500">聊天選項</div>
      <div style="padding:8px 0">
        <div class="menu-item" @click="goCharInfo">
          <svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:var(--text);stroke-width:1.5;fill:none">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          <span>角色資訊</span>
        </div>
        <div class="menu-item" @click="goRelation">
          <svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:var(--text);stroke-width:1.5;fill:none">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
          </svg>
          <span>關係主頁</span>
        </div>
        <div class="menu-item" @click="goDiary">
          <svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:var(--text);stroke-width:1.5;fill:none">
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/><path d="M8 7h8M8 11h5"/>
          </svg>
          <span>他的日記</span>
        </div>
        <div class="menu-item" @click="goDream">
          <svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:var(--text);stroke-width:1.5;fill:none">
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
          </svg>
          <span>他的夢境</span>
        </div>
        <div class="menu-item" @click="goTogether">
          <svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:var(--text);stroke-width:1.5;fill:none">
            <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
          </svg>
          <span>我們的願望・備忘</span>
        </div>
        <div class="menu-item" @click="openDataMenu">
          <svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:var(--text);stroke-width:1.5;fill:none">
            <path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/>
          </svg>
          <span>聊天記錄管理</span>
          <span style="margin-left:auto;color:var(--text-3)">›</span>
        </div>
      </div>
      <div style="padding:0 16px 16px">
        <button @click="showMenu = false" style="width:100%;padding:12px;border-radius:12px;background:var(--surface);color:var(--text-3);border:.5px solid var(--border);font-size:13px;font-weight:400;cursor:pointer">取消</button>
      </div>
    </div>

    <!-- 聊天記錄管理（二層選單：低頻資料操作收在這） -->
    <div class="menu-overlay" v-if="showDataMenu" @click="showDataMenu = false"></div>
    <div class="bottom-menu" :style="{ display: showDataMenu ? 'block' : 'none' }">
      <div style="padding:16px;border-bottom:.5px solid var(--border);text-align:center;font-weight:500">聊天記錄管理</div>
      <div style="padding:8px 0">
        <div class="menu-item" @click="exportChat">
          <svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:var(--text);stroke-width:1.5;fill:none">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span>匯出聊天記錄</span>
        </div>
        <div class="menu-item" @click="triggerImportChat">
          <svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:var(--text);stroke-width:1.5;fill:none">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10" transform="scale(1,-1) translate(0,-24)"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span>匯入聊天記錄</span>
        </div>
        <div class="menu-item" @click="clearChat">
          <svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:var(--red);stroke-width:1.5;fill:none">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
          <span style="color:var(--red)">清除聊天記錄</span>
        </div>
      </div>
      <div style="padding:0 16px 16px">
        <button @click="showDataMenu = false" style="width:100%;padding:12px;border-radius:12px;background:var(--surface);color:var(--text-3);border:.5px solid var(--border);font-size:13px;font-weight:400;cursor:pointer">返回</button>
      </div>
    </div>

    <!-- Clear Chat Confirm -->
    <div class="menu-overlay" v-if="showClearConfirm" @click="showClearConfirm = false"></div>
    <div class="bottom-menu" :style="{ display: showClearConfirm ? 'block' : 'none' }">
      <div style="padding:20px 16px;text-align:center">
        <div style="font-weight:500;font-size:15px;margin-bottom:6px">確定要清除聊天記錄嗎？</div>
        <div style="font-size:12px;color:var(--text-3);font-weight:300;line-height:1.6">
          清除後所有與「{{ cName }}」的對話記錄將無法復原。
        </div>
      </div>
      <div style="display:flex;gap:10px;padding:0 16px 20px">
        <button @click="showClearConfirm = false"
          style="flex:1;padding:12px;border-radius:12px;background:var(--surface);color:var(--text);border:.5px solid var(--border);font-size:14px;font-weight:400;cursor:pointer">取消</button>
        <button @click="confirmClearChat"
          style="flex:1;padding:12px;border-radius:12px;background:#e74c3c;color:#fff;border:none;font-size:14px;font-weight:500;cursor:pointer">確認清除</button>
      </div>
    </div>

    <!-- Memory Drawer -->
    <div class="menu-overlay" v-if="showMemDrawer" @click="showMemDrawer = false"></div>
    <div class="mem-drawer" :class="{ open: showMemDrawer }">
      <div class="mem-drawer-hd">
        <span>記憶抽屜</span>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="mem-add-btn" @click="startAddMem" title="手動新增記憶">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
          <div class="mem-drawer-close" @click="showMemDrawer = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </div>
        </div>
      </div>

      <!-- 手動新增記憶表單 -->
      <div class="mem-new-form" v-if="showNewMemForm">
        <input class="mem-edit-title" v-model="newMemTitle" placeholder="標題（選填）" />
        <textarea class="mem-edit-content" v-model="newMemContent" rows="4" placeholder="輸入記憶內容..."></textarea>
        <div class="mem-edit-actions">
          <button class="mem-edit-cancel" @click="cancelAddMem">取消</button>
          <button class="mem-edit-save" @click="saveNewMem" :disabled="!newMemContent.trim()">新增</button>
        </div>
      </div>

      <div style="padding:12px 16px 8px">
        <button class="mem-sum-btn" @click="doSummarize" :disabled="isSummarizing">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:16px;height:16px;flex-shrink:0">
            <path d="M12 2a10 10 0 110 20A10 10 0 0112 2z"/><path d="M12 8v4l3 3"/>
          </svg>
          <span>{{ isSummarizing ? 'AI 總結中…' : `AI 總結近期 ${sumCount} 則對話` }}</span>
        </button>
      </div>

      <div class="mem-list" v-if="chatMems.length">
        <div class="mem-item" v-for="mem in chatMems" :key="mem.id">
          <!-- 編輯模式 -->
          <template v-if="editingMemId === mem.id">
            <div class="mem-edit-body">
              <input class="mem-edit-title" v-model="editTitle" placeholder="標題" />
              <textarea class="mem-edit-content" v-model="editContent" rows="4" placeholder="記憶內容"></textarea>
              <div class="mem-edit-actions">
                <button class="mem-edit-cancel" @click="cancelEditMem">取消</button>
                <button class="mem-edit-save" @click="saveEditMem(mem)">儲存</button>
              </div>
            </div>
          </template>
          <!-- 一般模式 -->
          <template v-else>
            <label class="mem-toggle">
              <input type="checkbox" :checked="mem.enabled" @change="toggleMem(mem)">
              <span class="mem-toggle-track"></span>
            </label>
            <div class="mem-body" @click="expandedMemId = expandedMemId === mem.id ? null : mem.id">
              <div class="mem-title">{{ mem.title }}</div>
              <div class="mem-content" :class="{ expanded: expandedMemId === mem.id }">{{ mem.content }}</div>
            </div>
            <div class="mem-edit-btn" @click="startEditMem(mem)" title="編輯">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </div>
            <div class="mem-del" @click="deleteMem(mem.id)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
            </div>
          </template>
        </div>
      </div>
      <div v-else style="padding:24px 16px;text-align:center;font-size:12px;font-weight:300;color:var(--text-3)">
        還沒有記憶。點上方按鈕讓 AI 自動總結對話吧
      </div>

      <div class="mem-footer">
        <span>已開啟 {{ enabledMemCount }} 筆・約 {{ enabledTokenEstimate }} token</span>
      </div>
    </div>

    <!-- Message Action Sheet -->
    <div class="msg-sheet-mask show" v-if="activeMsg" @click="activeMsg = null"></div>
    <div class="msg-sheet show" v-if="activeMsg">
      <div class="msg-react-bar">
        <div v-for="e in REACTIONS" :key="e" class="msg-react-opt" :class="{ sel: activeMsg.reaction === e }" @click="setReaction(activeMsg, e)">{{ e }}</div>
      </div>
      <div class="msg-sheet-item" @click="doCopy(activeMsg)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/></svg>
        <span>複製</span>
      </div>
      <div class="msg-sheet-item" v-if="isLatestUserMsg(activeMsg)" @click="doEditAndResend(activeMsg)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        <span>編輯並重傳</span>
      </div>
      <div class="msg-sheet-item" v-if="isLatestAiMsg(activeMsg)" @click="doRegenerate(activeMsg)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
        <span>重新生成回覆</span>
      </div>
      <div class="msg-sheet-cancel" @click="activeMsg = null">取消</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { dbGet, dbIdx, dbDel, dbPut, getSetting } from '../services/db.js';
import { sendUserMessage, generateAIResponseStream, generateProactiveMessageStream, summarizeToMemory, hasUnrepliedProactive } from '../services/chatEngine.js';
import { formatContent, splitReply } from '../services/format.js';
import { globalStore } from '../store/index.js';

const route = useRoute();
const router = useRouter();
const charId = route.params.id;

const messages = ref([]);
const character = ref(null);
const inputContent = ref('');
const isTyping = ref(false);
const showMenu = ref(false);
const showDataMenu = ref(false);
const showClearConfirm = ref(false);

// 全文搜尋
const searchOpen = ref(false);
const searchQuery = ref('');
const searchMatchIds = ref([]);
const searchIdx = ref(0);
const searchInput = ref(null);

const scrollArea = ref(null);
const chatInp = ref(null);

const cName = ref('—');
const cAvatar = ref('');

// ── 語音輸入 ──────────────────────────────────────────────────────────────
const isRecording = ref(false);
let recognition = null;

function toggleVoice() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    window.toast_('您的瀏覽器不支援語音輸入');
    return;
  }
  if (isRecording.value) {
    recognition?.stop();
    return;
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR();
  recognition.lang = 'zh-TW';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onstart = () => { isRecording.value = true; };
  recognition.onend = () => { isRecording.value = false; };
  recognition.onerror = () => { isRecording.value = false; };
  recognition.onresult = (e) => {
    const text = e.results[0][0].transcript;
    inputContent.value = (inputContent.value + text).trim();
    chatInp.value?.dispatchEvent(new Event('input'));
  };
  recognition.start();
}
const meAvatar = ref('🙂');

// ── Long Press & Actions State ──
const activeMsg = ref(null);
const pressingMsgId = ref(null);
let pressTimer = null;
let pressStartXY = null;
const editingMsgRef = ref(null);

// ── Memory Drawer State ──
const showMemDrawer = ref(false);
const chatMems = ref([]);
const isSummarizing = ref(false);
const expandedMemId = ref(null);
const editingMemId = ref(null);
const editTitle = ref('');
const editContent = ref('');
const showNewMemForm = ref(false);
const newMemTitle = ref('');
const newMemContent = ref('');
const sumCount = 20;
let isAutoSumming = false;
const REACTIONS = ['❤️', '😂', '👍', '😮', '😢', '🙏'];

// ── Image Attachment State ──
const pendingImage = ref(null); // base64 string，同時用於 API 和存 DB
const fileInputRef = ref(null);

function compressImage(file, maxPx = 512, quality = 0.8) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

function pickImage() { fileInputRef.value?.click(); }

function viewImage(src) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:zoom-out';
  const img = document.createElement('img');
  img.src = src;
  img.style.cssText = 'max-width:94%;max-height:94%;border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,.5)';
  overlay.appendChild(img);
  overlay.onclick = () => overlay.remove();
  document.body.appendChild(overlay);
}

async function handleImageFile(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  e.target.value = '';
  if (!file.type.startsWith('image/')) { window.toast_('請選擇圖片檔案'); return; }
  const compressed = await compressImage(file);
  if (compressed) pendingImage.value = compressed;
  else window.toast_('圖片處理失敗');
}

const enabledMemCount = computed(() => chatMems.value.filter(m => m.enabled).length);
const enabledTokenEstimate = computed(() => {
  const total = chatMems.value.filter(m => m.enabled).reduce((acc, m) => acc + m.content.length, 0);
  return Math.ceil(total / 3);
});

// ── Proactive Timer State (P49) ──
let proactiveTimer = null;
let proactiveController = null;
const isProactiveGenerating = ref(false);
const CARE_INTERVALS = { rarely: [12, 25], sometimes: [4, 10], often: [1, 4] };
// 即時主動冷卻地板：距最後一則訊息未滿此時間就先不主動，避免剛互動完角色馬上又自己補一則（可調）。
const PROACTIVE_FLOOR_MS = 3 * 60 * 1000; // 3 分鐘

onMounted(async () => {
  const c = await dbGet('characters', charId);
  if (!c) {
    router.push('/');
    return;
  }
  character.value = c;
  cName.value = c.name;
  cAvatar.value = c.avatar;

  if (c.unreadCount > 0 || c.hasUnread) {
    c.unreadCount = 0;
    c.hasUnread = false;
    await dbPut('characters', c);
  }

  const me = await getSetting('me_settings');
  if (me?.avatar) meAvatar.value = me.avatar;

  await loadMessages();
  await loadChatMems();
  // 由通知帶 ?msg=訊息id 進來 → 捲到該則並高亮（無則維持 loadMessages 的捲到底）
  if (route.query.msg) scrollToMessage(route.query.msg);
  scheduleProactive();

  // Listen for background Heart Voices
  window.addEventListener('new-heart-voice', onHeartVoice);
  // 背景派發器寫入主動訊息時，即時把這間聊天室的訊息重撈一次（E）
  window.addEventListener('new-proactive-msg', onProactiveMsg);
});

onUnmounted(() => {
  clearTimeout(proactiveTimer);
  proactiveController?.abort();
  window.removeEventListener('new-heart-voice', onHeartVoice);
  window.removeEventListener('new-proactive-msg', onProactiveMsg);
});

async function loadMessages() {
  const msgs = await dbIdx('messages', 'charId', charId);
  msgs.sort((a, b) => a.createdAt - b.createdAt);
  messages.value = msgs;
  scrollToBottom();
}

async function loadChatMems() {
  const mems = await dbIdx('chat_memories', 'charId', charId);
  mems.sort((a, b) => b.createdAt - a.createdAt);
  chatMems.value = mems;
}

async function openMemDrawer() {
  await loadChatMems();
  showMemDrawer.value = true;
}

async function toggleMem(mem) {
  mem.enabled = !mem.enabled;
  await dbPut('chat_memories', { ...mem });
}

async function deleteMem(id) {
  await dbDel('chat_memories', id);
  chatMems.value = chatMems.value.filter(m => m.id !== id);
  if (editingMemId.value === id) editingMemId.value = null;
}

function startAddMem() {
  showNewMemForm.value = true;
  newMemTitle.value = '';
  newMemContent.value = '';
  editingMemId.value = null;
}

function cancelAddMem() {
  showNewMemForm.value = false;
}

async function saveNewMem() {
  const content = newMemContent.value.trim();
  if (!content) return;
  const title = newMemTitle.value.trim() || content.slice(0, 20) + (content.length > 20 ? '…' : '');
  const entry = { id: 'cmem_' + Date.now(), charId, title, content, enabled: true, createdAt: Date.now() };
  await dbPut('chat_memories', entry);
  chatMems.value.unshift(entry);
  showNewMemForm.value = false;
}

function startEditMem(mem) {
  editingMemId.value = mem.id;
  editTitle.value = mem.title;
  editContent.value = mem.content;
  expandedMemId.value = null;
}

function cancelEditMem() {
  editingMemId.value = null;
}

async function saveEditMem(mem) {
  const t = editTitle.value.trim();
  const c = editContent.value.trim();
  if (!t && !c) return;
  mem.title = t || mem.title;
  mem.content = c || mem.content;
  await dbPut('chat_memories', { ...mem });
  editingMemId.value = null;
}

// ── Proactive Timer Functions ──
function scheduleProactive() {
  clearTimeout(proactiveTimer);
  const mode = character.value?.replyMode;
  if (!mode || mode === 'manual' || character.value?.proactiveMute) return;

  const care = character.value?.care || 'sometimes';
  const [min, max] = CARE_INTERVALS[care] || CARE_INTERVALS.sometimes;
  const intervalMs = (min + Math.random() * (max - min)) * 60 * 1000;

  const lastMsg = messages.value.length ? messages.value[messages.value.length - 1] : null;
  const elapsed = lastMsg ? Date.now() - lastMsg.createdAt : intervalMs + 1;
  const delay = Math.max(3000, intervalMs - elapsed);

  proactiveTimer = setTimeout(triggerProactive, delay);
}

async function triggerProactive() {
  if (isTyping.value || isProactiveGenerating.value) { scheduleProactive(); return; }
  // 勿擾時段（23:00–08:00）不主動打擾，與背景派發規則一致（D）。重排計時器，等過了勿擾時段再說。
  const h = new Date().getHours();
  if (h >= 23 || h < 8) { scheduleProactive(); return; }
  // 冷卻地板：剛互動完不要馬上又自己補一則（care=often 最短 1 分鐘 → 補一個下限），避免黏人/自言自語。
  const lastReal = [...messages.value].reverse().find(m => m.type !== 'hv');
  if (lastReal && Date.now() - lastReal.createdAt < PROACTIVE_FLOOR_MS) { scheduleProactive(); return; }
  // 背景派發已發過一則還沒回的主動訊息，就先別在聊天室再疊一則（避免兩套系統互疊）
  try { if (await hasUnrepliedProactive(charId)) { scheduleProactive(); return; } } catch (_) {}

  const rawMsgs = messages.value.filter(m => m.type !== 'hv');
  proactiveController = new AbortController();
  isProactiveGenerating.value = true;

  try {
    isTyping.value = true;
    const { msgs } = await streamSegmentedReply(
      (handlers) => generateProactiveMessageStream(charId, rawMsgs, { ...handlers, signal: proactiveController.signal })
    );
    if (msgs.length) {
      await dbPut('notifications', { id: 'notif_chat_' + Date.now(), charId, type: 'chat', targetId: charId, messageId: msgs[0]?.id, text: '主動傳了訊息給你', read: false, createdAt: Date.now() });
    }
  } catch (err) {
    if (err.name !== 'AbortError') console.error('Proactive error:', err);
  } finally {
    isTyping.value = false;
    isProactiveGenerating.value = false;
    proactiveController = null;
    scheduleProactive();
    maybeAutoSummarize();
  }
}

function handleInput() {
  autoResize();
  if (character.value?.replyMode === 'auto-interrupt' && isProactiveGenerating.value) {
    proactiveController?.abort();
  }
}

async function doSummarize() {
  if (isSummarizing.value) return;
  const rawMsgs = messages.value.filter(m => m.type !== 'hv');
  if (rawMsgs.length < 2) {
    window.toast_('對話記錄太少，無法總結');
    return;
  }
  isSummarizing.value = true;
  try {
    const mem = await summarizeToMemory(charId, rawMsgs, sumCount);
    chatMems.value.unshift(mem);
    window.toast_('已儲存 AI 總結記憶');
  } catch (err) {
    window.toast_('總結失敗：' + err.message);
  } finally {
    isSummarizing.value = false;
  }
}

// 自動總結記憶：累積到設定則數時，背景觸發一次濃縮
async function maybeAutoSummarize() {
  const c = character.value;
  if (!c?.autoSummarize || isAutoSumming || isSummarizing.value) return;

  const every = c.autoSumEvery || 30;
  const lastAt = c.lastAutoSumAt || 0;
  const rawMsgs = messages.value.filter(m => m.type !== 'hv');
  const freshCount = rawMsgs.filter(m => m.createdAt > lastAt).length;
  if (freshCount < every) return;

  isAutoSumming = true;
  try {
    const mem = await summarizeToMemory(charId, rawMsgs, every);
    chatMems.value.unshift(mem);
    c.lastAutoSumAt = Date.now();
    await dbPut('characters', { ...c });
    window.toast_('已自動總結記憶');
  } catch (err) {
    console.error('Auto summarize failed:', err);
    // 自動流程失敗不打擾使用者，下次達標再試
  } finally {
    isAutoSumming = false;
  }
}

// 背景派發（想你／每日一問／定時／生理期）寫入訊息後，即時重撈、排序、捲到底（E）。
// 用 loadMessages 是因為背景訊息已寫進 DB，重撈才能拿到正確的 createdAt 排序，
// 不會像以前那樣等下次重開房才「插進歷史中間」。
function onProactiveMsg(e) {
  if (e.detail?.charId === charId) loadMessages();
}

function onHeartVoice(e) {
  const mem = e.detail;
  if (mem.charId === charId) {
    // Inject heart voice into the chat UI seamlessly
    messages.value.push({
      ...mem,
      type: 'hv' // special type so template renders it as heart voice
    });
    scrollToBottom();
  }
}

function isCont(i) {
  if (i === 0) return false;
  const m = messages.value[i];
  const prev = messages.value[i - 1];
  if (!prev) return false;
  if (m.type === 'hv' || prev.type === 'hv') return false;
  return prev.role === m.role && (m.createdAt - prev.createdAt) < 120000;
}

// 該則是否為同組最後一則（下一則不是它的連續訊息 → 時間掛在這裡，整組結束後才顯示）
function isLastInGroup(i) {
  return i === messages.value.length - 1 || !isCont(i + 1);
}

function showDateSep(i) {
  const m = messages.value[i];
  if (!m?.createdAt || m.type === 'hv') return false;
  if (i === 0) return true;
  const prev = messages.value[i - 1];
  if (!prev?.createdAt) return false;
  const d1 = new Date(m.createdAt);
  const d2 = new Date(prev.createdAt);
  return d1.getDate() !== d2.getDate() || d1.getMonth() !== d2.getMonth() || d1.getFullYear() !== d2.getFullYear();
}

function fmtDateSep(ts) {
  const d = new Date(ts);
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日　星期${weekdays[d.getDay()]}`;
}

function fmtT(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function autoResize() {
  if (!chatInp.value) return;
  const el = chatInp.value;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 100) + 'px';
}

function scrollToBottom() {
  nextTick(() => {
    if (scrollArea.value) {
      scrollArea.value.scrollTop = scrollArea.value.scrollHeight;
    }
  });
}

function isNearBottom() {
  const el = scrollArea.value;
  if (!el) return true;
  return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
}

// 串流逐段顯示（真人 LINE 連發短泡泡）：onChunk 累積 buffer，依 splitReply 把已封段
// 固定成實心氣泡、最後一段維持串流中，達成「一顆定住→下一顆冒出」。
// 回覆氣泡永遠是 messages.value 的尾端（送訊/重生/主動三種情境皆如此），故以「最後 N 顆」管理 live placeholder。
// genFn：(handlers) => Promise<{ msgs, truncated }>，由本函式注入 { onChunk }；最後用已落庫的 msgs 換掉 live 氣泡。
async function streamSegmentedReply(genFn) {
  const maxSeg = character.value?.maxMsg || 2;
  const stamp = Date.now();
  let buffer = '';
  let liveCount = 0;
  const removeLive = () => {
    if (liveCount > 0) {
      messages.value.splice(messages.value.length - liveCount, liveCount);
      liveCount = 0;
    }
  };
  try {
    const { msgs, truncated } = await genFn({
      onChunk(text) {
        buffer += text;
        const segs = splitReply(buffer, maxSeg);
        if (!segs.length) return;
        if (liveCount === 0) isTyping.value = false;
        // 段數只增不減；不足就補新的串流氣泡（新段落出現＝又冒一顆）
        while (liveCount < segs.length) {
          messages.value.push({ id: 'streaming_' + stamp + '_' + liveCount, charId, role: 'assistant', content: '', createdAt: stamp + liveCount, isStreaming: true });
          liveCount++;
        }
        const start = messages.value.length - liveCount;
        for (let i = 0; i < liveCount; i++) {
          messages.value[start + i].content = segs[i] || '';
          messages.value[start + i].isStreaming = (i === liveCount - 1); // 只有最後一顆還在打字
        }
        if (isNearBottom()) scrollToBottom();
      }
    });
    removeLive();
    const out = msgs || [];
    if (out.length) { messages.value.push(...out); scrollToBottom(); }
    return { msgs: out, truncated };
  } catch (err) {
    removeLive();
    throw err;
  }
}

async function sendMsg() {
  const content = inputContent.value.trim();
  if ((!content && !pendingImage.value) || isTyping.value) return;

  if (editingMsgRef.value) {
    const toDelete = messages.value.filter(x => x.createdAt >= editingMsgRef.value.createdAt);
    for (const x of toDelete) await dbDel('messages', x.id);
    messages.value = messages.value.filter(x => x.createdAt < editingMsgRef.value.createdAt);
    editingMsgRef.value = null;
  }

  const imgToSend = pendingImage.value;
  const userMsg = await sendUserMessage(charId, content, imgToSend);
  messages.value.push(userMsg);
  inputContent.value = '';
  pendingImage.value = null;
  autoResize();
  scrollToBottom();

  isTyping.value = true;
  const rawMsgs = messages.value.filter(m => m.type !== 'hv');

  try {
    const { msgs, truncated } = await streamSegmentedReply(
      (handlers) => generateAIResponseStream(charId, rawMsgs, handlers, imgToSend)
    );
    if (!msgs.length) {
      window.toast_('代理回傳空回應，請確認代理是否支援串流、或換用其他代理');
    }
    if (truncated) window.toast_('⚠ 回覆可能被截斷，可長按訊息「重新生成回覆」');
  } catch (err) {
    console.error('Chat error:', err);
    window.toast_('錯誤：' + err.message);
  } finally {
    isTyping.value = false;
    scheduleProactive();
    maybeAutoSummarize();
  }
}

// ── Menu Actions ──
function goCharInfo() {
  showMenu.value = false;
  router.push('/char-edit/' + charId);
}

function goRelation() {
  showMenu.value = false;
  router.push('/relation/' + charId);
}

function goDiary() {
  showMenu.value = false;
  router.push({ path: '/diary', query: { char: charId } });
}

function goDream() {
  showMenu.value = false;
  router.push({ path: '/dream', query: { char: charId } });
}

function goTogether() {
  showMenu.value = false;
  router.push('/together/' + charId);
}

// ── 全文搜尋 ──────────────────────────────────────────────
function openSearch() {
  showMenu.value = false;
  searchOpen.value = true;
  nextTick(() => searchInput.value?.focus());
}

function closeSearch() {
  searchOpen.value = false;
  searchQuery.value = '';
  searchMatchIds.value = [];
  searchIdx.value = 0;
}

function runSearch() {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) { searchMatchIds.value = []; searchIdx.value = 0; return; }
  const ids = messages.value
    .filter(m => m.content && m.content.toLowerCase().includes(q))
    .map(m => m.id);
  searchMatchIds.value = ids;
  if (ids.length) {
    searchIdx.value = ids.length - 1;   // 從最新的命中開始（最靠近目前底部）
    scrollToMatch();
  } else {
    searchIdx.value = 0;
  }
}

function prevMatch() {
  const n = searchMatchIds.value.length;
  if (n < 2) { if (n === 1) scrollToMatch(); return; }
  searchIdx.value = (searchIdx.value - 1 + n) % n;
  scrollToMatch();
}

function nextMatch() {
  const n = searchMatchIds.value.length;
  if (n < 2) { if (n === 1) scrollToMatch(); return; }
  searchIdx.value = (searchIdx.value + 1) % n;
  scrollToMatch();
}

function scrollToMatch() {
  const id = searchMatchIds.value[searchIdx.value];
  if (id == null) return;
  nextTick(() => {
    const el = scrollArea.value?.querySelector(`[data-msg-id="${id}"]`);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el.classList.add('search-hit');
    setTimeout(() => el.classList.remove('search-hit'), 1600);
  });
}

// 由通知點擊進來時（?msg=訊息id），捲到該則並閃爍高亮（沿用搜尋的 .search-hit 機制）
function scrollToMessage(id) {
  if (!id) return;
  nextTick(() => {
    const el = scrollArea.value?.querySelector(`[data-msg-id="${id}"]`);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el.classList.add('search-hit');
    setTimeout(() => el.classList.remove('search-hit'), 1600);
  });
}

function openDataMenu() {
  showMenu.value = false;
  showDataMenu.value = true;
}

function clearChat() {
  showDataMenu.value = false;
  showClearConfirm.value = true;
}

async function confirmClearChat() {
  const msgs = await dbIdx('messages', 'charId', charId);
  for (const m of msgs) {
    await dbDel('messages', m.id);
  }
  messages.value = [];
  showClearConfirm.value = false;
}

function exportChat() {
  showDataMenu.value = false;
  const exportable = messages.value.filter(m => m.type !== 'hv');
  if (!exportable.length) {
    window.toast_('目前沒有聊天記錄可以匯出');
    return;
  }
  const payload = {
    aurisChatExportVersion: 1,
    exportDate: Date.now(),
    charName: cName.value,
    messages: exportable,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chat_${cName.value}_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  window.toast_('已匯出聊天記錄（JSON）');
}

function triggerImportChat() {
  showDataMenu.value = false;
  document.getElementById('chat-import-input').click();
}

async function importChat(e) {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;
  try {
    const text = await file.text();
    const json = JSON.parse(text);
    if (!json || json.aurisChatExportVersion !== 1 || !Array.isArray(json.messages)) {
      window.toast_('格式錯誤，請選擇正確的聊天記錄備份檔');
      return;
    }
    const base = Date.now();
    let count = 0;
    for (let i = 0; i < json.messages.length; i++) {
      const m = json.messages[i];
      if (!m || !m.role || !m.content) continue;
      await dbPut('messages', { ...m, id: `msg_import_${base}_${i}`, charId });
      count++;
    }
    const allMsgs = await dbIdx('messages', 'charId', charId);
    allMsgs.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    messages.value = allMsgs;
    window.toast_(`已匯入 ${count} 則訊息`);
  } catch {
    window.toast_('匯入失敗，檔案損毀或格式錯誤');
  }
}

// ── Long Press Handlers ──
function startPress(e, m) {
  if (m.isEditing) return;
  const t = e.touches ? e.touches[0] : e;
  pressStartXY = { x: t.clientX, y: t.clientY };
  pressingMsgId.value = m.id;
  
  pressTimer = setTimeout(() => {
    pressingMsgId.value = null;
    if (navigator.vibrate) navigator.vibrate(20);
    activeMsg.value = m;
  }, 380);
}

function cancelPress(e) {
  if (e && (e.type === 'touchmove' || e.type === 'mousemove') && pressStartXY) {
    const t = e.touches ? e.touches[0] : e;
    if (Math.abs(t.clientX - pressStartXY.x) < 8 && Math.abs(t.clientY - pressStartXY.y) < 8) return;
  }
  if (pressTimer) {
    clearTimeout(pressTimer);
    pressTimer = null;
  }
  pressingMsgId.value = null;
  pressStartXY = null;
}

// ── Action Sheet Checks ──
function isLatestUserMsg(m) {
  if (m.role !== 'user') return false;
  const userMsgs = messages.value.filter(x => x.role === 'user');
  if (!userMsgs.length) return false;
  return userMsgs[userMsgs.length - 1].id === m.id;
}

function isLatestAiMsg(m) {
  if (m.role !== 'assistant') return false;
  const aiMsgs = messages.value.filter(x => x.role === 'assistant');
  if (!aiMsgs.length) return false;
  return aiMsgs[aiMsgs.length - 1].id === m.id;
}

// ── Action Implementations ──
function copyTextSync(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:0;left:0;width:2em;height:2em;padding:0;border:none;outline:none;box-shadow:none;background:transparent;opacity:0;-webkit-user-select:text !important;user-select:text !important';
    ta.setAttribute('readonly', '');
    document.body.appendChild(ta);
    ta.focus();
    const range = document.createRange();
    range.selectNodeContents(ta);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    sel.removeAllRanges();
    ta.remove();
    if (ok) return true;
  } catch (e) {}
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
    return true;
  }
  return false;
}

function doCopy(m) {
  const ok = copyTextSync(m.content);
  activeMsg.value = null;
  window.toast_(ok ? '已複製' : '複製失敗，請手動選取');
}

async function setReaction(m, emoji) {
  // 點同一個表情＝取消
  m.reaction = m.reaction === emoji ? '' : emoji;
  activeMsg.value = null;
  try {
    const stored = await dbGet('messages', m.id);
    if (stored) { stored.reaction = m.reaction; await dbPut('messages', stored); }
  } catch (e) { console.error('save reaction failed:', e); }
}

async function removeReaction(m) {
  m.reaction = '';
  try {
    const stored = await dbGet('messages', m.id);
    if (stored) { stored.reaction = ''; await dbPut('messages', stored); }
  } catch (e) { console.error('remove reaction failed:', e); }
}

function doEditAndResend(m) {
  activeMsg.value = null;
  if (isTyping.value) {
    window.toast_('請等對方回覆完成');
    return;
  }
  editingMsgRef.value = m;
  inputContent.value = m.content;
  autoResize();
  chatInp.value?.focus();
}

function cancelEdit() {
  editingMsgRef.value = null;
  inputContent.value = '';
  autoResize();
}

async function doRegenerate(m) {
  activeMsg.value = null;
  if (isTyping.value) {
    window.toast_('請等對方回覆完成');
    return;
  }

  const toDelete = messages.value.filter(x => x.createdAt >= m.createdAt);
  for (const x of toDelete) await dbDel('messages', x.id);
  messages.value = messages.value.filter(x => x.createdAt < m.createdAt);

  isTyping.value = true;
  const rawMsgs = messages.value.filter(x => x.type !== 'hv');

  try {
    const { msgs, truncated } = await streamSegmentedReply(
      (handlers) => generateAIResponseStream(charId, rawMsgs, handlers)
    );
    if (!msgs.length) {
      window.toast_('代理回傳空回應，請確認代理是否支援串流、或換用其他代理');
    }
    if (truncated) window.toast_('⚠ 回覆可能被截斷');
  } catch (err) {
    console.error('Chat error:', err);
    window.toast_('錯誤：' + err.message);
  } finally {
    isTyping.value = false;
  }
}
</script>

<style scoped>
.page { height: 100%; }

/* ── Date Separator ── */
.chat-date-sep {
  text-align: center;
  font-size: 11px;
  font-weight: 300;
  color: var(--text-3);
  padding: 12px 0 4px;
  letter-spacing: .04em;
}

/* ── Image Attachment ── */
.chat-img-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--surface);
  border-top: .5px solid var(--border);
}
.chat-img-thumb {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 8px;
  border: .5px solid var(--border);
}
.chat-img-rm {
  background: rgba(0,0,0,.35);
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: -24px;
  margin-top: -40px;
  align-self: flex-start;
}
.chat-img-btn {
  background: none;
  border: none;
  padding: 0 4px;
  cursor: pointer;
  color: var(--text-3);
  display: flex;
  align-items: center;
  transition: color .15s;
}
.chat-img-btn:hover { color: var(--rose); }
.chat-img-btn svg { width: 22px; height: 22px; }
.chat-img-btn:disabled { opacity: .4; pointer-events: none; }
.chat-mic-btn.recording { color: var(--rose); animation: mic-pulse 1s ease-in-out infinite; }
@keyframes mic-pulse { 0%,100% { opacity: 1; } 50% { opacity: .4; } }

.msg-image {
  display: block;
  max-width: 200px;
  max-height: 200px;
  border-radius: 10px;
  object-fit: cover;
  cursor: zoom-in;
  margin-bottom: 4px;
  border: .5px solid rgba(0,0,0,.08);
}
.msg-image-me { margin-left: auto; }

.msg-bubble.streaming::after {
  content: '▍';
  display: inline-block;
  margin-left: 1px;
  animation: blink-cursor .8s step-end infinite;
  color: var(--text-3);
  font-size: .85em;
  vertical-align: baseline;
}
@keyframes blink-cursor { 50% { opacity: 0; } }

/* Memory icon button in header */
.chat-hd-mem {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  margin-right: 2px;
  color: var(--text-3);
}
.chat-hd-mem svg { width: 20px; height: 20px; }

/* 全文搜尋 */
.chat-hd-search {
  width: 32px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-3);
}
.chat-hd-search svg { width: 19px; height: 19px; }
.chat-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--surface);
  border-bottom: .5px solid var(--border);
}
.chat-search-ic { width: 16px; height: 16px; color: var(--text-3); flex-shrink: 0; }
.chat-search-in {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  outline: none;
  font-size: 14px;
  color: var(--text);
}
.chat-search-count { font-size: 12px; color: var(--text-3); flex-shrink: 0; min-width: 24px; text-align: right; }
.chat-search-nav {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text);
  flex-shrink: 0;
}
.chat-search-nav svg { width: 18px; height: 18px; }
.chat-search-nav.dis { color: var(--text-3); opacity: .35; pointer-events: none; }
.chat-search-close { font-size: 13px; color: var(--rose); cursor: pointer; flex-shrink: 0; padding-left: 4px; }
.msg-bubble.search-hit {
  animation: search-flash 1.6s ease;
}
@keyframes search-flash {
  0%, 100% { box-shadow: 0 0 0 0 transparent; }
  20%, 60% { box-shadow: 0 0 0 2px var(--rose); }
}
.mem-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  background: var(--rose);
  color: #fff;
  font-size: 9px;
  font-weight: 600;
  border-radius: 6px;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Memory Drawer */
.mem-drawer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 72vh;
  background: var(--bg);
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -4px 32px rgba(0,0,0,.12);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  transform: translateY(100%);
  transition: transform .3s cubic-bezier(.32,.72,0,1);
}
.mem-drawer.open { transform: translateY(0); }

.mem-drawer-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 12px;
  font-weight: 500;
  font-size: 15px;
  border-bottom: .5px solid var(--border);
  flex-shrink: 0;
}
.mem-drawer-close {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-3);
}
.mem-drawer-close svg { width: 16px; height: 16px; }

.mem-sum-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 16px;
  border-radius: 12px;
  background: var(--surface);
  border: .5px solid var(--border);
  color: var(--text);
  font-size: 13px;
  font-weight: 400;
  cursor: pointer;
  transition: opacity .15s;
}
.mem-sum-btn:disabled { opacity: .5; cursor: not-allowed; }

.mem-list {
  overflow-y: auto;
  flex: 1;
  padding: 4px 0 8px;
}

.mem-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 16px;
  border-bottom: .5px solid var(--border);
}

.mem-toggle { flex-shrink: 0; margin-top: 2px; }
.mem-toggle input { display: none; }
.mem-toggle-track {
  display: block;
  width: 36px;
  height: 20px;
  border-radius: 10px;
  background: var(--border);
  position: relative;
  cursor: pointer;
  transition: background .2s;
}
.mem-toggle-track::after {
  content: '';
  position: absolute;
  left: 3px;
  top: 3px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  transition: transform .2s;
  box-shadow: 0 1px 3px rgba(0,0,0,.2);
}
.mem-toggle input:checked + .mem-toggle-track { background: var(--rose); }
.mem-toggle input:checked + .mem-toggle-track::after { transform: translateX(16px); }

.mem-body { flex: 1; min-width: 0; cursor: pointer; }
.mem-title { font-size: 12px; font-weight: 500; color: var(--text); margin-bottom: 3px; }
.mem-content {
  font-size: 11px;
  font-weight: 300;
  color: var(--text-3);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.mem-content.expanded {
  display: block;
  -webkit-line-clamp: unset;
  overflow: visible;
}

.mem-add-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-3);
  border-radius: 6px;
  transition: color .15s;
}
.mem-add-btn:active { color: var(--rose); }
.mem-add-btn svg { width: 18px; height: 18px; }

.mem-new-form {
  padding: 8px 16px 12px;
  border-bottom: .5px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mem-edit-btn {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-3);
  margin-top: -2px;
}
.mem-edit-btn svg { width: 15px; height: 15px; }

.mem-del {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-3);
  margin-top: -2px;
}
.mem-del svg { width: 16px; height: 16px; }

.mem-edit-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 2px 0;
}
.mem-edit-title {
  font-family: var(--font);
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  background: var(--surface);
  border: .5px solid var(--border-2);
  border-radius: 8px;
  padding: 7px 10px;
  outline: none;
  -webkit-user-select: text;
  user-select: text;
}
.mem-edit-content {
  font-family: var(--font);
  font-size: 12px;
  font-weight: 300;
  color: var(--text);
  background: var(--surface);
  border: .5px solid var(--border-2);
  border-radius: 8px;
  padding: 7px 10px;
  outline: none;
  resize: none;
  line-height: 1.5;
  -webkit-user-select: text;
  user-select: text;
}
.mem-edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.mem-edit-cancel, .mem-edit-save {
  font-family: var(--font);
  font-size: 12px;
  font-weight: 400;
  padding: 5px 14px;
  border-radius: 8px;
  border: .5px solid var(--border);
  cursor: pointer;
  transition: opacity .15s;
}
.mem-edit-cancel { background: transparent; color: var(--text-3); }
.mem-edit-save { background: var(--rose); color: #fff; border-color: var(--rose); }

.mem-footer {
  padding: 10px 16px 20px;
  font-size: 11px;
  font-weight: 300;
  color: var(--text-3);
  text-align: center;
  border-top: .5px solid var(--border);
  flex-shrink: 0;
}
</style>
