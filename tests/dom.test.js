import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce, escapeHtml, haptic } from '../dom.js';

describe('escapeHtml', () => {
  it('escapes &', () => {
    expect(escapeHtml('foo & bar')).toBe('foo &amp; bar');
  });

  it('escapes <', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes >', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b');
  });

  it('escapes double quotes', () => {
    expect(escapeHtml('say "hello"')).toBe('say &quot;hello&quot;');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#39;s');
  });

  it('passes through normal text', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });

  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('coerces non-string input', () => {
    expect(escapeHtml(123)).toBe('123');
  });
});

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires after the wait period', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('resets timer on rapid calls', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    vi.advanceTimersByTime(50);
    debounced();
    vi.advanceTimersByTime(50);
    debounced();
    vi.advanceTimersByTime(50);

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('passes arguments to the wrapped function', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('arg1', 42);
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledWith('arg1', 42);
  });

  it('preserves this context', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    const ctx = { value: 42 };

    debounced.call(ctx);
    vi.advanceTimersByTime(100);

    expect(fn.mock.instances[0]).toBe(ctx);
  });
});

describe('haptic', () => {
  beforeEach(() => {
    navigator.vibrate = vi.fn();
  });

  it('calls navigator.vibrate with the pattern', () => {
    haptic([50, 30, 50]);
    expect(navigator.vibrate).toHaveBeenCalledWith([50, 30, 50]);
  });

  it('handles single number pattern', () => {
    haptic(30);
    expect(navigator.vibrate).toHaveBeenCalledWith(30);
  });

  it('does not throw when vibrate is unavailable', () => {
    delete navigator.vibrate;
    expect(() => haptic(30)).not.toThrow();
  });
});
