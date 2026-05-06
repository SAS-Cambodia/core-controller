"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Inject = Inject;
const di_container_1 = require("../di-container");
function Inject() {
    return (target, propertyKey) => {
        const serviceType = Reflect.getMetadata("design:type", target, propertyKey);
        if (!serviceType) {
            throw new Error(`Cannot resolve type for '${String(propertyKey)}'. Ensure the property type is explicitly defined.`);
        }
        Object.defineProperty(target, propertyKey, {
            get: () => di_container_1.container.resolve(serviceType),
        });
    };
}
