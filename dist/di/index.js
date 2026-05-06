"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Inject = exports.Injectable = exports.container = void 0;
var di_container_1 = require("./di-container");
Object.defineProperty(exports, "container", { enumerable: true, get: function () { return di_container_1.container; } });
var Injectable_1 = require("./decorators/Injectable");
Object.defineProperty(exports, "Injectable", { enumerable: true, get: function () { return Injectable_1.Injectable; } });
var Inject_1 = require("./decorators/Inject");
Object.defineProperty(exports, "Inject", { enumerable: true, get: function () { return Inject_1.Inject; } });
