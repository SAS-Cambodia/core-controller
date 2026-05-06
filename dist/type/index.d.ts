export type PathMatcher = string | RegExp;
export type SocketCallBack<T = any> = (data: T) => void;
export type ProviderTarget<T> = {
    new (...args: any[]): T;
};
