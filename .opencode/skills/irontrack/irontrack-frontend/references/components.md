# Component Patterns

## Rendering Functions

```javascript
// Template function pattern
function renderComponent(data, index) {
  return `
    <div class="flex ...">
      <span>${escapeHtml(data.name)}</span>
    </div>`;
}

// After insertion
element.innerHTML = html;
lucide.createIcons();          // Render Lucide icons
```

## Action Buttons

```html
<button data-action="remove-plan-movement" data-index="0">Remove</button>
```

Handled via `initActionDispatcher()` in `app.js`:
```javascript
const actionHandlers = {
  'remove-plan-movement': (el) => removePlanMovement(parseInt(el.dataset.index, 10)),
};
```

## Tab Navigation

```html
<div id="tab-content-id" class="tab-content"></div>
```

Switched via `switchTab()` in `ui.js`, backed by `history.pushState`.

## Pagination

```javascript
state.pagination.workouts = { page: 0, hasMore: true };
// Renders prev/next buttons that update page and re-render
```
