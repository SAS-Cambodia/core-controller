import { HttpMethod } from "./util";
export * from './decorator/controller';
export * from './decorator/socket-controller';
// decorator
export * from './decorator/response';
export * from './decorator/request';
export * from './decorator/param';
export * from './decorator/body';
export * from './decorator/query';
export * from './decorator/middleware';
export * from './decorator/file-upload';
export * from './decorator/socket-response';
export * from './decorator/socket-body';
export * from './decorator/socket-data';
export * from './decorator/socket-instance';

export const Get = (path?: string) => HttpMethod('get', path);
export const Post = (path?: string) => HttpMethod('post', path);
export const Put = (path?: string) => HttpMethod('put', path);
export const Delete = (path?: string) => HttpMethod('delete', path);
export const Patch = (path?: string) => HttpMethod('patch', path);
export const SocketEvent = (path?: string) => HttpMethod('event', path);
// utility
export * from './util/index';
export { DECORATOR_KEY } from './constant/decorator-key';