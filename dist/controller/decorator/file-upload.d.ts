import { Field, Options } from 'multer';
export interface FileUpload extends Options {
    keyField?: string | readonly Field[];
    type: 'single' | 'array' | 'fields' | 'none' | 'any';
    maxCount?: number;
    objectStoreCommand?: <T>(file: T, cb: (...data: any) => void) => void;
}
export declare function FileUpload(options: FileUpload): (target: any, propertyKey: string | symbol, parameterIndex: number) => void;
