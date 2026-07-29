import { ClassTransformOptions } from "class-transformer/types/interfaces";
export declare function Query(queryKey?: string, options?: ClassTransformOptions): (target: any, propertyKey: string | symbol, queryIndex: number) => void;
