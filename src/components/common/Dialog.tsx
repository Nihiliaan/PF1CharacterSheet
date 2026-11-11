/**
 * 通用确认/输入弹窗（底层为 @radix-ui/react-dialog）。
 * Props API 与旧实现完全一致（type/title/defaultValue/onConfirm/onCancel/onSecondaryConfirm…），
 * 调用方零改动；由 radix 提供 ESC 关闭、点击遮罩关闭、焦点圈禁与 Portal。
 */
import React, { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Save } from 'lucide-react';

const Dialog = ({ type, title, defaultValue = '', onConfirm, onCancel, onSecondaryConfirm, secondaryLabel, confirmLabel, confirmClassName }: {
  type: 'prompt' | 'confirm',
  title: string,
  defaultValue?: string,
  onConfirm: (val: string) => void,
  onCancel: () => void,
  onSecondaryConfirm?: () => void,
  secondaryLabel?: string,
  confirmLabel?: string,
  confirmClassName?: string
}) => {
  const [val, setVal] = useState(defaultValue);
  const handleConfirm = () => onConfirm(val);
  return (
    <DialogPrimitive.Root open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-[100] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl shadow-2xl outline-none"
        >
          <div className="p-6 bg-white rounded-t-2xl">
            <DialogPrimitive.Title className="text-lg font-bold text-stone-800 mb-2">{title}</DialogPrimitive.Title>
            {type === 'prompt' && (
              <input
                type="text"
                value={val}
                onChange={e => setVal(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleConfirm()}
                className="w-full px-4 py-3 bg-stone-100 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 border border-transparent focus:border-stone-300 transition-all"
              />
            )}
          </div>
          <div className="flex flex-col border-t border-stone-100 bg-stone-50/50 rounded-b-2xl overflow-hidden">
            <div className="flex">
              <button onClick={onCancel} className="flex-1 px-6 py-4 text-stone-500 hover:bg-stone-100 transition-colors font-medium border-r border-stone-100 text-sm">取消</button>
              <button onClick={handleConfirm} className={`flex-1 px-6 py-4 transition-colors font-bold text-sm ${confirmClassName || (onSecondaryConfirm ? 'text-rose-600' : 'text-primary')} hover:bg-stone-100`}>
                {confirmLabel || (type === 'confirm' ? '丢弃更改' : '确定')}
              </button>
            </div>
            {onSecondaryConfirm && (
              <button
                onClick={() => onSecondaryConfirm()}
                className="px-6 py-4 bg-primary text-white hover:brightness-110 transition-all font-bold flex items-center justify-center gap-2 text-sm shadow-[0_-1px_0_rgba(0,0,0,0.1)]"
              >
                <Save size={16} />
                {secondaryLabel || '保存并继续'}
              </button>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default Dialog;
