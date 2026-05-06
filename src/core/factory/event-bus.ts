import EventEmitter from "eventemitter3";

class EventBus extends EventEmitter {}

export const eventBus = new EventBus();