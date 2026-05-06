export type Options = {
    type?: 'BEFORE' | 'AFTER';
    middlewareIndex?: number;
};
export declare function Injectable(options?: Options): ClassDecorator;
