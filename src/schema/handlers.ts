// 转发层：handlers 已按域拆分至 ./handlers/ 目录，此文件保留原导入路径以兼容全项目既有 import
export * from './handlers/index';
export { default } from './handlers/index';
