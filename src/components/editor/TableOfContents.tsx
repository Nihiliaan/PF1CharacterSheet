import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * 编辑器概览标尺（目录与滚动条合一）。
 * 绝对定位在所属编辑器容器右缘全高（每个编辑器分栏各自一份）：
 * - 各区块色块按其在文档中的真实高度比例排布，替代均匀分布的目录点；
 * - 半透明滑块表示当前视口，可拖动（即滚动条），轨道空白处按下即按比例跳转；
 * - 点击色块/标签平滑滚动到对应区块，悬停展开显示标签（带碰撞规避）；
 * - 当前视口所在的区块高亮。
 * 区块查找限定在传入的滚动容器内：多分栏渲染相同 section id 时互不干扰。
 */
const SECTION_DEFS = [
  { id: 'basic-info', key: 'editor.sections.basic' },
  { id: 'story', key: 'editor.sections.story' },
  { id: 'attributes', key: 'editor.sections.attributes' },
  { id: 'attacks', key: 'editor.sections.attacks' },
  { id: 'defenses', key: 'editor.sections.defenses' },
  { id: 'racial-traits', key: 'editor.sections.racial_traits' },
  { id: 'traits', key: 'editor.sections.traits' },
  { id: 'class-features', key: 'editor.sections.class_features' },
  { id: 'feats', key: 'editor.sections.feats' },
  { id: 'spells', key: 'editor.sections.spells' },
  { id: 'skills', key: 'editor.sections.skills' },
  { id: 'equipment', key: 'editor.sections.equipment' },
  { id: 'additional-data', key: 'editor.sections.additional' },
  { id: 'pfs', key: 'editor.sections.pfs' }
] as const;

interface SectionMetric {
  id: string;
  top: number;
  height: number;
}

interface RulerMetrics {
  sections: SectionMetric[];
  scrollHeight: number;
  clientHeight: number;
  trackHeight: number;
}

const MIN_THUMB_H = 24; // 滑块最小像素高（内容超长时不至于捏没）
const MIN_TICK_H = 3; // 区块色块最小像素高
const LABEL_H = 20; // 标签行高（leading-5），标签碰撞规避用

export default function TableOfContents({ scrollRef }: { scrollRef?: React.RefObject<HTMLElement | null> }) {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<RulerMetrics | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ grabOffset: number } | null>(null);
  const measureRafRef = useRef(0);
  const scrollRafRef = useRef(0);

  const labelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const def of SECTION_DEFS) map.set(def.id, t(def.key));
    return map;
  }, [t]);

  // 度量：各节相对滚动内容顶部的 offsetTop/高度 + 容器与轨道尺寸。
  // 用 getBoundingClientRect 差值 + scrollTop，不依赖 offsetParent 假设，且与当前滚动位置无关。
  const measure = useCallback(() => {
    const container = scrollRef?.current;
    if (!container) return;
    const containerTop = container.getBoundingClientRect().top;
    const sections: SectionMetric[] = [];
    for (const { id } of SECTION_DEFS) {
      const el = container.querySelector(`#${id}`) as HTMLElement | null;
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      sections.push({ id, top: rect.top - containerTop + container.scrollTop, height: rect.height });
    }
    setMetrics({
      sections,
      scrollHeight: container.scrollHeight,
      clientHeight: container.clientHeight,
      trackHeight: trackRef.current?.clientHeight || container.clientHeight
    });
    setScrollTop(container.scrollTop);
  }, [scrollRef]);

  useEffect(() => {
    const container = scrollRef?.current;
    if (!container) return;

    measure();

    const scheduleMeasure = () => {
      if (measureRafRef.current) return;
      measureRafRef.current = requestAnimationFrame(() => {
        measureRafRef.current = 0;
        measure();
      });
    };

    // 容器尺寸（分栏缩放/窗口变化）与内容高度（节折叠、编辑增高、字体加载）变化都要重测
    const ro = new ResizeObserver(scheduleMeasure);
    ro.observe(container);
    if (container.firstElementChild) ro.observe(container.firstElementChild);

    const onScroll = () => {
      if (scrollRafRef.current) return;
      scrollRafRef.current = requestAnimationFrame(() => {
        scrollRafRef.current = 0;
        setScrollTop(container.scrollTop);
      });
    };
    container.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      ro.disconnect();
      container.removeEventListener('scroll', onScroll);
      if (measureRafRef.current) cancelAnimationFrame(measureRafRef.current);
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
      measureRafRef.current = 0;
      scrollRafRef.current = 0;
    };
  }, [measure, scrollRef]);

  const overflow = !!metrics && metrics.scrollHeight > metrics.clientHeight + 1;
  const pxPer = metrics && metrics.scrollHeight > 0 ? metrics.trackHeight / metrics.scrollHeight : 0;

  const thumbH = metrics ? Math.max(metrics.clientHeight * pxPer, MIN_THUMB_H) : 0;
  const thumbTop = metrics ? Math.min(Math.max(scrollTop * pxPer, 0), metrics.trackHeight - thumbH) : 0;

  // 当前节：视口上沿 1/4 高度线所落在的区块
  const activeId = useMemo(() => {
    if (!metrics) return null;
    const line = scrollTop + metrics.clientHeight * 0.25;
    let active: string | null = null;
    for (const sec of metrics.sections) {
      if (sec.top <= line) active = sec.id;
    }
    return active ?? metrics.sections[0]?.id ?? null;
  }, [metrics, scrollTop]);

  // 标签纵向位置：先取区块中心，再自上而下做碰撞规避（真实比例下相邻小节标签会重叠）
  const labelTops = useMemo(() => {
    const tops = new Map<string, number>();
    if (!metrics || !pxPer) return tops;
    let prevBottom = -Infinity;
    for (const sec of metrics.sections) {
      const center = sec.top * pxPer + Math.max(sec.height * pxPer, MIN_TICK_H) / 2;
      const top = Math.max(center - LABEL_H / 2, prevBottom + 2);
      tops.set(sec.id, top);
      prevBottom = top + LABEL_H;
    }
    return tops;
  }, [metrics, pxPer]);

  const scrollTo = useCallback(
    (id: string) => {
      const el = scrollRef?.current
        ? scrollRef.current.querySelector(`#${id}`)
        : document.getElementById(id);
      el?.scrollIntoView({ behavior: 'smooth' });
    },
    [scrollRef]
  );

  const beginDrag = (e: React.PointerEvent, grabOffset: number, jumpToPointer: boolean) => {
    const container = scrollRef?.current;
    const track = trackRef.current;
    if (!container || !track) return;
    e.preventDefault();
    const maxScroll = container.scrollHeight - container.clientHeight;
    if (maxScroll <= 0) return;
    dragRef.current = { grabOffset };
    track.setPointerCapture(e.pointerId);
    setDragging(true);
    if (jumpToPointer) {
      // 点击轨道空白处：把滑块中心跳到按下点，并随之进入拖动
      const rect = track.getBoundingClientRect();
      const thumbH = Math.max(container.clientHeight * (rect.height / container.scrollHeight), MIN_THUMB_H);
      const ratio = (e.clientY - rect.top - grabOffset) / Math.max(rect.height - thumbH, 1);
      container.scrollTop = Math.min(Math.max(ratio, 0), 1) * maxScroll;
    }
  };

  const onTrackPointerDown = (e: React.PointerEvent) => {
    const rect = trackRef.current?.getBoundingClientRect();
    const container = scrollRef?.current;
    if (!rect || !container) return;
    const thumbH = Math.max(container.clientHeight * (rect.height / container.scrollHeight), MIN_THUMB_H);
    beginDrag(e, thumbH / 2, true);
  };

  // 按住滑块时保留抓取点偏移（原生滚动条手感），不平移跳变
  const onThumbPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    const thumb = thumbRef.current;
    if (!thumb) return;
    beginDrag(e, e.clientY - thumb.getBoundingClientRect().top, false);
  };

  const onTrackPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    const container = scrollRef?.current;
    const track = trackRef.current;
    if (!drag || !container || !track) return;
    e.preventDefault();
    const rect = track.getBoundingClientRect();
    const maxScroll = container.scrollHeight - container.clientHeight;
    const thumbH = Math.max(container.clientHeight * (rect.height / container.scrollHeight), MIN_THUMB_H);
    const ratio = (e.clientY - rect.top - drag.grabOffset) / Math.max(rect.height - thumbH, 1);
    container.scrollTop = Math.min(Math.max(ratio, 0), 1) * maxScroll;
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(false);
    trackRef.current?.releasePointerCapture(e.pointerId);
  };

  // 轨道是滚动容器的兄弟覆盖层，浏览器不会向它链式滚动，悬停时需手动转发滚轮
  const onWheel = (e: React.WheelEvent) => {
    const container = scrollRef?.current;
    if (!container) return;
    container.scrollTop += e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
  };

  if (!overflow || !metrics) return null;

  return (
    <div
      ref={trackRef}
      role="scrollbar"
      aria-orientation="vertical"
      aria-valuenow={Math.round(scrollTop)}
      aria-valuemax={Math.round(metrics.scrollHeight - metrics.clientHeight)}
      aria-label={t('editor.toc.ruler')}
      className={`absolute inset-y-0 right-0 z-30 hidden md:block group select-none touch-none overflow-hidden transition-all duration-300 ${
        dragging ? 'w-48 cursor-grabbing' : 'w-3 hover:w-48 cursor-default'
      }`}
      onPointerDown={onTrackPointerDown}
      onPointerMove={onTrackPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onWheel={onWheel}
    >
      {metrics.sections.map((sec) => {
        const blockTop = sec.top * pxPer;
        const blockH = Math.max(sec.height * pxPer, MIN_TICK_H);
        const isActive = sec.id === activeId;
        const labelTop = labelTops.get(sec.id);
        return (
          <button
            key={sec.id}
            type="button"
            aria-label={labelById.get(sec.id)}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => scrollTo(sec.id)}
            style={{ top: blockTop, height: blockH }}
            className={`absolute right-0 w-2.5 rounded-l-full transition-colors ${
              isActive ? 'bg-primary/70' : 'bg-stone-300 group-hover:bg-stone-400/60 hover:bg-primary/50'
            }`}
          >
            <span
              style={{ top: labelTop !== undefined ? labelTop - blockTop : undefined }}
              className={`absolute right-full pr-2 leading-5 whitespace-nowrap text-sm font-bold text-stone-500 transition-all duration-200 pointer-events-none ${
                dragging
                  ? 'opacity-100 translate-x-0'
                  : 'opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 group-hover:pointer-events-auto'
              }`}
            >
              {labelById.get(sec.id)}
            </span>
          </button>
        );
      })}
      {/* 滑块用半透明深色：保持全标尺最深（激活节色块次之），同时透出底下节色块的边界 */}
      <div
        ref={thumbRef}
        onPointerDown={onThumbPointerDown}
        style={{ top: thumbTop, height: thumbH }}
        className={`absolute right-0 w-3 rounded-l-full ring-1 ring-paper/80 transition-colors ${
          dragging ? 'bg-ink/80' : 'bg-ink/60 group-hover:bg-ink/75'
        }`}
      />
    </div>
  );
}
