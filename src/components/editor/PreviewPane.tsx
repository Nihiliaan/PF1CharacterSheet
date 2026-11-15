/**
 * 预览窗格：两个独立来源选择器 + 渲染区。
 *  - 人物卡选择器：（无）/ 打开的人物卡标签 / 最近打开的人物卡（5 项）
 *  - 模板选择器：（未选择）/ 打开的模板标签 / 最近打开的模板（5 项）
 * 组合语义：选了人物卡 → 以所选模板填充该人物卡数据渲染；未选 → 仅渲染模板原文。
 * 点击预览窗格（获得焦点）时同步：刚失去焦点的文档标签填入对应下拉
 * （人物卡 → 人物卡下拉，模板 → 模板下拉），另一项取其"打开的标签页"第一项，无则保持默认值。
 * 活动标签的编辑实时同步（live 状态），其余标签读暂存快照。
 * 选择状态按预览标签 key 保存在模块级 Map（组件随标签切换卸载，切回后还原）。
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Braces, Loader2, RotateCw, User } from 'lucide-react';
import { useCharacter } from '../../contexts/CharacterContext';
import { useUI } from '../../contexts/UIContext';
import { useVault } from '../../contexts/VaultContext';
import { getCharacterById } from '../../services/characterService';
import { getTemplateById } from '../../services/templateService';

import {
  getAttributeModifiers, calculateTotalCost, calculateTotalWeightNum, getComputedEncumbrance,
} from '../../utils/calculations';
import { generateBBCode } from '../../utils/bbcodeExporter';
import BBCodePreview from '../common/BBCodePreview';

const NONE = 'none';  // 人物卡选择器：不填充数据，仅渲染模板
const EMPTY = '';     // 模板选择器：未选择模板

/** 每个预览标签记住自己的选择（tabKey → { char, tpl }） */
const selectionByTab = new Map<string, { char: string; tpl: string }>();
/** 已拉取的档案库人物卡完整数据缓存（docId → data） */
const charDataCache = new Map<string, any>();
/** 每组下拉最多列出的最近文件数 */
const RECENT_LIMIT = 5;

export default function PreviewPane({ tabKey, focused }: { tabKey: string; focused: boolean }) {
  const { t } = useTranslation();
  const {
    data, computed, bbcodeTemplate, tabs, activeTabKey, getTabSnapshot, lastDocFocusKey,
  } = useCharacter();
  const { recentCharacterIds } = useUI();
  const { myCharacters } = useVault();

  const [{ char: charSource, tpl: tplSource }, setSelection] = useState<{ char: string; tpl: string }>(
    () => selectionByTab.get(tabKey) || { char: NONE, tpl: EMPTY }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** 解析后的 BBCode 渲染文本 */
  const [rendered, setRendered] = useState<string>('');
  /** 手动刷新计数：变更时重新执行解析（配合清缓存实现重新拉取） */
  const [refreshNonce, setRefreshNonce] = useState(0);

  const updateSelection = (patch: Partial<{ char: string; tpl: string }>) => {
    setSelection(prev => {
      const next = { ...prev, ...patch };
      selectionByTab.set(tabKey, next);
      return next;
    });
    setRefreshNonce(0);
  };

  // ===== 下拉选项：打开的标签 + 最近文件（5 项，去重）=====

  const openCharTabs = useMemo(() => tabs.filter(tb => tb.kind === 'character'), [tabs]);
  const openTplTabs = useMemo(() => tabs.filter(tb => tb.kind === 'template'), [tabs]);

  const charOptions = useMemo(() => {
    const openIds = new Set(openCharTabs.map(tb => tb.docId).filter(Boolean));
    const recent = recentCharacterIds
      .map(id => myCharacters?.find((c: any) => c.id === id))
      .filter((c: any) => c && !c.isTemplate && !c.isLink && !openIds.has(c.id))
      .slice(0, RECENT_LIMIT);
    return { open: openCharTabs, recent };
  }, [openCharTabs, recentCharacterIds, myCharacters]);

  const tplOptions = useMemo(() => {
    const openIds = new Set(openTplTabs.map(tb => tb.docId).filter(Boolean));
    const recent = recentCharacterIds
      .map(id => myCharacters?.find((c: any) => c.id === id))
      .filter((c: any) => c && c.isTemplate && !openIds.has(c.id))
      .slice(0, RECENT_LIMIT);
    return { open: openTplTabs, recent };
  }, [openTplTabs, recentCharacterIds, myCharacters]);

  /** 档案库模板条目自带 content（templates 集合列表全量返回），按 id 索引供同步取用 */
  const tplContentById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of myCharacters ?? []) {
      if (c?.isTemplate && typeof c.data?.content === 'string') m.set(c.id, c.data.content);
    }
    return m;
  }, [myCharacters]);

  // ===== 点击预览窗格（获得焦点）时：同步刚失去焦点的文档到对应下拉 =====

  const prevFocusedRef = useRef(false);
  useEffect(() => {
    if (focused && !prevFocusedRef.current) {
      const tb = lastDocFocusKey ? tabs.find(x => x.key === lastDocFocusKey) : null;
      if (tb?.kind === 'character') {
        // 焦点文件是人物卡：填入人物卡下拉；模板下拉取"打开的标签页"第一项（无则未选择）
        updateSelection({
          char: `tab:${tb.key}`,
          tpl: openTplTabs.length ? `tab:${openTplTabs[0].key}` : EMPTY,
        });
      } else if (tb?.kind === 'template') {
        // 焦点文件是模板：填入模板下拉；人物卡下拉取"打开的标签页"第一项（无则（无））
        updateSelection({
          tpl: `tab:${tb.key}`,
          char: openCharTabs.length ? `tab:${openCharTabs[0].key}` : NONE,
        });
      }
      // 无活跃文档（chooser/预览间切换）：保持现有选择（初始值即默认值）
    }
    prevFocusedRef.current = focused;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused, lastDocFocusKey, tabs]);

  // ===== 解析所选来源并渲染 =====

  useEffect(() => {
    selectionByTab.set(tabKey, { char: charSource, tpl: tplSource });
    if (!tplSource) {
      setError(null);
      setRendered('');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    const run = async () => {
      try {
        // 1. 模板文本
        let tplText: string;
        if (tplSource.startsWith('tab:')) {
          const key = tplSource.slice(4);
          if (key === activeTabKey) {
            tplText = bbcodeTemplate; // 活动标签直接读 live，实时跟随编辑
          } else {
            const snap = getTabSnapshot(key);
            if (!snap) throw new Error('模板标签已关闭或尚未加载');
            tplText = snap.bbcodeTemplate;
          }
        } else {
          const id = tplSource.slice(4);
          const hint = tplContentById.get(id);
          if (hint !== undefined) {
            tplText = hint;
          } else {
            const doc = await getTemplateById(id);
            if (!doc?.content) throw new Error('模板加载失败');
            tplText = doc.content;
          }
        }

        // 2. 人物卡数据（未选则仅渲染模板原文）
        if (charSource === NONE) {
          if (!cancelled) setRendered(tplText);
          return;
        }

        let charData: any;
        let charComputed: typeof computed;
        if (charSource.startsWith('tab:')) {
          const key = charSource.slice(4);
          if (key === activeTabKey) {
            charData = data;
            charComputed = computed;
          } else {
            const snap = getTabSnapshot(key);
            if (!snap) throw new Error('人物卡标签已关闭或尚未加载');
            charData = snap.data;
          }
        } else {
          const id = charSource.slice(5);
          let cached = charDataCache.get(id);
          if (!cached) {
            const doc = await getCharacterById(id);
            cached = doc?.data ?? null;
            if (cached) charDataCache.set(id, cached);
          }
          if (!cached) throw new Error('人物卡加载失败');
          charData = cached;
        }
        if (!charComputed) {
          charComputed = {
            modifiers: getAttributeModifiers(charData),
            totalCost: calculateTotalCost(charData),
            totalWeight: calculateTotalWeightNum(charData),
            encumbrance: getComputedEncumbrance(charData),
          };
        }

        const bb = generateBBCode(charData, tplText, t, { computed: charComputed, data: charData });
        if (!cancelled) setRendered(bb);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || '预览加载失败');
          setRendered('');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => { cancelled = true; };
    // 选项列表（charOptions/tplOptions）仅用于下拉展示，不参与解析
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabKey, charSource, tplSource, bbcodeTemplate, data, computed, activeTabKey, tplContentById, refreshNonce, t, getTabSnapshot]);

  const canRefresh = charSource.startsWith('char:') || tplSource.startsWith('tpl:');
  const display = error ? `[color=red]${error}[/color]` : rendered;

  const selectCls = 'flex-1 min-w-0 text-xs text-stone-700 bg-stone-50 border border-stone-200 rounded px-1.5 py-1 outline-none focus:border-primary transition-colors cursor-pointer';

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* 来源选择工具条：人物卡 + 模板两个下拉 */}
      <div className="shrink-0 flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-1.5 bg-white border-b border-stone-200">
        <label className="flex items-center gap-1.5 min-w-0 basis-[220px] grow">
          <User size={12} className="text-stone-400 shrink-0" />
          <select
            value={charSource}
            onChange={e => updateSelection({ char: e.target.value })}
            className={selectCls}
            title="选择用于填充渲染的人物卡"
          >
            <option value={NONE}>（无）仅渲染模板</option>
            {charOptions.open.length > 0 && (
              <optgroup label="打开的标签页">
                {charOptions.open.map(tb => (
                  <option key={tb.key} value={`tab:${tb.key}`}>{tb.title || '未命名人物卡'}</option>
                ))}
              </optgroup>
            )}
            {charOptions.recent.length > 0 && (
              <optgroup label="最近打开">
                {charOptions.recent.map((c: any) => (
                  <option key={c.id} value={`char:${c.id}`}>{c.name || c.data?.basic?.name || c.id}</option>
                ))}
              </optgroup>
            )}
          </select>
        </label>

        <label className="flex items-center gap-1.5 min-w-0 basis-[220px] grow">
          <Braces size={12} className="text-stone-400 shrink-0" />
          <select
            value={tplSource}
            onChange={e => updateSelection({ tpl: e.target.value })}
            className={selectCls}
            title="选择用于渲染的模板"
          >
            <option value={EMPTY}>（未选择模板）</option>
            {tplOptions.open.length > 0 && (
              <optgroup label="打开的标签页">
                {tplOptions.open.map(tb => (
                  <option key={tb.key} value={`tab:${tb.key}`}>{tb.title || '未命名模板'}</option>
                ))}
              </optgroup>
            )}
            {tplOptions.recent.length > 0 && (
              <optgroup label="最近打开">
                {tplOptions.recent.map((c: any) => (
                  <option key={c.id} value={`tpl:${c.id}`}>{c.name || c.id}</option>
                ))}
              </optgroup>
            )}
          </select>
        </label>

        {loading && <Loader2 size={12} className="text-stone-400 animate-spin shrink-0" />}
        {!loading && canRefresh && (
          <button
            onClick={() => {
              // 清除档案库来源的拉取缓存后重新解析
              if (charSource.startsWith('char:')) charDataCache.delete(charSource.slice(5));
              setRefreshNonce(n => n + 1);
            }}
            title="重新加载"
            className="p-1 rounded text-stone-400 hover:bg-stone-200 hover:text-stone-800 transition-colors shrink-0"
          >
            <RotateCw size={12} />
          </button>
        )}
      </div>

      {/* 渲染区 */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-stone-50 p-4">
        {tplSource === EMPTY && !error ? (
          <div className="h-full flex items-center justify-center text-xs text-stone-400 italic">
            请选择要预览的模板
          </div>
        ) : (
          <>
            <BBCodePreview bbcode={display} />
            {charSource !== NONE && !loading && !error && (
              <div className="mt-3 text-[10px] text-stone-400 text-center">以所选模板填充所选人物卡渲染 · 活动标签的编辑实时同步</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
