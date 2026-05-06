import { Field, Options } from 'multer';
import {DECORATOR_KEY} from "../constant/decorator-key";
export interface FileUpload extends Options {
    keyField?: string | readonly Field[];
    type: 'single' | 'array' | 'fields' | 'none' | 'any';
    maxCount?: number;
    objectStoreCommand?: <T>(file: T ,cb: (...data: any) => void) => void;
}


export function FileUpload(options: FileUpload) {
    return (target: any, propertyKey: string | symbol, parameterIndex: number) => {
        Reflect.defineMetadata(DECORATOR_KEY.FILE_UPLOAD, {
            parameterIndex,
            options
        },target, propertyKey);
    };
}