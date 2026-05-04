import React from 'react';
import DynamicTable from '../components/tables/DynamicTable';
import SpellTable from '../components/tables/SpellTable';
import MagicBlocks from '../components/character/MagicBlocks';
import EquipmentBags from '../components/character/EquipmentBags';
import AdditionalData from '../components/character/AdditionalData';

/**
 * 业务视图注册表
 * 将 dataTypes 中的字符串标识符映射到实际的 React 业务组件
 */
export const VIEW_REGISTRY: Record<string, React.ComponentType<any>> = {
  DynamicTable: DynamicTable,
  SpellTable: SpellTable,
  MagicBlocks: MagicBlocks,
  EquipmentBags: EquipmentBags,
  AdditionalData: AdditionalData,
};
