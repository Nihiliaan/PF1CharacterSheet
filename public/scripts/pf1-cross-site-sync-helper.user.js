// ==UserScript==
// @name         PF1 Character Sheet - Cross-Site Sync Helper (PF1人物卡跨站同步助手)
// @namespace    https://github.com/Nihiliaan/PF1CharacterSheet
// @version      1.4.1
// @description  跨站抓取 Paizo 官网跑团记录单，并自动化将人物卡 BBCode 定点更新至纯美苹果园指定楼层（实时嗅探所属主题与编辑入口，基于 [anchor=ID-start] 与 [anchor=ID-end] 双锚点局部替换，不覆盖自写内容，仅存储全局唯一 msg 编号）。
// @author       Nihiliaan
// @match        http://localhost:3000/*
// @match        http://127.0.0.1:3000/*
// @match        https://pf-1-character-sheet.vercel.app/*
// @match        *://*.goddessfantasy.net/*
// @match        *://*.paizo.com/*
// @updateURL    https://pf-1-character-sheet.vercel.app/scripts/pf1-cross-site-sync-helper.user.js
// @downloadURL  https://pf-1-character-sheet.vercel.app/scripts/pf1-cross-site-sync-helper.user.js
// @connect      paizo.com
// @connect      *.paizo.com
// @connect      goddessfantasy.net
// @connect      www.goddessfantasy.net
// @connect      *.goddessfantasy.net
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // 0. 安全穿透宿主窗口（杜绝沙箱事件阻隔）
  var hostWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
  var currentHost = hostWindow.location.hostname;

  // 挂载全局就绪标记
  try {
    hostWindow.__PF1_SYNC_HELPER__ = {
      version: '1.4.1',
      ready: true,
      lastActive: Date.now()
    };
    hostWindow.dispatchEvent(new CustomEvent('PF1_SYNC_HELPER_READY', {
      detail: { version: '1.4.1' }
    }));
  } catch (e) {
    console.warn('[PF1 Sync Helper] 挂载宿主环境就绪标记失败:', e);
  }

  console.log('[PF1 Sync Helper] 跨站同步助手已在 [' + currentHost + '] 激活 (版本 1.4.1: 修复自定义标题与副标题定点同步，双轨兼容数据传递)');

  // 1. 若在 Paizo 或纯美苹果园，挂载轻量状态角标，方便用户确认运行状态
  if (currentHost.indexOf('paizo.com') !== -1 || currentHost.indexOf('goddessfantasy.net') !== -1) {
    var badge = document.createElement('div');
    badge.id = 'pf1-sync-badge';
    badge.innerText = 'PF1 同步助手: 就绪';
    badge.style.cssText = 'position:fixed;bottom:10px;right:10px;background:#1c1917;color:#facc15;font-size:11px;padding:3px 8px;border-radius:4px;z-index:999999;opacity:0.85;font-family:sans-serif;box-shadow:0 2px 6px rgba(0,0,0,0.3);pointer-events:none;';
    document.body.appendChild(badge);
    return;
  }

  // ==========================================
  // 1. Paizo 官网跑团记录抓取模块 (运行于人物卡编辑器)
  // 基于角色列表总表 (charsTable) 精确定位角色行与专属跟随行，模拟 Ajax 展开，
  // 彻底忽略 Player 列直接提取全部记录，清洗为 ISO 专有日期、保留原站超链接并按时间正序排列
  // ==========================================
  window.addEventListener('FETCH_PAIZO_SESSIONS', async function (event) {
    var detail = event.detail || {};
    var playerNumber = String(detail.playerNumber || '').trim();
    var characterNumber = String(detail.characterNumber || '').trim();

    if (!playerNumber || !characterNumber) {
      console.warn('[PF1 Sync Helper] 玩家编号或角色编号为空');
      return;
    }

    var fullCharId = playerNumber + '-' + characterNumber;
    console.log('[PF1 Sync Helper] 开始从 Paizo 官网抓取角色 [' + fullCharId + '] 记录 (专属表格正序与超链接模式)...');

    try {
      var sessions = await fetchCharacterChroniclesByXPath(playerNumber, characterNumber);
      console.log('[PF1 Sync Helper] 抓取完成，纯净收录 ' + sessions.length + ' 条记录 (时间正序排列):', sessions);
      window.dispatchEvent(new CustomEvent('PAIZO_SESSIONS_LOADED', {
        detail: { playerNumber: playerNumber, characterNumber: characterNumber, sessions: sessions }
      }));
    } catch (err) {
      console.warn('[PF1 Sync Helper] 官网数据抓取异常:', err);
      var isNotLoggedIn = err.message === 'NOT_LOGGED_IN';
      window.dispatchEvent(new CustomEvent('PAIZO_SESSIONS_ERROR', {
        detail: {
          code: isNotLoggedIn ? 'NOT_LOGGED_IN' : 'FETCH_ERROR',
          message: isNotLoggedIn ? '检测到 Paizo 登录会话已过期或尚未登录' : (err.message || '未知异常')
        }
      }));
    }
  });

  async function fetchCharacterChroniclesByXPath(playerNumber, characterNumber) {
    var fullTargetId = playerNumber + '-' + characterNumber;
    var targetUrl = 'https://paizo.com/organizedPlay/myAccount';

    var res = await makeRequest({
      method: 'GET',
      url: targetUrl,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Cache-Control': 'no-cache'
      }
    });

    if (res.status < 200 || res.status >= 300) {
      throw new Error('HTTP ' + res.status);
    }

    var html = res.responseText;
    if (html.indexOf('Paizo Community Login') !== -1 || html.indexOf('RETURNING CUSTOMER') !== -1 || html.indexOf('Sign In to Your Account') !== -1) {
      throw new Error('NOT_LOGGED_IN');
    }

    var parser = new DOMParser();
    var doc = parser.parseFromString(html, 'text/html');

    // 1. 精确锁定 personal account 容器，并找到包含角色列表的大表
    var container = doc.querySelector('#tabs') || doc;
    var allTables = Array.from(container.querySelectorAll('table'));
    var charsTable = allTables.find(function (t) {
      return (t.innerText || '').indexOf('# ' + playerNumber + '-') !== -1;
    });

    if (!charsTable) {
      console.warn('[PF1 Sync Helper] 未找到包含角色列表的主表格');
      return [];
    }

    var directRows = Array.from(charsTable.rows);
    var charRowIdx = -1;
    for (var i = 0; i < directRows.length; i++) {
      var td1 = directRows[i].querySelector('td:first-child');
      if (td1 && td1.innerText.indexOf(fullTargetId) !== -1) {
        charRowIdx = i;
        break;
      }
    }

    if (charRowIdx === -1) {
      console.warn('[PF1 Sync Helper] 在角色列表中未检索到 ' + fullTargetId);
      return [];
    }

    var nextRow = (charRowIdx + 1 < directRows.length) ? directRows[charRowIdx + 1] : null;
    if (!nextRow) {
      return [];
    }

    // 若下一行是下一个角色编号 (如 # 2416069-6)，说明当前角色是无记录单的新角色
    var nextTd1 = nextRow.querySelector('td:first-child');
    if (nextTd1 && nextTd1.innerText.trim().charAt(0) === '#') {
      return [];
    }

    var sessionTable = nextRow.querySelector('table');
    var isAlreadyExpanded = sessionTable && sessionTable.rows.length > 2 && sessionTable.innerText.indexOf('Date') !== -1;

    if (!isAlreadyExpanded) {
      // 模仿浏览器 Ajax 请求展开折叠区域
      var divContainer = nextRow.querySelector('div[updateurl]');
      var aLink = nextRow.querySelector('a');
      var firstUrl = divContainer ? divContainer.getAttribute('updateurl') : (aLink ? aLink.getAttribute('href') : null);

      if (firstUrl) {
        var fullFirstUrl = firstUrl.indexOf('http') === 0 ? firstUrl : ('https://paizo.com' + firstUrl);
        var res1 = await makeRequest({ method: 'GET', url: fullFirstUrl });
        var text1 = res1.responseText;

        var matchSecond = text1.match(/AUL\.update\s*\(\s*['"][^'"]+['"]\s*,\s*\{\}\s*,\s*['"]([^'"]+)['"]/);
        var secondSuffix = matchSecond ? matchSecond[1] : null;

        if (!secondSuffix) {
          var matchHref = text1.match(/href="([^"]+)"/);
          secondSuffix = matchHref ? matchHref[1] : null;
        }

        if (secondSuffix) {
          var fullSecondUrl = '';
          if (secondSuffix.indexOf('http') === 0) {
            fullSecondUrl = secondSuffix;
          } else if (secondSuffix.charAt(0) === '/') {
            fullSecondUrl = 'https://paizo.com' + secondSuffix;
          } else {
            var baseParts = fullFirstUrl.split('/');
            baseParts.pop();
            fullSecondUrl = baseParts.join('/') + '/' + secondSuffix;
          }

          var res2 = await makeRequest({ method: 'GET', url: fullSecondUrl });
          var activeDoc = parser.parseFromString(res2.responseText, 'text/html');

          var expContainer = activeDoc.querySelector('#tabs') || activeDoc;
          var expAllTables = Array.from(expContainer.querySelectorAll('table'));
          var expCharsTable = expAllTables.find(function (t) {
            return (t.innerText || '').indexOf('# ' + playerNumber + '-') !== -1;
          });

          if (expCharsTable) {
            var expDirectRows = Array.from(expCharsTable.rows);
            for (var j = 0; j < expDirectRows.length; j++) {
              var td = expDirectRows[j].querySelector('td:first-child');
              if (td && td.innerText.indexOf(fullTargetId) !== -1) {
                var expNextRow = (j + 1 < expDirectRows.length) ? expDirectRows[j + 1] : null;
                if (expNextRow) {
                  sessionTable = expNextRow.querySelector('table');
                }
                break;
              }
            }
          }
        }
      }
    }

    if (!sessionTable) {
      console.warn('[PF1 Sync Helper] 展开后未找到角色专属记录单表格');
      return [];
    }

    // 辅助函数：提取带 Markdown 超链接的文本
    function extractLinkedText(td) {
      if (!td) return '';
      var a = td.querySelector('a');
      var text = (td.innerText || td.textContent || '').trim().replace(/\s+/g, ' ');
      if (a) {
        var href = a.getAttribute('href') || '';
        if (href) {
          if (href.indexOf('http') !== 0) {
            href = 'https://paizo.com' + (href.charAt(0) === '/' ? '' : '/') + href;
          }
          return '[' + text + '](' + href + ')';
        }
      }
      return text;
    }

    // 辅助函数：清洗日期为专有 YYYY-MM-DD
    function parseDateToIso(td) {
      if (!td) return '';
      var timeEl = td.querySelector('time');
      if (timeEl) {
        var dt = timeEl.getAttribute('datetime') || '';
        if (dt.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(dt)) {
          return dt.slice(0, 10);
        }
      }
      var text = (td.innerText || td.textContent || '').trim();
      if (!text) return '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
      var d = new Date(text);
      if (!isNaN(d.getTime())) {
        var y = d.getFullYear();
        var m = String(d.getMonth() + 1).padStart(2, '0');
        var day = String(d.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + day;
      }
      return text;
    }

    // 核心第一性原理：直接提取该角色专属表格里的全部行，彻底忽略 Player 列！
    var matchedSessions = [];
    var allRows = Array.from(sessionTable.querySelectorAll('tr'));
    for (var k = 0; k < allRows.length; k++) {
      var r = allRows[k];
      var cellTds = Array.from(r.querySelectorAll('td'));
      if (cellTds.length < 9) continue;
      var rawDate = (cellTds[0].innerText || cellTds[0].textContent || '').trim();
      if (!rawDate || rawDate.indexOf('Ajax') !== -1 || rawDate.indexOf('register') !== -1 || rawDate.indexOf('Sort by') !== -1 || rawDate.indexOf('Date') !== -1) {
        continue;
      }

      var prestigeText = (cellTds[10] ? cellTds[10].innerText : '') || (cellTds[9] ? cellTds[9].innerText : '') || '';
      var pMatch = prestigeText.match(/\d+/);
      var prestigeNum = pMatch ? parseInt(pMatch[0], 10) : 0;

      var rawNotes = (cellTds[11] ? cellTds[11].innerText : '') || (cellTds[10] ? cellTds[10].innerText : '') || '';
      var cleanNotes = rawNotes
        .replace(/Report a problem/gi, '')
        .replace(/Show Seats/gi, '')
        .replace(/Edit/gi, '')
        .trim();

      // 活动列提取：若 cells[5]（如 PFS Online）带超链接，提取带链接标题，若 cells[4] 有编号则组合
      var eventLinked = extractLinkedText(cellTds[5]);
      var eventNum = (cellTds[4] ? cellTds[4].innerText : '').trim();
      var eventFinal = eventLinked || eventNum;

      matchedSessions.push({
        date: parseDateToIso(cellTds[0]),
        gm: extractLinkedText(cellTds[1]),
        scenario: extractLinkedText(cellTds[2]),
        event: eventFinal,
        faction: (cellTds[9] ? cellTds[9].innerText : '') || (cellTds[8] ? cellTds[8].innerText : '') || '',
        prestige: prestigeNum,
        notes: cleanNotes,
        link: ''
      });
    }

    // 官网默认按时间倒序排列 (最新在第0行，最老在末尾)，在此执行 reverse 转为时间正序 (历史初心在第0行，最新一场在末尾)
    matchedSessions.reverse();

    return matchedSessions;
  }


  // ==========================================
  // 2. 纯美苹果园：自动嗅探楼层标题
  // ==========================================
  hostWindow.addEventListener('FETCH_POST_TITLE', async function (event) {
    var detail = event.detail || {};
    var msgId = String(detail.msgId || '').replace(/[^0-9]/g, '');
    if (!msgId) return;

    try {
      console.log('[PF1 Sync Helper] 正在嗅探 msgId=' + msgId + ' 的帖子标题...');
      var viewPageUrl = 'https://www.goddessfantasy.net/bbs/index.php?msg=' + msgId;
      var res = await makeRequest({
        method: 'GET',
        url: viewPageUrl,
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Cache-Control': 'no-cache'
        }
      });

      if (res.status >= 200 && res.status < 400) {
        var doc = new DOMParser().parseFromString(res.responseText, 'text/html');

        var subjectEl = doc.querySelector('#subject_' + msgId + ' a') ||
                        doc.querySelector('#subject_' + msgId) ||
                        doc.querySelector('a[href*="msg' + msgId + '"]');
        var title = subjectEl ? subjectEl.innerText.trim() : '';

        var pageTitle = (doc.title || '').replace(/ - 纯美苹果园.*$/, '').replace(/ - 页 \d+.*$/, '').trim();
        if (!title) {
          title = pageTitle;
        } else if (title.startsWith('Re:') && pageTitle && title.indexOf(pageTitle) === -1) {
          title = pageTitle + ' (' + title + ')';
        }

        // 嗅探副标题 (支持主楼 .orchard_topic_subtitle 或 input[name="description"])
        var descEl = doc.querySelector('.orchard_topic_subtitle') || doc.querySelector('input[name="description"]');
        var description = '';
        if (descEl) {
          var rawDescText = descEl.tagName === 'INPUT' ? descEl.value : (descEl.innerText || descEl.textContent || '');
          description = (rawDescText || '').replace(/^副标题[:：]\s*/, '').trim();
        }

        if (title || description) {
          console.log('[PF1 Sync Helper] 成功获取 msgId=' + msgId + ' 标题: ' + title + (description ? (' (副标题: ' + description + ')') : ''));
          hostWindow.dispatchEvent(new CustomEvent('POST_TITLE_FETCHED', {
            detail: { msgId: Number(msgId), title: title, description: description }
          }));
        } else {
          console.warn('[PF1 Sync Helper] 未能在页面中解析出 msgId=' + msgId + ' 的标题');
        }
      } else {
        console.warn('[PF1 Sync Helper] 请求 msgId=' + msgId + ' 失败，HTTP 状态: ' + res.status);
      }
    } catch (e) {
      console.warn('[PF1 Sync Helper] 获取 msgId=' + msgId + ' 标题失败:', e);
    }
  });

  // ==========================================
  // 3. 纯美苹果园：基于 msgId 的定点同步模块 (SMF [anchor=ID] Patching)
  // ==========================================
  hostWindow.addEventListener('SYNC_FORUM_POSTS', async function (event) {
    // 【核心通信契约】收到工作指令第一毫秒，立即回复“已收到”，通知人物卡安心进入安静等待状态！
    try {
      var ackEvent = new CustomEvent('FORUM_SYNC_ACK', {
        detail: { version: '1.4.1', receivedAt: Date.now() }
      });
      hostWindow.dispatchEvent(ackEvent);
      if (typeof document !== 'undefined') document.dispatchEvent(ackEvent);
      console.log('[PF1 Sync Helper] 已向人物卡回复收到任务 (ACK)！开始执行后台网络请求...');
    } catch (ackErr) {
      console.warn('[PF1 Sync Helper] 发送 ACK 失败:', ackErr);
    }

    var detail = event.detail || {};
    var characterId = String(detail.characterId || '').trim();
    var bbcode = String(detail.bbcode || '').trim();
    var posts = (detail.posts && Array.isArray(detail.posts) && detail.posts.length > 0) ? detail.posts : (detail.postIds || []);

    if (!characterId || !bbcode || posts.length === 0) {
      console.warn('[PF1 Sync Helper] 同步参数不全，终止操作');
      return;
    }

    console.log('[PF1 Sync Helper] 收到同步至果园指令，人物卡 ID: [' + characterId + ']，目标 msg 数: ' + posts.length);

    for (var i = 0; i < posts.length; i++) {
      var post = posts[i];
      var rawId = typeof post === 'object' && post !== null ? post.msgId : post;
      var msgId = parseInt(String(rawId || '').replace(/[^0-9]/g, ''), 10);
      var customSubject = typeof post === 'object' && post !== null && typeof post.customSubject === 'string'
        ? post.customSubject.trim()
        : '';
      var customDescription = typeof post === 'object' && post !== null && typeof post.customDescription === 'string'
        ? post.customDescription.trim()
        : '';
      if (!msgId || msgId <= 0) continue;

      try {
        console.log('[PF1 Sync Helper] 正在处理第 ' + (i + 1) + '/' + posts.length + ' 个楼层: msg=' + msgId +
          (customSubject ? (' (自定义标题: ' + customSubject + ')') : '') +
          (customDescription ? (' (自定义副标题: ' + customDescription + ')') : '')
        );
        var fetchedResult = await updateGoddessFantasyPostByMsgId(msgId, characterId, bbcode, customSubject, customDescription);

        hostWindow.dispatchEvent(new CustomEvent('FORUM_POST_SYNC_PROGRESS', {
          detail: {
            msgId: Number(msgId),
            status: 'success',
            title: fetchedResult.title,
            description: fetchedResult.description,
            lastSyncedAt: new Date().toLocaleTimeString()
          }
        }));
      } catch (err) {
        console.error('[PF1 Sync Helper] 更新 msg=' + msgId + ' 失败:', err);
        hostWindow.dispatchEvent(new CustomEvent('FORUM_POST_SYNC_PROGRESS', {
          detail: {
            msgId: Number(msgId),
            status: 'error',
            errorMessage: err.message || '更新失败'
          }
        }));
      }

      if (i < posts.length - 1) {
        await new Promise(function (r) { setTimeout(r, 3500); });
      }
    }

    console.log('[PF1 Sync Helper] 全部楼层同步流程结束');
    hostWindow.dispatchEvent(new CustomEvent('FORUM_POSTS_SYNC_DONE'));
  });

    // ==========================================
  // 标准 SMF URL 参数解析器（严格支持分号 ; 与 & 分隔符）
  // ==========================================
  function parseSmfUrlParams(urlStr, baseUrl) {
    try {
      var u = new URL(urlStr, baseUrl || 'https://www.goddessfantasy.net/bbs/index.php');
      var searchStr = (u.search || '').replace(/^\?/, '').replace(/;/g, '&');
      return {
        url: u,
        params: new URLSearchParams(searchStr)
      };
    } catch (e) {
      return null;
    }
  }

  // 严格依据 URL 语义判定是否为目标楼层的编辑链接（杜绝 last_msg 回复与 quote 引用碰撞）
  function isEditLinkForMsgId(href, targetMsgId, baseUrl) {
    if (!href) return false;
    var parsed = parseSmfUrlParams(href, baseUrl);
    if (!parsed) return false;

    var p = parsed.params;
    var action = p.get('action');
    if (action !== 'post') return false;

    // 坚决排除回复(last_msg)与引用(quote)
    if (p.has('last_msg') || p.has('quote')) return false;

    // 必须具有独立的 msg 参数且正整数完全匹配
    var msgParam = p.get('msg');
    if (msgParam && parseInt(msgParam, 10) === targetMsgId) {
      return true;
    }
    return false;
  }

  async function updateGoddessFantasyPostByMsgId(msgId, characterId, cardBBCode, customSubject, customDescription) {
    // 1. 实时访问目标楼层视图，智能嗅探所属主题 (topic) 与真实的编辑入口 (解决 SMF 裸 msg 丢失上下文导致 403 权限错误)
    var viewPageUrl = 'https://www.goddessfantasy.net/bbs/index.php?msg=' + msgId;
    var viewRes = await makeRequest({
      method: 'GET',
      url: viewPageUrl,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Cache-Control': 'no-cache'
      }
    });

    if (viewRes.status < 200 || viewRes.status >= 400) {
      throw new Error('访问楼层页面失败 (HTTP ' + viewRes.status + ')');
    }

    var viewDoc = new DOMParser().parseFromString(viewRes.responseText, 'text/html');

    // 检查登录状态
    var isLoggedOut = viewDoc.querySelector('form[action*="action=login2"]') ||
                      (viewDoc.querySelector('a[href*="action=login"]') && !viewDoc.querySelector('a[href*="action=logout"]'));
    if (isLoggedOut) {
      throw new Error('检测到未登录果园，请先在当前浏览器登录论坛');
    }

    // 优先在目标楼层对应容器中寻找编辑链接，使用标准 URL 解析器判别
    var targetMsgEl = viewDoc.querySelector('#msg' + msgId + ', #msg_' + msgId);
    var candidateLinks = [];
    if (targetMsgEl) {
      var windowBg = targetMsgEl.closest('.windowbg') || targetMsgEl.closest('.post_wrapper') || targetMsgEl.parentElement;
      if (windowBg) {
        candidateLinks = Array.from(windowBg.querySelectorAll('a[href*="action=post"]'));
      }
    }
    if (candidateLinks.length === 0) {
      candidateLinks = Array.from(viewDoc.querySelectorAll('a[href*="action=post"]'));
    }

    var editPageUrl = null;
    for (var m = 0; m < candidateLinks.length; m++) {
      var linkEl = candidateLinks[m];
      var rawHref = linkEl.getAttribute('href') || linkEl.href;
      if (isEditLinkForMsgId(rawHref, msgId, viewPageUrl)) {
        var parsedEditUrl = new URL(rawHref, viewPageUrl);
        editPageUrl = parsedEditUrl.href;
        break;
      }
    }

    // 备用兜底：若未直接在 DOM 命中（如特定自定皮肤），从页面中用标准 URL 解析提取 topicId 构建标准编辑链接
    if (!editPageUrl) {
      var topicId = null;
      var canonicalEl = viewDoc.querySelector('link[rel="canonical"]');
      if (canonicalEl && canonicalEl.href) {
        var canonicalParsed = parseSmfUrlParams(canonicalEl.href, viewPageUrl);
        if (canonicalParsed && canonicalParsed.params.get('topic')) {
          topicId = parseInt(canonicalParsed.params.get('topic'), 10);
        }
      }
      if (!topicId) {
        var allTopicLinks = Array.from(viewDoc.querySelectorAll('a[href*="topic="]'));
        for (var tIdx = 0; tIdx < allTopicLinks.length; tIdx++) {
          var tParsed = parseSmfUrlParams(allTopicLinks[tIdx].getAttribute('href') || allTopicLinks[tIdx].href, viewPageUrl);
          if (tParsed && tParsed.params.get('topic')) {
            var rawT = tParsed.params.get('topic');
            topicId = parseInt(rawT, 10);
            if (topicId) break;
          }
        }
      }

      if (topicId) {
        editPageUrl = 'https://www.goddessfantasy.net/bbs/index.php?action=post;msg=' + msgId + ';topic=' + topicId + '.0';
      }
    }

    if (!editPageUrl) {
      throw new Error('未在目标楼层 (msg=' + msgId + ') 找到编辑入口，可能该楼层已被锁定、移至受限区或非本人账号发表');
    }

    console.log('[PF1 Sync Helper] 成功锁定目标楼层编辑入口: ' + editPageUrl);

    // 2. 请求编辑页面，获取 postmodify 表单与 CSRF token
    var getRes = await makeRequest({
      method: 'GET',
      url: editPageUrl
    });

    if (getRes.status !== 200) {
      throw new Error('打开编辑页失败 (HTTP ' + getRes.status + ')，请确保您在当前浏览器已登录果园并有权修改此楼层');
    }

    var parser = new DOMParser();
    var doc = parser.parseFromString(getRes.responseText, 'text/html');

    var postform = doc.querySelector('#postmodify') || doc.querySelector('form[name="postmodify"]') || doc.querySelector('form[action*="action=post2"]');
    if (!postform) {
      var errorBox = doc.querySelector('.errorbox, #errors, .alert');
      var errorMsg = errorBox ? errorBox.innerText.trim() : '无法找到帖子修改表单，可能未登录或无权修改此楼层';
      throw new Error(errorMsg);
    }

    var subjectInput = postform.querySelector('input[name="subject"]');
    var postTitle = subjectInput ? subjectInput.value.trim() : '';
    var descInput = postform.querySelector('input[name="description"]');
    var postDesc = descInput ? descInput.value.trim() : '';

    var actionUrl = postform.getAttribute('action') || editPageUrl.replace('action=post', 'action=post2');
    var fullActionUrl = actionUrl.startsWith('http') ? actionUrl : 'https://www.goddessfantasy.net/bbs/' + actionUrl.replace(/^\//, '');

    var messageTextarea = postform.querySelector('textarea[name="message"]');
    if (!messageTextarea) {
      throw new Error('未找到正文编辑框，无法获取帖子内容');
    }
    var origMessage = messageTextarea.value || '';

    // 首尾双锚点正则匹配：支持 [anchor=ID-start][/anchor]...[anchor=ID-end][/anchor]，以及自闭合容错
    var pairAnchorRegex = new RegExp('\\[anchor=' + characterId + '-start\\](?:\\s*\\[\\/anchor\\])?[\\s\\S]*?\\[anchor=' + characterId + '-end\\](?:\\s*\\[\\/anchor\\])?', 'i');
    // 旧版单包裹标签向下兼容正则：[anchor=ID]...[/anchor]
    var legacyAnchorRegex = new RegExp('\\[anchor=' + characterId + '\\][\\s\\S]*?\\[\\/anchor\\]', 'i');
    var wrappedCard = '[anchor=' + characterId + '-start][/anchor]\n' + cardBBCode + '\n[anchor=' + characterId + '-end][/anchor]';
    var newMessage = '';

    if (pairAnchorRegex.test(origMessage)) {
      newMessage = origMessage.replace(pairAnchorRegex, wrappedCard);
      console.log('[PF1 Sync Helper] 命中双锚点 [anchor=' + characterId + '-start] ... [anchor=' + characterId + '-end]，执行原位定点局部替换！');
    } else if (legacyAnchorRegex.test(origMessage)) {
      newMessage = origMessage.replace(legacyAnchorRegex, wrappedCard);
      console.log('[PF1 Sync Helper] 命中旧版单包裹 [anchor=' + characterId + '] 标签，平滑升级替换为双锚点！');
    } else {
      newMessage = origMessage.trim() ? (origMessage + '\n\n' + wrappedCard) : wrappedCard;
      console.log('[PF1 Sync Helper] 未检测到锚点，将角色卡双锚点包裹块追加至帖子末尾！');
    }

    // 3. 严格遵循 SMF 2.1 规范采集所有表单参数与安全校验令牌
    var formData = new URLSearchParams();
    var elements = Array.from(postform.querySelectorAll('input, select, textarea, button'));
    var postButtonValue = '保存';

    for (var k = 0; k < elements.length; k++) {
      var el = elements[k];
      var name = el.name;
      if (!name) continue;

      // 坚决忽略预览与取消按钮
      if (name === 'preview' || name.toLowerCase().indexOf('preview') !== -1) continue;
      if (name === 'cancel') continue;

      // 核心第一性原理：修改已有帖子必须严格剔除 last_msg！
      // 若携带 last_msg，SMF 2.1 后端会将其作为追加新回复 (createPost) 处理，导致生成重复新楼层！
      if (name === 'last_msg') continue;

      var tag = el.tagName.toLowerCase();
      var type = (el.type || '').toLowerCase();

      // 捕获提交/保存按钮的值（SMF 后端 Post2 必须根据 $_REQUEST['post'] 判断是否真正执行保存）
      if (name === 'post' || type === 'submit') {
        if (el.value) {
          postButtonValue = el.value;
        }
        continue;
      }

      if (type === 'button' || type === 'reset' || type === 'image') {
        continue;
      }

      if (type === 'checkbox' || type === 'radio') {
        if (el.checked) {
          formData.append(name, el.value !== undefined ? el.value : '1');
        }
      } else if (tag === 'textarea') {
        if (name === 'message') {
          continue; // message 在后文统一设置为替换后的最新正文
        }
        formData.append(name, el.value || '');
      } else {
        formData.append(name, el.value || '');
      }
    }

    // 核心第一性原理：显式强制设置 msg 参数！SMF Post2 依据 $_REQUEST['msg'] 决定是 modifyPost 还是 createPost！
    formData.set('msg', String(msgId));
    formData.set('post', postButtonValue || '保存');
    formData.set('message', newMessage);
    if (customSubject) {
      formData.set('subject', customSubject);
      console.log('[PF1 Sync Helper] 已设置自定义楼层主标题: ' + customSubject);
    }
    if (customDescription) {
      formData.set('description', customDescription);
      console.log('[PF1 Sync Helper] 已设置自定义楼层副标题: ' + customDescription);
    }

    // 确保 fullActionUrl 也明确带有 msg 参数（双保险防反向代理/中间件丢参）
    if (fullActionUrl.indexOf('msg=' + msgId) === -1) {
      fullActionUrl += (fullActionUrl.indexOf('?') === -1 ? '?' : '&') + 'msg=' + msgId;
    }

    console.log('[PF1 Sync Helper] 准备向 ' + fullActionUrl + ' 发送保存请求，已携带 post=' + (postButtonValue || '保存') + ' 及全部安全校验令牌...');

    var postRes = await makeRequest({
      method: 'POST',
      url: fullActionUrl,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Referer': editPageUrl,
        'Origin': 'https://www.goddessfantasy.net'
      },
      data: formData.toString()
    });

    if (postRes.status < 200 || postRes.status >= 400) {
      throw new Error('保存帖子网络请求失败 (HTTP ' + postRes.status + ')');
    }

    // 4. 严谨真成功与真失败检验（直击 SMF 2.1 快速回复框 postmodify 同名误判根因）
    var respHtml = postRes.responseText || '';
    var respDoc = new DOMParser().parseFromString(respHtml, 'text/html');

    // (1) 检查页面是否存在显式的错误提示框
    var errorEl = respDoc.querySelector('.errorbox, #errors, .alert-danger, .alert-warning');
    if (errorEl) {
      var errText = (errorEl.innerText || errorEl.textContent || '').replace(/\s+/g, ' ').trim();
      if (errText) {
        throw new Error('论坛拒绝修改: ' + errText);
      }
    }

    // (2) 优先检查是否已成功返回帖子展示页面
    // SMF 成功保存后重定向到主题视图，该视图具有独特的主题/楼层节点 (#forumposts 或 #msgXXX)
    var isTopicView = !!(
      respDoc.querySelector('#forumposts, .forumposts') ||
      respDoc.querySelector('#msg' + msgId + ', #msg_' + msgId + ', a[name="msg' + msgId + '"]') ||
      (postRes.finalUrl && postRes.finalUrl.indexOf('topic=') !== -1)
    );

    var finalResult = {
      title: customSubject || postTitle,
      description: customDescription || postDesc
    };

    if (isTopicView) {
      console.log('[PF1 Sync Helper] 楼层 msg=' + msgId + ' 成功保存并重定向至主题视图！');
      return finalResult;
    }

    // (3) 只有在未进入主题视图的前提下，检查是否重新停留在真正的独立编辑表单（特征是带有 subject 标题框）
    var standaloneEditSubject = respDoc.querySelector('form#postmodify input[name="subject"], form[action*="action=post2"] input[name="subject"]');
    if (standaloneEditSubject) {
      var editFormEl = standaloneEditSubject.closest('form');
      var returnedMsg = editFormEl ? editFormEl.querySelector('textarea[name="message"]') : null;
      var note = '未真正写入论坛数据库';
      if (returnedMsg && returnedMsg.value.indexOf(characterId) === -1) {
        note = '论坛未接受修改，仍显示旧内容（可能由于会话过期、缺少 post 触发参数或令牌失效）';
      }
      throw new Error('保存失败：论坛重新返回了编辑表单，' + note);
    }

    console.log('[PF1 Sync Helper] 楼层 msg=' + msgId + ' 提交完成！');
    return finalResult;
  }

  function makeRequest(opts) {
    return new Promise(function (resolve, reject) {
      GM_xmlhttpRequest(Object.assign({}, opts, {
        onload: resolve,
        onerror: reject,
        ontimeout: function () { reject(new Error('请求超时')); }
      }));
    });
  }
})();
