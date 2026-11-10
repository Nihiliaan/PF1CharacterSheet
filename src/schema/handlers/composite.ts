/**
 * composite.ts —— 复合 Handler
 * 职责：CompositeHandler 基类与业务复合实例（基础信息、战斗信息、货币等）
 * 依赖 primitives.ts 的 BaseHandler 基类
 */
import { BaseHandler } from './primitives';

export class CompositeHandler extends BaseHandler {
  _ui = 'composite';
  view: string = 'CompositeView';
  columns?: any[];

  constructor(config: Partial<CompositeHandler> = {}) {
    super();
    Object.assign(this, config);
  }

  formatDisplay() { return 'Composite Object'; }
}

const BasicInfoHandler = new CompositeHandler();
const CombatInfoHandler = new CompositeHandler({
  columns: [
    { key: 'bab', label: 'editor.combat.bab', width: '33.33%', type: 'bonus' },
    { key: 'cmb', label: 'editor.combat.cmb', width: '33.33%', type: 'bonus' },
    { key: 'cmd', label: 'editor.combat.cmd', width: '33.34%', type: 'int' }
  ]
});
const CurrencyHandler = new CompositeHandler();

export {
  BasicInfoHandler, CombatInfoHandler, CurrencyHandler
};
