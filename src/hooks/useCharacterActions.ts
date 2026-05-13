import React, { useCallback } from 'react';
import { CharacterData } from '../types';
import { dataUpdateService } from '../services/dataUpdateService';

export const useCharacterActions = (
  isReadOnly: boolean,
  setData: React.Dispatch<React.SetStateAction<CharacterData>>
) => {
  const updateBasic = useCallback((key: string, val: any) => {
    if (isReadOnly) return;
    setData(p => dataUpdateService.updateField(p, 'basic', key, val));
  }, [isReadOnly, setData]);

  const updateDefenses = useCallback((key: string, val: any) => {
    if (isReadOnly) return;
    setData(p => dataUpdateService.updateField(p, 'defenses', key, val));
  }, [isReadOnly, setData]);

  const addBag = () => setData(p => dataUpdateService.addBag(p));
  const removeBag = (id: string) => setData(p => dataUpdateService.removeBag(p, id));
  const updateBagName = (id: string, name: string) => setData(p => dataUpdateService.updateBag(p, id, { name }));
  const toggleBagWeight = (id: string, ignoreWeight: boolean) => setData(p => dataUpdateService.updateBag(p, id, { ignoreWeight }));
  const updateBagItems = (id: string, items: any[]) => setData(p => dataUpdateService.updateBag(p, id, { items }));

  const addMagicBlock = (type: 'text' | 'table' | 'spell', spellType?: number) => {
    let newBlock: any;
    if (type === 'spell') {
      const sType = spellType ?? 2;
      newBlock = {
        id: 'magic-' + Math.random(),
        type: 'spell',
        spellType: sType,
        title: sType === 4 ? '类法术能力' : '法术',
        casterLevel: '',
        concentration: '',
        notes: '',
        baseLevel: (sType === 0 || sType === 2) ? 0 : 1,
        tableData: [{}]
      };
      const columns = [{ key: 'level', label: '环位', width: '10%' }];
      if (sType !== 0 && sType !== 1) columns.push({ key: 'uses', label: '每日次数', width: '20%' });
      columns.push({ key: 'spell_name', label: '法术', width: sType > 1 ? '70%' : '90%' });
      newBlock.columns = columns;
    } else {
      newBlock = {
        id: 'magic-' + Math.random(),
        type,
        title: type === 'text' ? '自定文本' : '类别名',
        content: '',
        columns: [{ key: 'col0', label: '列1' }, { key: 'col1', label: '列2' }, { key: 'col2', label: '列3' }],
        tableData: []
      };
    }
    setData(p => ({ ...p, magicBlocks: [...(p.magicBlocks || []), newBlock] }));
  };

  const updateMagicBlock = (id: string, updates: any) => {
    setData(p => ({
      ...p,
      magicBlocks: p.magicBlocks.map(b => b.id === id ? { ...b, ...updates } : b)
    }));
  };

  const removeMagicBlock = (id: string) => {
    setData(p => ({ ...p, magicBlocks: p.magicBlocks.filter(b => b.id !== id) }));
  };

  const addAdditionalBlock = (type: 'text' | 'table' | 'image') => {
    const newBlock = {
      id: 'add-' + Math.random(),
      type,
      title: type === 'text' ? '自定文本' : type === 'table' ? '自定表格' : '附加图片',
      content: '',
      url: '',
      columns: [{ key: 'col0', label: '列1' }, { key: 'col1', label: '列2' }, { key: 'col2', label: '列3' }],
      tableData: []
    };
    setData(p => ({ ...p, additionalData: [...p.additionalData, newBlock] }));
  };

  const updateAdditionalBlock = (id: string, updates: any) => {
    setData(p => ({
      ...p,
      additionalData: p.additionalData.map(b => b.id === id ? { ...b, ...updates } : b)
    }));
  };

  const removeAdditionalBlock = (id: string) => {
    setData(p => ({ ...p, additionalData: p.additionalData.filter(b => b.id !== id) }));
  };

  return {
    updateBasic, updateDefenses, addBag, removeBag, updateBagName, toggleBagWeight, updateBagItems,
    addMagicBlock, updateMagicBlock, removeMagicBlock,
    addAdditionalBlock, updateAdditionalBlock, removeAdditionalBlock
  };
};
