"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DECORATOR_KEY = exports.SocketEvent = exports.Patch = exports.Delete = exports.Put = exports.Post = exports.Get = void 0;
const util_1 = require("./util");
__exportStar(require("./decorator/controller"), exports);
__exportStar(require("./decorator/socket-controller"), exports);
// decorator
__exportStar(require("./decorator/response"), exports);
__exportStar(require("./decorator/request"), exports);
__exportStar(require("./decorator/param"), exports);
__exportStar(require("./decorator/body"), exports);
__exportStar(require("./decorator/query"), exports);
__exportStar(require("./decorator/middleware"), exports);
__exportStar(require("./decorator/file-upload"), exports);
__exportStar(require("./decorator/socket-response"), exports);
__exportStar(require("./decorator/socket-body"), exports);
__exportStar(require("./decorator/socket-data"), exports);
__exportStar(require("./decorator/socket-instance"), exports);
const Get = (path) => (0, util_1.HttpMethod)('get', path);
exports.Get = Get;
const Post = (path) => (0, util_1.HttpMethod)('post', path);
exports.Post = Post;
const Put = (path) => (0, util_1.HttpMethod)('put', path);
exports.Put = Put;
const Delete = (path) => (0, util_1.HttpMethod)('delete', path);
exports.Delete = Delete;
const Patch = (path) => (0, util_1.HttpMethod)('patch', path);
exports.Patch = Patch;
const SocketEvent = (path) => (0, util_1.HttpMethod)('event', path);
exports.SocketEvent = SocketEvent;
// utility
__exportStar(require("./util/index"), exports);
var decorator_key_1 = require("./constant/decorator-key");
Object.defineProperty(exports, "DECORATOR_KEY", { enumerable: true, get: function () { return decorator_key_1.DECORATOR_KEY; } });
