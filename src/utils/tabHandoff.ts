/**
 * 跨窗口文档转交（BroadcastChannel）
 *
 * 场景：应用已在一个浏览器标签页中运行时，用户在外部（论坛帖、聊天记录）点击 ?id= 分享链接，
 * 浏览器会打开一个新标签页。新标签页启动时先通过本模块询问是否已有存活的实例：
 * - 有：把文档 ID 转交给已有实例（由其在应用内新开一个选项卡并聚焦窗口），新标签页停留在一个
 *       轻量提示页并尝试自动关闭
 * - 没有：新标签页正常启动应用并加载该文档
 */

const CHANNEL_NAME = 'pf1-app-channel';
const HANDOFF_TIMEOUT = 500;

type OpenRequestMessage = { type: 'pf1-open-doc-request'; nonce: string; docId: string };
type OpenAckMessage = { type: 'pf1-open-doc-ack'; nonce: string };
type HandoffMessage = OpenRequestMessage | OpenAckMessage;

/**
 * 询问是否已有存活的实例并转交打开请求。
 * @returns true = 已有实例接手（本页应显示提示并尝试关闭）；false = 没有实例，本页应正常启动
 */
export function requestOpenInExistingInstance(docId: string, timeoutMs: number = HANDOFF_TIMEOUT): Promise<boolean> {
  return new Promise((resolve) => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
    } catch (e) {
      // 环境不支持 BroadcastChannel：直接本页启动
      resolve(false);
      return;
    }
    const nonce = Math.random().toString(36).slice(2);
    let settled = false;
    const finish = (handled: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      channel?.close();
      resolve(handled);
    };
    channel.onmessage = (ev: MessageEvent) => {
      const msg = ev.data as HandoffMessage;
      if (msg?.type === 'pf1-open-doc-ack' && msg.nonce === nonce) {
        finish(true);
      }
    };
    channel.postMessage({ type: 'pf1-open-doc-request', nonce, docId } as OpenRequestMessage);
    const timer = setTimeout(() => finish(false), timeoutMs);
  });
}

/**
 * 监听其他标签页转交来的打开请求（由已挂载的应用实例调用）。
 * 收到请求后先回执，再回调 onOpen（内部会以新选项卡方式打开文档）。
 * @returns 取消监听的清理函数
 */
export function listenForOpenRequests(onOpen: (docId: string) => void): () => void {
  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
  } catch (e) {
    return () => {};
  }
  channel.onmessage = (ev: MessageEvent) => {
    const msg = ev.data as HandoffMessage;
    if (msg?.type === 'pf1-open-doc-request' && msg.docId) {
      channel!.postMessage({ type: 'pf1-open-doc-ack', nonce: msg.nonce } as OpenAckMessage);
      try {
        onOpen(msg.docId);
      } catch (e) {
        console.error('[tabHandoff] 转交打开文档失败:', e);
      }
    }
  };
  return () => {
    channel?.close();
  };
}
