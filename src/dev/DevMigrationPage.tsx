/**
 * ⚠️ 开发者数据迁移工具（?dev-migrate=1 入口，各工具跑完后可整体删除本文件）：
 *  1. 遗留模板集合迁移：characters 集合的 isTemplate 文档（content 在 data.content）
 *     → 同 id 写入 templates 集合 → 删除旧文档
 *  2. 人物卡数据结构迁移：对 characters 集合全部人物卡执行 dataMigration
 *     （旧版本结构迁移 + DEFAULT_DATA 深度补全），结果写回文档，
 *     业务代码的加载期 mergeWithDefault 随之退役
 *
 * 通用约束：保留原文档 id（recent/标签/链接/草稿引用不动）；先 dry-run 再执行；
 * 写入走现有 service / 直写（均满足安全规则）。入口在 App 根部短路渲染，
 * 不挂载 Vault/Character Provider（不触碰本地优先同步队列与档案库缓存）。
 */
import React, { useCallback, useState } from 'react';
import {
  collection, doc, deleteDoc, getDoc, getDocsFromServer, query, where,
  serverTimestamp, updateDoc,
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { createTemplateWithId } from '../services/templateService';
import { dataMigration, CURRENT_SCHEMA_VERSION } from '../utils/dataMigration';

// ======================================================================
// 通用 UI
// ======================================================================

type RowStatus = 'pending' | 'skipped' | 'running' | 'done' | 'failed';

const STATUS_CLS: Record<RowStatus, string> = {
  pending: 'text-stone-500',
  skipped: 'text-amber-600',
  running: 'text-sky-600',
  done: 'text-emerald-600',
  failed: 'text-red-600',
};

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
      <h2 className="text-base font-bold text-stone-800">{title}</h2>
      {subtitle && <p className="text-xs text-stone-400 mt-0.5 mb-4">{subtitle}</p>}
      <div className={subtitle ? '' : 'mt-4'}>{children}</div>
    </div>
  );
}

function RowList({ rows, statusLabel }: { rows: Row[]; statusLabel: Record<RowStatus, string> }) {
  return (
    <div className="border border-stone-200 rounded-lg divide-y divide-stone-100 max-h-[45vh] overflow-y-auto custom-scrollbar">
      {rows.length === 0 && <div className="p-4 text-sm text-stone-400 italic">没有找到需要处理的项目。</div>}
      {rows.map(r => (
        <div key={r.id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
          <span className={`shrink-0 font-bold text-xs ${STATUS_CLS[r.status]}`}>{statusLabel[r.status]}</span>
          <span className="font-mono text-stone-700 truncate">{r.name}</span>
          <span className="text-[10px] font-mono text-stone-400 shrink-0">{r.id}</span>
          <span className="text-[10px] text-stone-400 shrink-0 ml-auto truncate max-w-[45%]">
            {r.message || ''}
          </span>
        </div>
      ))}
    </div>
  );
}

interface Row {
  id: string;
  name: string;
  status: RowStatus;
  message?: string;
}

function count(rows: Row[] | null, status: RowStatus): number {
  return rows?.filter(r => r.status === status).length ?? 0;
}

// ======================================================================
// 工具一：遗留模板集合迁移
// ======================================================================

interface TemplateRow extends Row {
  folderId: string | null;
  contentLen: number;
}

function TemplateMigrationSection() {
  const [rows, setRows] = useState<TemplateRow[] | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async () => {
    setError(null);
    setRows(null);
    try {
      const uid = auth.currentUser!.uid;
      // 直接读服务器，绕过本地持久化缓存，确保看到真实服务端状态
      const snap = await getDocsFromServer(query(
        collection(db, 'characters'),
        where('ownerId', '==', uid),
        where('isTemplate', '==', true)
      ));
      setRows(snap.docs.map(d => {
        const data = d.data() as any;
        const content = data?.data?.content;
        const contentLen = typeof content === 'string' ? content.length : 0;
        return {
          id: d.id,
          name: data?.name || '(未命名)',
          folderId: data?.folderId ?? null,
          contentLen,
          status: contentLen > 0 ? 'pending' : 'skipped',
          message: contentLen > 0 ? undefined : 'data.content 缺失或非字符串，无法迁移',
        };
      }));
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }, []);

  const run = useCallback(async () => {
    if (!rows) return;
    setRunning(true);
    setError(null);
    const next = [...rows];
    try {
      for (let i = 0; i < next.length; i++) {
        const row = next[i];
        if (row.status !== 'pending') continue;
        // 执行阶段逐个读取 content，避免整批加载
        let content: string | null = null;
        try {
          const snap = await getDoc(doc(db, 'characters', row.id));
          const c = (snap.data() as any)?.data?.content;
          content = typeof c === 'string' && c ? c : null;
        } catch { content = null; }
        if (!content) {
          next[i] = { ...row, status: 'failed', message: '执行时读取 content 失败' };
          setRows([...next]);
          continue;
        }
        try {
          // 1. 同 id 写入 templates 集合（rules：createdAt/updatedAt == request.time，serverTimestamp 满足）
          await createTemplateWithId({ content, name: row.name }, row.id, row.folderId);
          next[i] = { ...row, status: 'running', message: '已写入 templates' };
          setRows([...next]);
          // 2. 创建成功后才删除旧文档
          await deleteDoc(doc(db, 'characters', row.id));
          next[i] = { ...row, status: 'done', message: undefined };
          setRows([...next]);
        } catch (e: any) {
          next[i] = { ...row, status: 'failed', message: e?.message || String(e) };
          setRows([...next]);
        }
      }
    } finally {
      setRunning(false);
    }
  }, [rows]);

  const statusLabel: Record<RowStatus, string> = {
    pending: '待迁移', skipped: '跳过', running: '已写入 templates',
    done: '完成', failed: '失败',
  };
  const pending = count(rows, 'pending');
  const failed = count(rows, 'failed');

  return (
    <SectionCard
      title="1. 遗留模板集合迁移"
      subtitle="characters 集合的 isTemplate 文档 → 同 id 写入 templates 集合 → 删除旧档"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-stone-500">{rows ? `共 ${rows.length} 项：待迁移 ${pending} · 完成 ${count(rows, 'done')} · 失败 ${failed} · 跳过 ${count(rows, 'skipped')}` : '点击"扫描"开始'}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void scan()}
            disabled={running}
            className="px-4 py-1.5 text-sm font-bold rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-100 disabled:opacity-40"
          >
            {rows ? '重新扫描' : '扫描'}
          </button>
          <button
            onClick={() => void run()}
            disabled={running || pending === 0}
            className="px-4 py-1.5 text-sm font-bold rounded-lg bg-stone-800 text-white hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {running ? '迁移中…' : `执行迁移（${pending} 项）`}
          </button>
        </div>
      </div>
      {error && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</div>}
      {rows && <RowList rows={rows} statusLabel={statusLabel} />}
      {failed > 0 && (
        <div className="mt-4 text-xs text-red-600 bg-red-50 border border-red-200 rounded p-3">
          有 {failed} 项失败：可修复原因后重新扫描再执行（已完成的项不会重复处理）。
        </div>
      )}
    </SectionCard>
  );
}

// ======================================================================
// 工具二：人物卡数据结构迁移（dataMigration）
// ======================================================================

function CharacterDataMigrationSection() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** 迁移结果暂存（id → 迁移后数据），执行阶段直接写回 */
  const migratedDataRef = React.useRef(new Map<string, any>());

  const scan = useCallback(async () => {
    setError(null);
    setRows(null);
    migratedDataRef.current.clear();
    try {
      const uid = auth.currentUser!.uid;
      const snap = await getDocsFromServer(query(
        collection(db, 'characters'),
        where('ownerId', '==', uid)
      ));
      const found: Row[] = [];
      for (const d of snap.docs) {
        const docData = d.data() as any;
        // 遗留模板混在 characters 集合：不属于数据结构迁移范围
        if (docData?.isTemplate === true) {
          found.push({ id: d.id, name: docData?.name || '(未命名)', status: 'skipped', message: '遗留模板，请先运行工具一' });
          continue;
        }
        const data = docData?.data;
        if (!data || typeof data !== 'object') {
          found.push({ id: d.id, name: docData?.name || '(未命名)', status: 'skipped', message: 'data 缺失，跳过' });
          continue;
        }
        const migrated = dataMigration.mergeWithDefault(data);
        const changed = JSON.stringify(migrated) !== JSON.stringify(data);
        const fromV = typeof data.schemaVersion === 'number' ? data.schemaVersion : 0;
        found.push({
          id: d.id,
          name: data?.basic?.name || docData?.name || '(未命名)',
          status: changed ? 'pending' : 'skipped',
          message: changed
            ? `v${fromV} → v${CURRENT_SCHEMA_VERSION}${fromV === 0 ? '（历史结构）' : ''}，将回写迁移结果`
            : `已是 v${CURRENT_SCHEMA_VERSION}，无变化`,
        });
        if (changed) migratedDataRef.current.set(d.id, migrated);
      }
      setRows(found);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }, []);

  const run = useCallback(async () => {
    if (!rows) return;
    setRunning(true);
    setError(null);
    const next = [...rows];
    try {
      for (let i = 0; i < next.length; i++) {
        const row = next[i];
        if (row.status !== 'pending') continue;
        const migrated = migratedDataRef.current.get(row.id);
        if (!migrated) {
          next[i] = { ...row, status: 'failed', message: '迁移结果丢失，请重新扫描' };
          setRows([...next]);
          continue;
        }
        try {
          // 规则允许 update 改 data/updatedAt（isValidCharacter 对完整文档校验）
          await updateDoc(doc(db, 'characters', row.id), {
            data: migrated,
            updatedAt: serverTimestamp(),
          });
          next[i] = { ...row, status: 'done', message: undefined };
          setRows([...next]);
        } catch (e: any) {
          next[i] = { ...row, status: 'failed', message: e?.message || String(e) };
          setRows([...next]);
        }
      }
    } finally {
      setRunning(false);
    }
  }, [rows]);

  const statusLabel: Record<RowStatus, string> = {
    pending: '待迁移', skipped: '无变化/跳过', running: '处理中',
    done: '完成', failed: '失败',
  };
  const pending = count(rows, 'pending');
  const failed = count(rows, 'failed');

  return (
    <SectionCard
      title={`2. 人物卡数据结构迁移（当前 schema v${CURRENT_SCHEMA_VERSION}）`}
      subtitle="对全部人物卡执行 dataMigration（旧结构迁移 + 默认值补全）并回写；跑完后加载期 mergeWithDefault 退役"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-stone-500">{rows ? `共 ${rows.length} 项：待迁移 ${pending} · 完成 ${count(rows, 'done')} · 失败 ${failed} · 无变化 ${count(rows, 'skipped')}` : '点击"扫描"开始'}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void scan()}
            disabled={running}
            className="px-4 py-1.5 text-sm font-bold rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-100 disabled:opacity-40"
          >
            {rows ? '重新扫描' : '扫描'}
          </button>
          <button
            onClick={() => void run()}
            disabled={running || pending === 0}
            className="px-4 py-1.5 text-sm font-bold rounded-lg bg-stone-800 text-white hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {running ? '迁移中…' : `执行迁移（${pending} 项）`}
          </button>
        </div>
      </div>
      {error && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</div>}
      {rows && <RowList rows={rows} statusLabel={statusLabel} />}
      {failed > 0 && (
        <div className="mt-4 text-xs text-red-600 bg-red-50 border border-red-200 rounded p-3">
          有 {failed} 项失败：可修复原因后重新扫描再执行（已完成的项不会重复处理）。
        </div>
      )}
    </SectionCard>
  );
}

// ======================================================================
// 页面骨架
// ======================================================================

export default function DevMigrationPage() {
  const { user, handleLogin } = useAuth();

  const backHref = React.useMemo(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete('dev-migrate');
    return url.toString();
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-8">
        <div className="bg-white rounded-xl shadow border border-stone-200 p-8 text-center">
          <h1 className="text-lg font-bold text-stone-800 mb-4">数据迁移工具（开发者）</h1>
          <p className="text-sm text-stone-500 mb-6">请先登录（迁移按账号 ownerId 扫描）</p>
          <button
            onClick={() => void handleLogin(googleProvider)}
            className="px-8 py-2 bg-stone-800 text-white rounded-lg font-bold text-sm hover:bg-stone-700 transition-colors"
          >
            登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <p className="font-bold mb-1">⚠️ 开发者数据迁移工具（一次性，跑完可整体删除）</p>
          <p>运行前请关闭本应用的其他标签页，确保没有未保存内容；两项迁移都完成后点击下方按钮返回应用。</p>
          <button
            onClick={() => { window.location.href = backHref; }}
            className="mt-2 px-4 py-1.5 bg-stone-800 text-white rounded-lg font-bold text-xs hover:bg-stone-700 transition-colors"
          >
            返回应用
          </button>
        </div>

        <div>
          <h1 className="text-lg font-bold text-stone-800 mb-1">
            数据迁移工具 <span className="text-xs font-normal text-stone-400">{user.email ?? user.uid}</span>
          </h1>
          <p className="text-xs text-stone-400">迁移原则：一次性代码、开发者运行一次、业务代码零版本兼容分支</p>
        </div>

        <TemplateMigrationSection />
        <CharacterDataMigrationSection />
      </div>
    </div>
  );
}
