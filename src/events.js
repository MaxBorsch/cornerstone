const EVENTS = {
  NEW_IMAGE: 'cornerstonenewimage',
  INVALIDATED: 'cornerstoneinvalidated',
  PRE_RENDER: 'cornerstoneprerender',
  IMAGE_CACHE_MAXIMUM_SIZE_CHANGED: 'cornerstoneimagecachemaximumsizechanged',
  IMAGE_CACHE_PROMISE_REMOVED: 'cornerstoneimagecachepromiseremoved',
  IMAGE_CACHE_FULL: 'cornerstoneimagecachefull',
  IMAGE_CACHE_CHANGED: 'cornerstoneimagecachechanged',
  WEBGL_TEXTURE_REMOVED: 'cornerstonewebgltextureremoved',
  WEBGL_TEXTURE_CACHE_FULL: 'cornerstonewebgltexturecachefull',
  IMAGE_LOADED: 'cornerstoneimageloaded',
  IMAGE_LOAD_FAILED: 'cornerstoneimageloadfailed',
  ELEMENT_RESIZED: 'cornerstoneelementresized',
  IMAGE_RENDERED: 'cornerstoneimagerendered',
  LAYER_ADDED: 'cornerstonelayeradded',
  LAYER_REMOVED: 'cornerstonelayerremoved',
  ACTIVE_LAYER_CHANGED: 'cornerstoneactivelayerchanged',
  ELEMENT_DISABLED: 'cornerstoneelementdisabled',
  ELEMENT_ENABLED: 'cornerstoneelementenabled'
};

export default EVENTS;

/**
 * EventTarget - Provides the [EventTarget](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget) interface
 *
 * @class
 * @memberof Polyfills
 */
export class EventTarget {
  constructor () {
    this.listeners = {};
    this.namespaces = {};
  }

  addEventNamespaceListener (type, callback) {
    if (type.indexOf('.') <= 0) {
      return;
    }

    this.namespaces[type] = callback;
    this.addEventListener(type.split('.')[0], callback);
  }

  removeEventNamespaceListener (type) {
    if (type.indexOf('.') <= 0 || !this.namespaces[type]) {
      return;
    }

    this.removeEventListener(type.split('.')[0], this.namespaces[type]);
    delete this.namespaces[type];
  }

  addEventListener (type, callback) {
    // Check if it is an event namespace
    if (type.indexOf('.') > 0) {
      this.addEventNamespaceListener(type, callback);

      return;
    }

    if (!(type in this.listeners)) {
      this.listeners[type] = [];
    }

    this.listeners[type].push(callback);
  }

  removeEventListener (type, callback) {
    // Check if it is an event namespace
    if (type.indexOf('.') > 0) {
      this.removeEventNamespaceListener(type);

      return;
    }

    if (!(type in this.listeners)) {
      return;
    }

    const stack = this.listeners[type];

    for (let i = 0, l = stack.length; i < l; i++) {
      if (stack[i] === callback) {
        stack.splice(i, 1);

        return;
      }
    }
  }

  dispatchEvent (event) {
    if (!(event.type in this.listeners)) {
      return true;
    }

    const stack = this.listeners[event.type];

    for (let i = 0, l = stack.length; i < l; i++) {
      stack[i].call(this, event);
    }

    return !event.defaultPrevented;
  }
}


export const events = new EventTarget();

// Event implementation for environments without document.createEvent() global (e.g. react-native) from:
// https://github.com/jsdom/jsdom/blob/master/lib/jsdom/living/events/Event-impl.js
const EventInit = {
  bubbles: false,
  cancelable: false,
  composed: false
};

export class Event {
  constructor (args, privateData) {
    const [type, eventInitDict = this.constructor.defaultInit] = args;

    this.type = type;

    this.bubbles = false;
    this.cancelable = false;
    for (const key in eventInitDict) {
      if (key in this.constructor.defaultInit) {
        this[key] = eventInitDict[key];
      }
    }
    for (const key in this.constructor.defaultInit) {
      if (!(key in this)) {
        this[key] = this.constructor.defaultInit[key];
      }
    }

    this.target = null;
    this.currentTarget = null;
    this.eventPhase = 0;

    this._initializedFlag = true;
    this._stopPropagationFlag = false;
    this._stopImmediatePropagationFlag = false;
    this._canceledFlag = false;
    this._inPassiveListenerFlag = false;
    this._dispatchFlag = false;
    this._path = [];

    this.isTrusted = privateData.isTrusted || false;
    this.timeStamp = Date.now();
  }

  // https://dom.spec.whatwg.org/#set-the-canceled-flag
  _setTheCanceledFlag() {
    if (this.cancelable && !this._inPassiveListenerFlag) {
      this._canceledFlag = true;
    }
  }

  get srcElement() {
    return this.target;
  }

  get returnValue() {
    return !this._canceledFlag;
  }

  set returnValue(v) {
    if (v === false) {
      this._setTheCanceledFlag();
    }
  }

  get defaultPrevented() {
    return this._canceledFlag;
  }

  stopPropagation() {
    this._stopPropagationFlag = true;
  }

  get cancelBubble() {
    return this._stopPropagationFlag;
  }

  set cancelBubble(v) {
    if (v) {
      this._stopPropagationFlag = true;
    }
  }

  stopImmediatePropagation() {
    this._stopPropagationFlag = true;
    this._stopImmediatePropagationFlag = true;
  }

  preventDefault() {
    this._setTheCanceledFlag();
  }

  // https://dom.spec.whatwg.org/#dom-event-composedpath
  // Current implementation is based of https://whatpr.org/dom/699.html#dom-event-composedpath
  // due to a bug in composed path implementation https://github.com/whatwg/dom/issues/684
  composedPath() {
    const composedPath = [];

    const { currentTarget, _path: path } = this;

    if (path.length === 0) {
      return composedPath;
    }

    composedPath.push(currentTarget);

    let currentTargetIndex = 0;
    let currentTargetHiddenSubtreeLevel = 0;

    for (let index = path.length - 1; index >= 0; index--) {
      const { item, rootOfClosedTree, slotInClosedTree } = path[index];

      if (rootOfClosedTree) {
        currentTargetHiddenSubtreeLevel++;
      }

      if (item === currentTarget) { // modified
        currentTargetIndex = index;
        break;
      }

      if (slotInClosedTree) {
        currentTargetHiddenSubtreeLevel--;
      }
    }

    let currentHiddenLevel = currentTargetHiddenSubtreeLevel;
    let maxHiddenLevel = currentTargetHiddenSubtreeLevel;

    for (let i = currentTargetIndex - 1; i >= 0; i--) {
      const { item, rootOfClosedTree, slotInClosedTree } = path[i];

      if (rootOfClosedTree) {
        currentHiddenLevel++;
      }

      if (currentHiddenLevel <= maxHiddenLevel) {
        composedPath.unshift(item); // modified
      }

      if (slotInClosedTree) {
        currentHiddenLevel--;
        if (currentHiddenLevel < maxHiddenLevel) {
          maxHiddenLevel = currentHiddenLevel;
        }
      }
    }

    currentHiddenLevel = currentTargetHiddenSubtreeLevel;
    maxHiddenLevel = currentTargetHiddenSubtreeLevel;

    for (let index = currentTargetIndex + 1; index < path.length; index++) {
      const { item, rootOfClosedTree, slotInClosedTree } = path[index];

      if (slotInClosedTree) {
        currentHiddenLevel++;
      }

      if (currentHiddenLevel <= maxHiddenLevel) {
        composedPath.push(item); // modified
      }

      if (rootOfClosedTree) {
        currentHiddenLevel--;
        if (currentHiddenLevel < maxHiddenLevel) {
          maxHiddenLevel = currentHiddenLevel;
        }
      }
    }

    return composedPath;
  }

  _initialize (type, bubbles, cancelable) {
    this.type = type;
    this._initializedFlag = true;

    this._stopPropagationFlag = false;
    this._stopImmediatePropagationFlag = false;
    this._canceledFlag = false;

    this.isTrusted = false;
    this.target = null;
    this.bubbles = bubbles;
    this.cancelable = cancelable;
  }

  initEvent (type, bubbles, cancelable) {
    if (this._dispatchFlag) {
      return;
    }

    this._initialize(type, bubbles, cancelable);
  }
}
Event.defaultInit = EventInit; // modified

// CustomEvent implementation, see Event implementation note above for details.
// https://github.com/jsdom/jsdom/blob/master/lib/jsdom/living/events/CustomEvent-impl.js
const CustomEventInit = {
  bubbles: false,
  cancelable: false,
  composed: false,
  detail: null
};

export class CustomEvent extends Event {
  initCustomEvent (type, bubbles, cancelable, detail) {
    if (this._dispatchFlag) {
      return;
    }

    this.initEvent(type, bubbles, cancelable);
    this.detail = detail;
  }
}
CustomEvent.defaultInit = CustomEventInit;
