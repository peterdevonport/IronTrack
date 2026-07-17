# Interaction Patterns

## Event Delegation

All click handlers go through `initActionDispatcher()` in `app.js`:
```javascript
document.body.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const handler = actionHandlers[el.dataset.action];
  if (handler) handler(el, e);
});
```

Add new actions by adding entries to the `actionHandlers` object.

## CSP-Safe Handlers

For elements that need handlers before the dispatcher is ready, use `initCSPHandlers()`:
```javascript
bind(id, event, handler);  // Attaches via getElementById
```

## Swipe Gestures

Used in calendar and volume history:
```javascript
enableSwipe(element, onSwipeLeft, onSwipeRight);
```

## Feedback System

```javascript
showFeedback(message, color, elementId);
// Shows a transient toast notification
```

## Haptic Feedback

```javascript
haptic(HAPTIC.confirm);
haptic(HAPTIC.error);
haptic(HAPTIC.warning);
```
