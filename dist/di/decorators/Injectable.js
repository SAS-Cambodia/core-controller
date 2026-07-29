"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Injectable = Injectable;
const di_container_1 = require("../di-container");
function Injectable() {
    return (target) => {
        di_container_1.container.register(target);
    };
}
