import { DECORATOR_KEY } from "../constant/decorator-key";

export function SocketController(basePath: string): ClassDecorator {
    return function (target: any) {
        Reflect.defineMetadata(DECORATOR_KEY.CONTROLLER_PATH, basePath, target);
        Reflect.defineMetadata(DECORATOR_KEY.CONTROLLER, DECORATOR_KEY.SOCKET, target);
    };
}