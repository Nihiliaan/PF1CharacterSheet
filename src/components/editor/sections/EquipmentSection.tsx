import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, pointerWithin, closestCenter, type CollisionDetection, type DragEndEvent, type DragMoveEvent, type DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import Section from '../../common/Section';
import InlineInput from '../../common/InlineInput';
import MultilineInput from '../../common/MultilineInput';
import EncumbranceBar from './EncumbranceBar';
import EquipmentBagItem from './EquipmentBagItem';
import { useCharacter } from '../../../contexts/CharacterContext';
import { calculateTotalCost } from '../../../utils/calculations';
import { getHandlerByPath } from '../../../schema/fieldRegistry';
import { clearCells, type CellRect } from '../../../utils/tableOps';
import type { Column } from '../../../schema/types';

/** 指针真值落点（中线模型）：背包拖拽 = 插入索引 0..N（N=末尾追加）；行拖拽 = 目标背包 + 行插入索引 0..行数 */
interface BagDrop { kind: 'bag'; index: number }
interface RowDrop { kind: 'row'; targetBagId: string; targetBagIndex: number; index: number }
type DropTarget = BagDrop | RowDrop;
type DragKind = 'row' | 'bag';
interface DragInfo { kind: DragKind; bagId: string; bagIndex: number; index: number }

const EquipmentSection: React.FC = () => {
  const { t } = useTranslation();
  const {
    data,
    lastSavedData,
    update,
    tableActionMode,
    toggleTableActionMode,
    addBag,
    reorderRows,
    moveItemBetweenBags
  } = useCharacter();

  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  /**
   * 行拖拽实时预览：物品将插入到该背包该位置（渲染插入指示线）。
   * 同包/跨包统一中线插入语义——提交逻辑与指示线严格一致。
   * 装备区已关闭 dnd-kit 原生位移让位（视觉位置会偏离布局位置造成落点错行），
   * 布局在拖拽期间完全静止，指针真值命中零反馈零漂移。
   */
  const [rowPreview, setRowPreview] = useState<{ bagId: string; bagIndex: number; index: number } | null>(null);
  /** 背包拖拽实时预览：背包将插入到该索引之前（渲染背包间指示线） */
  const [bagPreviewIndex, setBagPreviewIndex] = useState<number | null>(null);
  /** 容器折叠状态（纯界面记忆，不随人物卡存储） */
  const [collapsedBagIds, setCollapsedBagIds] = useState<Set<string>>(new Set());
  /** 背包拖拽期间的折叠快照：进入拖拽全折叠、结束按快照恢复 */
  const [bagDragCollapseSnapshot, setBagDragCollapseSnapshot] = useState<Set<string> | null>(null);
  /** Excel 式剪切源（跨背包移动语义）：剪切在宿主统一持有（bag A 剪切、bag B 粘贴要清源），
      任意物品表粘贴时清除源区完成"移动"；矩形为该背包数据索引（闭区间） */
  const [cutSource, setCutSource] = useState<{ bagId: string; rect: CellRect } | null>(null);

  const handleConsumeCut = useCallback(() => {
    if (!cutSource) return;
    const bagIndex = data.equipment.container.findIndex(b => b.id === cutSource.bagId);
    if (bagIndex !== -1) {
      const bagPath = `equipment.container[${bagIndex}]`;
      const cols: Column[] = getHandlerByPath(bagPath)?.columns || [];
      update(bagPath, clearCells(data.equipment.container[bagIndex], cols, bagPath, cutSource.rect));
    }
    setCutSource(null);
  }, [cutSource, data, update]);

  const toggleBagCollapse = useCallback((bagId: string) => {
    setCollapsedBagIds(prev => {
      const next = new Set(prev);
      if (next.has(bagId)) next.delete(bagId); else next.add(bagId);
      return next;
    });
  }, []);
  // 拖拽期间的真实指针坐标。⚠️ 不能用 activatorEvent + delta 还原：dnd-kit 的 delta 含
  // auto-scroll 滚动补偿（实测膨胀 7 倍，判定点随滚动漂移出数屏远），必须监听原始指针事件。
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);

  // 装备区共享 DndContext（多容器）：背包容器排序 + 行排序 + 跨背包移动物品。
  // 碰撞判定按拖拽类型过滤 droppable（背包拖拽只看背包、行拖拽只看行/空表容器），
  // 用 pointerWithin（指针落在哪个 droppable 内即命中，多容器标准配方），行间隙回退 closestCenter。
  const collisionDetection: CollisionDetection = useCallback((args) => {
    const isBagDrag = args.active.data.current?.type === 'bag';
    const containers = args.droppableContainers.filter(c => {
      const d = c.data.current as { type?: string } | undefined;
      return isBagDrag ? d?.type === 'bag' : d?.type !== 'bag';
    });
    const scoped = { ...args, droppableContainers: containers };
    const pointerHits = pointerWithin(scoped);
    return pointerHits.length > 0 ? pointerHits : closestCenter(scoped);
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  /**
   * 指针真值落点判定（dragmove 预览与 dragend 提交共用，保证指示线与实际落点一致）。
   * 不依赖 dnd-kit 的 over——多容器无钳制场景下，sortable 的位移 transform 与重测量
   * 会形成反馈环路，指针静止悬停时 over 也会漂移错行（实测 row-2→row-1→row-0）。
   * 指针坐标取自 lastPointerRef（拖拽期间 window 级 pointermove 实录，免疫 dnd-kit
   * delta 的 auto-scroll 补偿膨胀——实测可膨胀 7 倍）。
   *
   * 判定为纯几何中线模型（有序列表的标准插入语义，位置空间连续全覆盖、无容差死区）：
   * - 背包拖拽：插入索引 = 中线在指针上方的背包数（0=最前、N=末尾追加）；
   * - 行拖拽：目标背包 = 纵向包含指针的背包，插入行索引 = 该包内中线在指针上方的行数
   *   （标题区=0、行下半=该行之后、末行下方=行数追加）。
   * data-bag-zone/tr[data-dnd-index] 仅作矩形定位的 DOM 锚点，不做任何包含性判断；
   * 布局在拖拽期间完全静止（已关闭位移让位），中线计数零反馈零漂移。
   * 分栏多实例按指针纵向范围锁定所属装备区（影子副本与指针不在同一纵向范围）。
   */
  const resolveDropTarget = useCallback((active: DragStartEvent['active']): DropTarget | null => {
    const a = active.data.current as (DragInfo & { type: DragKind }) | undefined;
    if (!a) return null;
    const p = lastPointerRef.current;
    if (!p) return null;
    const { x: px, y: py } = p;
    const sectionEl = [...document.querySelectorAll('section#equipment')]
      .find(s => { const r = s.getBoundingClientRect(); return py >= r.top && py <= r.bottom; })
      ?? document.querySelector('section#equipment');
    if (!sectionEl) return null;

    if (a.type === 'bag') {
      let index = 0;
      sectionEl.querySelectorAll('[data-bag-zone]').forEach(z => {
        const r = (z as HTMLElement).getBoundingClientRect();
        if (r.top + r.height / 2 < py) index++;
      });
      return { kind: 'bag', index };
    }

    // 行拖拽：目标背包 = 纵向包含指针的背包；包间缝隙无归属 → 取消
    let targetZone: HTMLElement | null = null;
    for (const z of sectionEl.querySelectorAll('[data-bag-zone]')) {
      const el = z as HTMLElement;
      const r = el.getBoundingClientRect();
      if (py >= r.top && py <= r.bottom) { targetZone = el; break; }
    }
    if (!targetZone) return null;
    const targetBagId = targetZone.dataset.bagZone!;
    const targetBagIndex = data.equipment.container.findIndex(b => b.id === targetBagId);
    if (targetBagIndex === -1) return null;
    // 行插入索引 = 该包内中线在指针上方的行数（扣除 transform 以取布局矩形；位移已关闭，防御性保留）
    let index = 0;
    targetZone.querySelectorAll('tr[data-dnd-index]').forEach(tr => {
      const r = (tr as HTMLElement).getBoundingClientRect();
      const m = /translate3d\((-?[\d.]+)px,\s*(-?[\d.]+)px/.exec((tr as HTMLElement).style.transform);
      const ty = m ? parseFloat(m[2]) : 0;
      if (r.top - ty + r.height / 2 < py) index++;
    });
    return { kind: 'row', targetBagId, targetBagIndex, index };
  }, [data]);

  // 拖拽期间监听原始指针（capture：不受任何 stopPropagation 影响）
  useEffect(() => {
    if (!dragInfo) return;
    const onMove = (e: PointerEvent) => { lastPointerRef.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener('pointermove', onMove, true);
    return () => window.removeEventListener('pointermove', onMove, true);
  }, [dragInfo]);

  const handleDragStart = useCallback((e: DragStartEvent) => {
    const a = e.active.data.current as (DragInfo & { type: DragKind }) | undefined;
    if (!a) return;
    const ae = e.activatorEvent as PointerEvent | null;
    lastPointerRef.current = ae && typeof ae.clientX === 'number' ? { x: ae.clientX, y: ae.clientY } : null;
    setDragInfo({ kind: a.type, bagId: a.bagId, bagIndex: a.bagIndex, index: a.index });
    setRowPreview(null);
    setBagPreviewIndex(null);
    // 拖动容器排序时自动全折叠：快照当前折叠态（纯渲染层，不动数据），结束按快照恢复
    if (a.type === 'bag') {
      setBagDragCollapseSnapshot(prev => prev ?? new Set(collapsedBagIds));
      setCollapsedBagIds(new Set(data.equipment.container.map(b => b.id)));
    }
  }, [collapsedBagIds, data]);

  const restoreCollapseSnapshot = useCallback(() => {
    setBagDragCollapseSnapshot(snapshot => {
      if (snapshot) setCollapsedBagIds(snapshot);
      return null;
    });
  }, []);

  /** 同容器 splice 语义的中线插入修正：插入位在源之后时，移除源后索引左移一位 */
  const insertBeforeIndex = (from: number, hoverIndex: number) => hoverIndex > from ? hoverIndex - 1 : hoverIndex;

  const handleDragMove = useCallback((e: DragMoveEvent) => {
    const a = e.active.data.current as (DragInfo & { type: DragKind }) | undefined;
    if (!a) return;
    const hit = resolveDropTarget(e.active);
    if (hit?.kind === 'bag') {
      // 背包拖拽预览：提交将无变化（to === 源索引）时不显示指示线
      const to = insertBeforeIndex(a.bagIndex, hit.index);
      const next = to !== a.bagIndex ? hit.index : null;
      setBagPreviewIndex(prev => prev === next ? prev : next);
    } else if (hit?.kind === 'row') {
      // 行拖拽预览：同包且提交无变化时不显示指示线，其余（含跨包）按插入位指示
      const sameBag = hit.targetBagId === a.bagId;
      const to = insertBeforeIndex(a.index, hit.index);
      const next = (!sameBag || to !== a.index) ? { bagId: hit.targetBagId, bagIndex: hit.targetBagIndex, index: hit.index } : null;
      setRowPreview(prev => (prev?.bagId === next?.bagId && prev?.index === next?.index) ? prev : next);
    }
  }, [resolveDropTarget]);

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    setRowPreview(null);
    setBagPreviewIndex(null);
    setDragInfo(null);
    restoreCollapseSnapshot();
    const a = e.active.data.current as (DragInfo & { type: DragKind }) | undefined;
    if (!a) return;
    const hit = resolveDropTarget(e.active);
    if (!hit) return;
    if (hit.kind === 'bag') {
      // 背包容器排序：插入到指示线位置（0=最前、N=末尾追加，与指示线一致）
      const to = insertBeforeIndex(a.bagIndex, hit.index);
      if (a.bagIndex !== to) reorderRows('equipment.container', a.bagIndex, to);
    } else if (a.bagId === hit.targetBagId) {
      // 同背包行排序：插入到指示线位置（与行指示线一致）
      const to = insertBeforeIndex(a.index, hit.index);
      if (a.index !== to) reorderRows(`equipment.container[${a.bagIndex}]`, a.index, to);
    } else {
      // 跨背包移动：目标数组独立，悬停行索引即插入位（指示线一致）
      moveItemBetweenBags(a.bagId, a.index, hit.targetBagId, hit.index);
    }
  }, [resolveDropTarget, reorderRows, moveItemBetweenBags, restoreCollapseSnapshot]);

  const handleDragCancel = useCallback(() => {
    setRowPreview(null);
    setBagPreviewIndex(null);
    setDragInfo(null);
    restoreCollapseSnapshot();
  }, [restoreCollapseSnapshot]);

  const draggedBag = dragInfo?.kind === 'bag' ? data.equipment.container[dragInfo.bagIndex] : null;
  // 折叠紧凑化：全部容器处于折叠态（含拖拽强制折叠）时收紧列表间距
  const allBagsCollapsed = data.equipment.container.length > 0 &&
    data.equipment.container.every(b => collapsedBagIds.has(b.id) || dragInfo?.kind === 'bag');

  return (
    <Section id="equipment" title={t('editor.sections.equipment')}>
      <div className={`flex flex-col ${allBagsCollapsed ? 'gap-1.5' : 'gap-8'}`}>
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          modifiers={[restrictToVerticalAxis]}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          {/* 背包容器排序：bag.id 作 sortable id，把手激活；拖拽预览 = DragOverlay 卡片 + 背包间指示线 */}
          <SortableContext items={data.equipment.container.map(b => b.id)} strategy={verticalListSortingStrategy}>
            {data.equipment.container.map((bag, bagIndex) => (
              <React.Fragment key={bag.id}>
                {dragInfo?.kind === 'bag' && bagPreviewIndex === bagIndex && (
                  <div className="h-[3px] my-[-2px] relative z-10 rounded-full bg-primary/80 shadow-[0_0_0_1px_rgba(255,255,255,0.7)]" />
                )}
                <EquipmentBagItem
                  bag={bag}
                  bagIndex={bagIndex}
                  originalBag={lastSavedData.equipment?.container?.[bagIndex]}
                  tableActionMode={tableActionMode}
                  onToggleTableActionMode={toggleTableActionMode}
                  update={update}
                  insertPreviewIndex={rowPreview?.bagId === bag.id ? rowPreview.index : null}
                  collapsed={collapsedBagIds.has(bag.id) || dragInfo?.kind === 'bag'}
                  onToggleCollapse={() => toggleBagCollapse(bag.id)}
                  cutRect={cutSource?.bagId === bag.id ? cutSource.rect : null}
                  onCut={(rect) => setCutSource({ bagId: bag.id, rect })}
                  onConsumeCut={handleConsumeCut}
                />
              </React.Fragment>
            ))}
            {/* 拖到列表末尾的指示线（bagPreviewIndex = 背包数 = 追加到末尾） */}
            {dragInfo?.kind === 'bag' && bagPreviewIndex === data.equipment.container.length && (
              <div className="h-[3px] my-[-2px] relative z-10 rounded-full bg-primary/80 shadow-[0_0_0_1px_rgba(255,255,255,0.7)]" />
            )}
          </SortableContext>
          {/* 背包拖拽的浮动克隆（行拖拽的克隆在 DynamicTable 内渲染） */}
          <DragOverlay dropAnimation={null} modifiers={[restrictToVerticalAxis]}>
            {draggedBag ? (
              <div className="w-fit bg-white border border-stone-300 rounded shadow-lg px-3 py-1.5 text-sm font-bold text-stone-700 flex items-center gap-2">
                {draggedBag.name}
                <span className="text-xs font-normal text-stone-400">{draggedBag.item?.length || 0} 项</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
        <button
          onClick={addBag}
          className="flex items-center gap-1 text-sm text-stone-600 border border-dashed border-stone-300 hover:border-stone-500 hover:text-stone-900 rounded p-3 justify-center transition-colors"
        >
          <Plus size={16} /> {t('editor.items.add_container')}
        </button>


        {/* auto-fit 替代 md:grid-cols-5：每列最小 120px（货币输入框最小宽），列数随栏宽自动增减，零断点 */}
        <div className="grid gap-3 mt-4 grid-cols-[repeat(auto-fit,minmax(min(120px,100%),1fr))]">
          <InlineInput
            label={t('editor.items.pp')}
            path="equipment.currency.pp"
            value={String(data.equipment.currency.pp)}
            originalValue={String(lastSavedData.equipment?.currency?.pp)}
            onChange={v => update('equipment.currency.pp', v)}
            placeholder="0"
          />
          <InlineInput
            label={t('editor.items.gp')}
            path="equipment.currency.gp"
            value={String(data.equipment.currency.gp)}
            originalValue={String(lastSavedData.equipment?.currency?.gp)}
            onChange={v => update('equipment.currency.gp', v)}
            placeholder="0"
          />
          <InlineInput
            label={t('editor.items.sp')}
            path="equipment.currency.sp"
            value={String(data.equipment.currency.sp)}
            originalValue={String(lastSavedData.equipment?.currency?.sp)}
            onChange={v => update('equipment.currency.sp', v)}
            placeholder="0"
          />
          <InlineInput
            label={t('editor.items.cp')}
            path="equipment.currency.cp"
            value={String(data.equipment.currency.cp)}
            originalValue={String(lastSavedData.equipment?.currency?.cp)}
            onChange={v => update('equipment.currency.cp', v)}
            placeholder="0"
          />
          <InlineInput
            label={t('editor.items.coin_weight')}
            path="equipment.currency.coinWeight"
            value={String(data.equipment.currency.coinWeight)}
            originalValue={String(lastSavedData.equipment?.currency?.coinWeight)}
            onChange={v => update('equipment.currency.coinWeight', v)}
            placeholder="0"
          />
        </div>

        {/* flex-wrap 替代 md:flex-row：负重条最小 240px，不足自动换行 */}
        <div className="flex flex-wrap gap-3 mt-4 items-stretch">
          {/* 左右排版（2026-11-16 用户裁决）：与 InlineInput 同款标签左/值右，不再两行 */}
          <div className="flex items-center gap-2 border border-stone-200 bg-stone-50 rounded p-1.5 w-28 shrink-0">
            <label className="text-[9px] font-bold text-stone-500 uppercase tracking-wider leading-none whitespace-nowrap shrink-0">
              {t('editor.items.total_assets')}
            </label>
            <div className="text-sm font-medium text-ink min-w-0 flex-1">
              {calculateTotalCost(data)}
              <span className="text-xs font-normal text-stone-500 ml-1">gp</span>
            </div>
          </div>
          <InlineInput
            className="w-32 shrink-0"
            label={t('editor.items.encumbrance_multiplier')}
            path="equipment.encumbranceMultiplier"
            value={data.equipment.encumbranceMultiplier}
            originalValue={lastSavedData.equipment?.encumbranceMultiplier}
            onChange={v => update('equipment.encumbranceMultiplier', v)}
            placeholder="1.0"
          />

          <EncumbranceBar data={data} />
        </div>

        <div className="mt-4">
          <MultilineInput
            label={t('editor.items.notes')}
            path="equipment.notes"
            value={data.equipment.notes || ''}
            originalValue={lastSavedData.equipment?.notes}
            onChange={v => update('equipment.notes', v)}
            placeholder={t('editor.items.notes_placeholder')}
            isAutoHeight={true}
          />
        </div>
      </div>
    </Section>
  );
};

export default EquipmentSection;
