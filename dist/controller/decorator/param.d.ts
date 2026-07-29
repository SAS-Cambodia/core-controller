import { ClassTransformOptions } from "class-transformer/types/interfaces";
export declare function Param(param?: string, options?: ClassTransformOptions): (target: any, propertyKey: string | symbol, parameterIndex: number) => void;
