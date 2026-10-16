const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const script = fs.readFileSync(path.join(__dirname, '../js/main.js'), 'utf8');
const storageKey = 'theo-portfolio-theme';

class Events {
    constructor() { this.listeners = new Map(); }
    addEventListener(type, listener) {
        if (!this.listeners.has(type)) this.listeners.set(type, []);
        this.listeners.get(type).push(listener);
    }
    removeEventListener(type, listener) {
        this.listeners.set(type, (this.listeners.get(type) || []).filter(item => item !== listener));
    }
    dispatchEvent(event) {
        for (const listener of this.listeners.get(event.type) || []) listener(event);
        return true;
    }
    dispatch(type, values = {}) { this.dispatchEvent({ type, target: this, ...values }); }
}

class Element extends Events {
    constructor(className = '') {
        super();
        this.className = className;
        this.attributes = new Map();
        this.children = [];
        this.textContent = '';
        this.animations = [];
        this.style = {
            setProperty(name, value) { this[name] = String(value); },
            removeProperty(name) { delete this[name]; },
        };
        this.classList = {
            contains: name => this.className.split(/\s+/).includes(name),
            add: (...names) => {
                this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), ...names])].join(' ');
            },
            remove: (...names) => {
                this.className = this.className.split(/\s+/).filter(name => !names.includes(name)).join(' ');
            },
        };
    }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    removeAttribute(name) { this.attributes.delete(name); }
    querySelector(selector) {
        if (selector === 'i') return this.icon || null;
        return this.label || null;
    }
    get offsetWidth() { return 40; }
    getBoundingClientRect() { return { left: 10, top: 10, width: 40, height: 40 }; }
    animate(keyframes, options) {
        const animation = { keyframes, options, cancel() { this.cancelled = true; } };
        this.animations.push(animation);
        return animation;
    }
    getAnimations() { return this.animations.filter(item => !item.cancelled); }
}

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}

function mount({ saved = null, blockedStorage = false, reduced = false, systemDark = false, viewTransitions = false, throwTransition = false } = {}) {
    const document = new Events();
    const window = new Events();
    const root = new Element();
    const body = new Element();
    const meta = new Element();
    const buttons = [new Element('theme-toggle-btn'), new Element('theme-toggle-btn')];
    for (const button of buttons) {
        button.icon = new Element();
        button.label = new Element();
    }
    const reducedMedia = new Events();
    reducedMedia.matches = reduced;
    const systemMedia = new Events();
    systemMedia.matches = systemDark;
    window.matchMedia = query => query.includes('prefers-reduced-motion') ? reducedMedia : systemMedia;
    window.innerWidth = 1440;
    window.innerHeight = 900;
    document.documentElement = root;
    document.body = body;
    document.querySelectorAll = selector => selector === '.theme-toggle-btn' ? buttons : [];
    document.querySelector = selector => selector.includes('theme-color') ? meta : null;
    const storage = new Map(saved === null ? [] : [[storageKey, saved]]);
    const writes = [];
    const localStorage = {
        getItem(key) {
            if (blockedStorage) throw new Error('Storage unavailable');
            return storage.get(key) ?? null;
        },
        setItem(key, value) {
            writes.push([key, String(value)]);
            if (blockedStorage) throw new Error('Storage unavailable');
            storage.set(key, String(value));
        },
    };
    window.localStorage = localStorage;
    const events = [];
    document.addEventListener('portfolio:themechange', event => events.push(event));
    window.addEventListener('portfolio:themechange', event => events.push(event));
    const transitions = [];
    if (viewTransitions || throwTransition) {
        document.startViewTransition = update => {
            if (throwTransition) throw new Error('View transition unavailable');
            const ready = deferred();
            const finished = deferred();
            const updateDone = deferred();
            const record = {
                ready: ready.promise,
                finished: finished.promise,
                updateCallbackDone: updateDone.promise,
                skipped: 0,
                skipTransition() { this.skipped += 1; },
                async update() {
                    await (typeof update === 'function' ? update() : update.update());
                    updateDone.resolve();
                },
                reveal: () => ready.resolve(),
                finish: () => finished.resolve(),
                rejectReady: () => ready.reject(new Error('Snapshot could not be captured')),
                rejectFinished: () => finished.reject(new Error('Transition interrupted')),
            };
            transitions.push(record);
            return record;
        };
    }
    let now = 0;
    let timerId = 0;
    const timers = new Map();
    const setTimeout = (callback, delay = 0) => {
        const id = ++timerId;
        timers.set(id, { at: now + delay, callback });
        return id;
    };
    const clearTimeout = id => timers.delete(id);
    const advance = milliseconds => {
        const target = now + milliseconds;
        for (;;) {
            const next = [...timers].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
            if (!next) break;
            const [id, timer] = next;
            now = timer.at;
            timers.delete(id);
            timer.callback();
        }
        now = target;
    };
    const styleReads = [];
    const getComputedStyle = element => {
        styleReads.push({
            element,
            theme: root.getAttribute('data-theme'),
            transitioning: root.classList.contains('theme-transitioning'),
            instant: root.classList.contains('theme-instant'),
        });
        return { backgroundColor: root.getAttribute('data-theme') === 'light' ? 'rgb(255, 255, 255)' : 'rgb(10, 10, 10)' };
    };
    window.getComputedStyle = getComputedStyle;
    const context = vm.createContext({
        document, window, localStorage, getComputedStyle, setTimeout, clearTimeout,
        requestAnimationFrame: callback => setTimeout(callback, 16),
        cancelAnimationFrame: clearTimeout,
        CustomEvent: class { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } },
        console,
    });
    vm.runInContext(script, context);
    // Initialize only the theme controller; unrelated DOMContentLoaded features stay unmounted.
    context.initTheme();
    return {
        root, body, meta, buttons, storage, writes, transitions, events, timers, styleReads,
        theme: () => root.getAttribute('data-theme'),
        click: (index = 0) => buttons[index].dispatch('click', { clientX: 30, clientY: 30 }),
        setReduced(value) { reducedMedia.matches = value; reducedMedia.dispatch('change', { matches: value }); },
        setSystemDark(value) { systemMedia.matches = value; systemMedia.dispatch('change', { matches: value }); },
        advance,
    };
}

async function flush() {
    // Drain promise handlers, including catch/finally chains, without real timers.
    for (let index = 0; index < 8; index += 1) await Promise.resolve();
}

function assertMotionCleared(app) {
    assert.equal(app.root.classList.contains('theme-snapshotting'), false);
    assert.equal(app.root.classList.contains('theme-transitioning'), false);
    assert.equal(app.root.classList.contains('theme-instant'), false);
}

test('first visit retains the dark default without persisting an automatic preference', () => {
    const app = mount({ systemDark: false });
    assert.equal(app.theme(), 'dark');
    assert.equal(app.writes.length, 0);
    assertMotionCleared(app);
});

test('saved light theme synchronizes both toggle labels, icons, accessibility text and browser color', () => {
    const app = mount({ saved: 'light' });
    assert.equal(app.theme(), 'light');
    for (const button of app.buttons) {
        assert.equal(button.getAttribute('title'), 'Switch to dark theme');
        assert.equal(button.getAttribute('aria-label'), 'Switch to dark theme');
        assert.equal(button.label.textContent, 'Dark');
        assert.match(button.icon.className, /fa-moon/);
    }
    assert.ok(app.meta.getAttribute('content'));
    assert.ok(app.events.length > 0, 'Background effects receive the initial theme');
});

test('invalid stored preferences fall back to dark and do not prevent later system changes', () => {
    const app = mount({ saved: 'unexpected-value' });
    assert.equal(app.theme(), 'dark');
    app.setSystemDark(false);
    assert.equal(app.theme(), 'light');
    assert.equal(app.writes.length, 0);
});

test('storage failures cannot break toggling or let system changes override an explicit choice', () => {
    const app = mount({ blockedStorage: true });
    assert.equal(app.theme(), 'dark');
    assert.doesNotThrow(() => app.click());
    assert.equal(app.theme(), 'light');
    app.setSystemDark(true);
    assert.equal(app.theme(), 'light');
});

test('fallback captures the old surface before changing theme and removes temporary motion styles', () => {
    const app = mount();
    app.click();
    assert.equal(app.theme(), 'light');
    assert.ok(app.root.classList.contains('theme-transitioning'));
    assert.ok(app.styleReads.some(read => read.element === app.body && read.theme === 'dark' && read.transitioning));
    assert.equal(app.storage.get(storageKey), 'light');
    app.advance(250);
    assert.ok(app.root.classList.contains('theme-transitioning'));
    app.advance(1000);
    assertMotionCleared(app);
    assert.equal(app.timers.size, 0);
});

test('rapid fallback toggles keep motion active until the most recent transition completes', () => {
    const app = mount();
    app.click();
    app.advance(300);
    app.click(1);
    assert.equal(app.theme(), 'dark');
    app.advance(300);
    assert.ok(app.root.classList.contains('theme-transitioning'));
    app.advance(1000);
    assertMotionCleared(app);
    assert.equal(app.storage.get(storageKey), 'dark');
});

test('view transitions use a single snapshot transition and clean up after completion', async () => {
    const app = mount({ viewTransitions: true });
    app.click();
    assert.equal(app.transitions.length, 1);
    assert.ok(app.root.classList.contains('theme-snapshotting'));
    assert.equal(app.root.classList.contains('theme-transitioning'), false);
    assert.equal(app.theme(), 'dark', 'The new theme is applied inside the snapshot update');
    await app.transitions[0].update();
    app.transitions[0].reveal();
    await flush();
    assert.equal(app.theme(), 'light');
    assert.equal(app.storage.get(storageKey), 'light');
    assert.equal(app.root.classList.contains('theme-transitioning'), false);
    app.transitions[0].finish();
    await flush();
    assertMotionCleared(app);
});

test('two clicks before a snapshot update preserve the current fade then reach the final intent', async () => {
    const app = mount({ viewTransitions: true });
    app.click();
    app.click(1);
    assert.equal(app.transitions.length, 1, 'Additional clicks wait for the current crossfade');
    assert.equal(app.transitions[0].skipped, 0, 'An in-progress crossfade is never abruptly skipped');
    assert.equal(app.storage.get(storageKey), 'dark', 'The final user preference is persisted immediately');
    await app.transitions[0].update();
    app.transitions[0].reveal();
    await flush();
    assert.equal(app.theme(), 'light');
    app.transitions[0].finish();
    await flush();
    assert.equal(app.transitions.length, 2);
    await app.transitions[1].update();
    app.transitions[1].reveal();
    app.transitions[1].finish();
    await flush();
    assert.equal(app.theme(), 'dark');
    assertMotionCleared(app);
});

test('a toggle during a visible crossfade queues the next fade without interrupting the current one', async () => {
    const app = mount({ viewTransitions: true });
    app.click();
    await app.transitions[0].update();
    app.transitions[0].reveal();
    await flush();
    app.click();
    assert.equal(app.transitions.length, 1);
    assert.equal(app.transitions[0].skipped, 0);
    assert.equal(app.theme(), 'light');
    app.transitions[0].finish();
    await flush();
    assert.equal(app.transitions.length, 2);
    assert.ok(app.root.classList.contains('theme-snapshotting'));
    await app.transitions[1].update();
    app.transitions[1].reveal();
    app.transitions[1].finish();
    await flush();
    assert.equal(app.theme(), 'dark');
    assertMotionCleared(app);
});

test('three rapid clicks coalesce to the latest intent and need only one fade', async () => {
    const app = mount({ viewTransitions: true });
    app.click();
    app.click(1);
    app.click();
    assert.equal(app.transitions.length, 1);
    assert.equal(app.transitions[0].skipped, 0);
    assert.equal(app.storage.get(storageKey), 'light');
    await app.transitions[0].update();
    app.transitions[0].reveal();
    app.transitions[0].finish();
    await flush();
    assert.equal(app.transitions.length, 1, 'No redundant fade is scheduled when the current target matches the latest intent');
    assert.equal(app.theme(), 'light');
    assertMotionCleared(app);
});

test('a synchronous view-transition failure falls back to smooth CSS colors', () => {
    const app = mount({ throwTransition: true });
    assert.doesNotThrow(() => app.click());
    assert.equal(app.theme(), 'light');
    assert.ok(app.root.classList.contains('theme-transitioning'));
    assert.equal(app.root.classList.contains('theme-snapshotting'), false);
    app.advance(1000);
    assertMotionCleared(app);
});

test('a rejected snapshot promise is handled and cannot leave a frozen transition', async () => {
    const app = mount({ viewTransitions: true });
    app.click();
    await app.transitions[0].update();
    app.transitions[0].rejectReady();
    await flush();
    app.transitions[0].finish();
    await flush();
    app.advance(1000);
    assert.equal(app.theme(), 'light');
    assertMotionCleared(app);
});

test('a failed snapshot cannot overwrite the latest fallback theme when its update arrives late', async () => {
    const app = mount({ viewTransitions: true });
    app.click();
    app.click();
    assert.equal(app.transitions.length, 1);
    app.transitions[0].rejectReady();
    await flush();
    assert.equal(app.theme(), 'dark', 'Fallback applies the latest queued intent');
    await app.transitions[0].update();
    assert.equal(app.theme(), 'dark', 'The late native callback cannot reapply its obsolete light target');
    app.transitions[0].finish();
    await flush();
    app.advance(1000);
    assertMotionCleared(app);
    assert.equal(app.transitions.length, 1);
    assert.equal(app.timers.size, 0);
});

test('a stale snapshot rejection after reduced motion cannot undo the latest requested theme', async () => {
    const app = mount({ viewTransitions: true });
    app.click();
    app.setReduced(true);
    assert.equal(app.theme(), 'light');
    app.click();
    assert.equal(app.theme(), 'dark');
    assert.equal(app.transitions.length, 1);
    app.transitions[0].rejectReady();
    app.transitions[0].finish();
    await flush();
    assert.equal(app.theme(), 'dark');
    assertMotionCleared(app);
});

test('reduced motion changes theme immediately without snapshot, color, or icon animations', () => {
    const app = mount({ viewTransitions: true, reduced: true });
    app.click();
    assert.equal(app.theme(), 'light');
    assert.equal(app.transitions.length, 0);
    assertMotionCleared(app);
    assert.equal(app.timers.size, 0);
    assert.equal(app.root.animations.length, 0);
    assert.ok(app.styleReads.some(read => read.element === app.body && read.theme === 'light' && read.instant),
        'The new colors are committed with all motion disabled before removing the instant class');
    for (const button of app.buttons) {
        assert.equal(button.classList.contains('btn-pulse'), false);
        assert.equal(button.icon.classList.contains('theme-icon-spin'), false);
    }
});

test('enabling reduced motion during snapshot capture settles the pending target immediately', async () => {
    const app = mount({ viewTransitions: true });
    app.click();
    app.setReduced(true);
    assert.equal(app.theme(), 'light');
    assert.ok(app.transitions[0].skipped > 0);
    assertMotionCleared(app);
    assert.ok(app.styleReads.some(read => read.theme === 'light' && read.instant));
    app.click();
    await app.transitions[0].update();
    app.transitions[0].reveal();
    app.transitions[0].finish();
    await flush();
    assert.equal(app.theme(), 'dark', 'A cancelled snapshot cannot undo a later reduced-motion toggle');
    assertMotionCleared(app);
});

test('enabling reduced motion during the fallback clears its timer and motion styles', () => {
    const app = mount();
    app.click();
    app.setReduced(true);
    assert.equal(app.theme(), 'light');
    assertMotionCleared(app);
    assert.equal(app.timers.size, 0);
    assert.ok(app.styleReads.some(read => read.theme === 'light' && read.instant));
});

test('system changes animate without persisting an explicit preference', async () => {
    const app = mount({ viewTransitions: true });
    app.setSystemDark(false);
    assert.equal(app.transitions.length, 1);
    await app.transitions[0].update();
    app.transitions[0].reveal();
    app.transitions[0].finish();
    await flush();
    assert.equal(app.theme(), 'light');
    assert.equal(app.writes.length, 0);
    app.setSystemDark(true);
    await app.transitions[1].update();
    app.transitions[1].reveal();
    app.transitions[1].finish();
    await flush();
    assert.equal(app.theme(), 'dark');
    assert.equal(app.writes.length, 0);
});

test('a saved explicit preference is preserved when the system theme changes', () => {
    const app = mount({ saved: 'light', viewTransitions: true });
    app.setSystemDark(true);
    assert.equal(app.theme(), 'light');
    assert.equal(app.transitions.length, 0);
});
