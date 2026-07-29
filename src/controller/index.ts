import { HttpMethod } from "./util";
export * from './decorator/controller';
export * from './decorator/socket-controller';
export * from './decorator/access-control';
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
export * from './decorator/socket-query';
export * from './decorator/use-guards';
export * from './decorator/headers';
export * from './decorator/cookies';
export * from './decorator/ip';
export * from './decorator/response-interceptor';

export const Get = (path?: string) => HttpMethod('get', path);
export const Post = (path?: string) => HttpMethod('post', path);
export const Put = (path?: string) => HttpMethod('put', path);
export const Delete = (path?: string) => HttpMethod('delete', path);
export const Patch = (path?: string) => HttpMethod('patch', path);
export const SocketEvent = (path?: string) => HttpMethod('event', path);
// utility
export * from './util/index';
export { DECORATOR_KEY } from './constant/decorator-key';