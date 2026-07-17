---
name: frontend-dev
description: "Use when building or modifying UI components, styling, responsive design, accessibility, or CSS architecture. Generic patterns — not project-specific."
---

# Frontend Development

## Component Patterns
- Look at existing components before creating new ones
- Prefer pure rendering functions — same input always produces same output
- Keep templates readable with consistent indentation and clear variable names

## Security
- Escape all user-supplied values before inserting into HTML
- Never inject raw data from external sources into the DOM
- Validate inputs at the boundary

## Accessibility
- Use semantic HTML elements where possible
- Ensure interactive elements are keyboard-navigable
- Maintain sufficient colour contrast ratios
- Use ARIA attributes when native semantics aren't enough

## Responsive Design
- Start mobile-first, add breakpoints as needed
- Use CSS grid and flexbox for layout
- Test at common breakpoints: 640px, 768px, 1024px, 1280px

## CSS Architecture
- Use utility classes for layout and spacing
- Design tokens (colours, spacing, type scale) should be CSS custom properties
- Component classes for complex, reusable UI patterns
- Avoid deep nesting and high specificity selectors

## Event Handling
- Use event delegation for repeated elements
- Prefer data attributes over inline event handlers
- Clean up event listeners when components are removed
