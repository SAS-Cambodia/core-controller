"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventBus = void 0;
const eventemitter3_1 = __importDefault(require("eventemitter3"));
class EventBus extends eventemitter3_1.default {
}
exports.eventBus = new EventBus();
