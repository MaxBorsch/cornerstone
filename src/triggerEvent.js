import { CustomEvent as CustomEventImpl } from './events.js';

/**
 * Trigger a CustomEvent
 *
 * @param {EventTarget} el The element or EventTarget to trigger the event upon
 * @param {String} type The event type name
 * @param {Object|null} detail=null The event data to be sent
 * @returns {Boolean} The return value is false if at least one event listener called preventDefault(). Otherwise it returns true.
 */
export default function triggerEvent (el, type, detail = null) {
  const eventTarget = (typeof el.dispatchEvent === 'function' ? el : el.eventTarget);

  if (!eventTarget) {
    throw new Error('Attempt to call triggerEvent() on an incompatible object');
  }

  let event;

  // This check is needed to polyfill CustomEvent on IE11-
  if (typeof window.CustomEvent === 'function') {
    event = new CustomEvent(type, {
      detail,
      cancelable: true
    });
  } else {
    if (typeof document === 'undefined') {
      event = new CustomEventImpl(type, {
        detail,
        cancelable: true
      });
    } else {
      event = document.createEvent('CustomEvent');
    }
    event.initCustomEvent(type, true, true, detail);
  }

  return eventTarget.dispatchEvent(event);
}
