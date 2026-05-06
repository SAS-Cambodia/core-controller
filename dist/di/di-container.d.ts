import { ProviderTarget } from "../type";
declare class DiContainer {
    private static instance;
    private services;
    private instances;
    static getInstance(): DiContainer;
    register<T>(target: ProviderTarget<T>): void;
    resolve<T>(target: ProviderTarget<T>): T;
}
export declare const container: DiContainer;
export {};
