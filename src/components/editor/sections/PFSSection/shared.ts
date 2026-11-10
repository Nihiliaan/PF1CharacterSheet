// 文件职责：PFSSection 拆分后各子组件共用的类型与常量
import { PfsChroniclesSoA } from '../../../../schema/types';

// 官网同步记录单与本地记录单的冲突数据（等待用户选择合并策略）
export type PfsConflictData = {
  incoming: any[];
  local: PfsChroniclesSoA;
};

// 记录单合并策略
export type PfsMergeStrategy = 'incremental' | 'overwrite' | 'append';
