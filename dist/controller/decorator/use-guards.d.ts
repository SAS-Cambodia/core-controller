import { CanActivate } from "../../interface";
export declare function UseGuards(...guards: Array<new (...args: any[]) => CanActivate>): (target: any, propertyKey?: string | symbol) => void;
