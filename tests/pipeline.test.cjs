const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'js/pipeline.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

class Events {
    constructor() { this.listeners = new Map(); }
    addEventListener(type, listener) {
        if (!this.listeners.has(type)) this.listeners.set(type, []);
        this.listeners.get(type).push(listener);
    }
    removeEventListener(type, listener) {
        this.listeners.set(type, (this.listeners.get(type) || []).filter(item => item !== listener));
    }
    dispatch(type, detail = {}) {
        for (const listener of this.listeners.get(type) || []) listener({ type, target: this, ...detail });
    }
}

class Element extends Events {
    constructor(tagName = 'div', className = '') {
        super();
        this.tagName = tagName;
        this.children = [];
        this.attributes = new Map();
        this.dataset = {};
        this.textContent = '';
        this.hidden = false;
        this.animations = [];
        this.className = className;
        this.style = {
            setProperty(name, value) { this[name] = String(value); },
            getPropertyValue(name) { return this[name] || ''; },
            removeProperty(name) { delete this[name]; },
        };
        this.classList = {
            contains: name => this.className.split(/\s+/).includes(name),
            add: (...names) => names.forEach(name => this.classList.toggle(name, true)),
            remove: (...names) => names.forEach(name => this.classList.toggle(name, false)),
            toggle: (name, force) => {
                const values = new Set(this.className.split(/\s+/).filter(Boolean));
                const add = force === undefined ? !values.has(name) : force;
                if (add) values.add(name); else values.delete(name);
                this.className = [...values].join(' ');
                return add;
            },
        };
        this.rect = { x: 0, y: 0, top: 0, left: 0, right: 900, bottom: 600, width: 900, height: 600 };
    }
    setAttribute(name, value) {
        value = String(value);
        this.attributes.set(name, value);
        if (name === 'class') this.className = value;
        if (name.startsWith('data-')) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
    }
    getAttribute(name) { return name === 'class' ? this.className : this.attributes.get(name) ?? null; }
    removeAttribute(name) { this.attributes.delete(name); }
    append(...nodes) { nodes.forEach(node => this.appendChild(node)); }
    appendChild(node) { node.parentElement = this; this.children.push(node); return node; }
    prepend(...nodes) { nodes.forEach(node => { node.parentElement = this; }); this.children.unshift(...nodes); }
    insertBefore(node, before) {
        node.parentElement = this;
        const index = this.children.indexOf(before);
        this.children.splice(index < 0 ? this.children.length : index, 0, node);
        return node;
    }
    replaceChildren(...nodes) { this.children = []; this.append(...nodes); }
    matches(selector) {
        if (selector.startsWith('.')) return selector.slice(1).split('.').every(name => this.classList.contains(name));
        if (selector.startsWith('[')) {
            const [, name, value] = selector.match(/^\[([^=\]]+)(?:=["']?([^"'\]]+)["']?)?\]$/) || [];
            return this.attributes.has(name) && (value === undefined || this.getAttribute(name) === value);
        }
        return this.tagName.toLowerCase() === selector.toLowerCase();
    }
    querySelectorAll(selector) {
        const selectors = selector.split(',').map(item => item.trim());
        return this.children.flatMap(child => [
            ...(selectors.some(item => child.matches(item)) ? [child] : []),
            ...child.querySelectorAll(selector),
        ]);
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    closest(selector) { return this.matches(selector) ? this : this.parentElement?.closest(selector) || null; }
    getBoundingClientRect() { return { ...this.rect }; }
    getTotalLength() { return 300; }
    getPointAtLength(distance) { return { x: distance, y: distance / 2 }; }
    get offsetWidth() { return this.rect.width; }
    get clientWidth() { return this.rect.width; }
    get clientHeight() { return this.rect.height; }
    animate() {
        const animation = {
            playState: 'running',
            cancel() { this.playState = 'idle'; },
            pause() { this.playState = 'paused'; },
            play() { this.playState = 'running'; },
        };
        this.animations.push(animation);
        return animation;
    }
    getAnimations() { return this.animations.filter(animation => animation.playState !== 'idle'); }
}

function mount({ reduced = false, columns = 3, intersection = true } = {}) {
    const document = new Element('document');
    document.readyState = 'complete';
    document.hidden = false;
    document.createElementNS = (_, tag) => new Element(tag);
    document.createElement = tag => new Element(tag);
    const window = new Events();
    const media = new Events();
    media.matches = reduced;
    window.matchMedia = () => media;
    window.innerHeight = 900;
    const add = (parent, tag, classes = '', attribute) => {
        const element = new Element(tag, classes);
        if (attribute) element.setAttribute(attribute, '');
        parent.append(element);
        return element;
    };
    const panel = add(document, 'section', 'tab-panel active');
    const pipeline = add(panel, 'section', 'project-pipeline', 'data-project-pipeline');
    const controls = add(pipeline, 'div', 'pipeline-controls');
    controls.hidden = true;
    const status = add(controls, 'span', '', 'data-pipeline-status');
    const play = add(controls, 'button', 'pipeline-play', 'data-pipeline-play');
    add(play, 'i');
    add(play, 'span');
    const canvas = add(pipeline, 'div', 'pipeline-canvas');
    const flow = add(canvas, 'div', 'pipeline-flow');
    const list = add(flow, 'ol', 'pipeline-steps');
    const decode = value => value.replace(/&amp;/g, '&');
    const stepMarkup = [...html.matchAll(/<li class="pipeline-step" data-output="([^"]+)">([\s\S]*?)<\/li>/g)];
    assert.equal(stepMarkup.length, 9, 'The fixture uses all nine stages from index.html');
    const steps = stepMarkup.map(([, output, markup]) => {
        const step = add(list, 'li', 'pipeline-step');
        step.dataset.output = decode(output);
        const button = add(step, 'button', 'pipeline-node');
        for (const name of ['title', 'description']) {
            const element = add(button, 'span', `pipeline-node-${name}`);
            element.textContent = decode(markup.match(new RegExp(`class="pipeline-node-${name}">([^<]+)`))[1]);
        }
        add(button, 'span', 'pipeline-node-progress');
        return step;
    });
    const feedback = add(flow, 'div', 'pipeline-feedback');
    const detail = add(canvas, 'div', 'pipeline-detail');
    detail.hidden = true;
    const detailMain = add(detail, 'div', 'pipeline-detail-main');
    for (const name of ['position', 'title', 'description']) add(detailMain, 'span', '', `data-pipeline-${name}`);
    const output = add(detail, 'div', 'pipeline-detail-output');
    add(output, 'p', '', 'data-pipeline-output');
    const announcement = add(canvas, 'span', '', 'data-pipeline-announcement');

    const observers = {};
    const observerClass = name => class {
        constructor(callback) { this.callback = callback; (observers[name] ||= []).push(this); }
        observe(target) { this.target = target; }
        disconnect() {}
    };
    const observerTypes = {
        ResizeObserver: observerClass('resize'),
        MutationObserver: observerClass('mutation'),
        IntersectionObserver: observerClass('intersection'),
    };
    Object.assign(window, observerTypes);
    if (!intersection) delete window.IntersectionObserver;
    let now = 0;
    let nextId = 0;
    const frames = new Map();
    const requestAnimationFrame = callback => { frames.set(++nextId, callback); return nextId; };
    const cancelAnimationFrame = id => frames.delete(id);
    Object.assign(window, { requestAnimationFrame, cancelAnimationFrame });
    const resize = (count = columns) => {
        const width = count === 1 ? 340 : 1000;
        const nodeWidth = (width - (count - 1) * 32) / count;
        steps.forEach((step, index) => {
            const row = Math.floor(index / count);
            const column = row % 2 === 1 ? count - 1 - index % count : index % count;
            const left = column * (nodeWidth + 32);
            const top = Math.floor(index / count) * 190;
            const rect = { x: left, y: top, left, top, width: nodeWidth, height: 150, right: left + nodeWidth, bottom: top + 150 };
            step.rect = rect;
            step.querySelector('.pipeline-node').rect = rect;
        });
        const height = Math.ceil(steps.length / count) * 190 + 60;
        flow.rect = { x: 0, y: 0, top: 0, left: 0, right: width, bottom: height, width, height };
        canvas.rect = { ...flow.rect, right: width + 24, width: width + 24 };
        feedback.rect = { x: 0, y: height - 40, left: 0, top: height - 40, right: width - 64, bottom: height, width: width - 64, height: 40 };
        for (const observer of observers.resize || []) observer.callback([{ target: flow, contentRect: flow.rect }]);
        window.dispatch('resize');
    };
    resize();
    const context = {
        window, document, ...observerTypes, requestAnimationFrame, cancelAnimationFrame,
        performance: { now: () => now }, console,
        getComputedStyle: element => ({ getPropertyValue: name => element.style.getPropertyValue(name), direction: 'ltr' }),
    };
    vm.runInNewContext(script, context, { filename: 'pipeline.js' });
    const tick = timestamp => {
        now = timestamp;
        const callbacks = [...frames.values()];
        frames.clear();
        callbacks.forEach(callback => callback(now));
    };
    const advance = duration => {
        const end = now + duration;
        while (now + 16 < end) tick(now + 16);
        tick(end);
    };
    const view = visible => {
        for (const observer of observers.intersection || []) observer.callback([{ isIntersecting: visible, intersectionRatio: visible ? 1 : 0 }]);
    };
    view(true);
    tick(0);
    return {
        pipeline, steps, play, status, detail, flow, announcement, document, window, media,
        advance, resize, view,
        tick: () => tick(now),
        pending: () => frames.size,
        selected: () => steps.findIndex(step => step.classList.contains('is-active')),
        select: index => steps[index].querySelector('.pipeline-node').dispatch('click'),
        panelVisible: visible => {
            panel.classList.toggle('active', visible);
            for (const observer of observers.mutation || []) observer.callback([]);
        },
    };
}

test('initial stage is visible, accessible, and begins a single animation clock', () => {
    const app = mount();
    assert.equal(app.selected(), 0);
    assert.equal(app.detail.hidden, false);
    assert.equal(app.pipeline.dataset.running, 'true');
    assert.equal(app.status.textContent, 'Live animation');
    assert.match(app.play.getAttribute('aria-label'), /^Pause /);
    assert.equal(app.steps[0].querySelector('.pipeline-node').getAttribute('aria-current'), 'step');
    assert.equal(app.steps.filter(step => step.querySelector('.pipeline-node').getAttribute('aria-pressed') === 'true').length, 1);
    assert.equal(app.announcement.textContent, '');
    assert.equal(app.pending(), 1);
});

test('a stage remains selected during its dwell and connector travel', () => {
    const app = mount();
    app.advance(4199);
    assert.equal(app.selected(), 0);
    app.advance(2);
    assert.equal(app.selected(), 0);
    app.advance(700);
    assert.equal(app.selected(), 1);
    assert.equal(app.announcement.textContent, '', 'Automatic playback must remain silent to screen readers');
    assert.equal(app.pending(), 1);
});

test('selecting a stage keeps live playback running and updates accessible details', () => {
    const app = mount();
    app.advance(2000);
    app.select(5);
    assert.equal(app.selected(), 5);
    assert.equal(app.pipeline.dataset.running, 'true');
    assert.equal(app.status.textContent, 'Live animation');
    assert.equal(app.pending(), 1);
    assert.equal(app.steps[0].querySelector('.pipeline-node').getAttribute('aria-current'), null);
    assert.equal(app.steps[5].querySelector('.pipeline-node').getAttribute('aria-current'), 'step');
    assert.equal(app.steps.filter(step => step.querySelector('.pipeline-node').getAttribute('aria-pressed') === 'true').length, 1);
    assert.equal(app.pipeline.querySelector('[data-pipeline-title]').textContent, 'Build the project');
    assert.match(app.announcement.textContent, /Step 6: Build the project/);
    app.advance(4199);
    assert.equal(app.selected(), 5, 'A selection starts its own full dwell');
    app.advance(700);
    assert.equal(app.selected(), 6, 'Playback continues from the chosen stage without pressing play');
    assert.equal(app.pipeline.dataset.running, 'true');
});

test('selecting a stage while paused preserves the user’s playback choice', () => {
    const app = mount();
    app.play.dispatch('click');
    app.select(5);
    assert.equal(app.selected(), 5);
    assert.equal(app.pipeline.dataset.running, 'false');
    assert.equal(app.status.textContent, 'Animation paused');
    assert.match(app.play.getAttribute('aria-label'), /^Play /);
    assert.equal(app.pending(), 0);
    assert.equal(app.pipeline.querySelector('[data-pipeline-title]').textContent, 'Build the project');
    assert.match(app.announcement.textContent, /Step 6: Build the project/);
    app.advance(15000);
    assert.equal(app.selected(), 5);
    app.play.dispatch('click');
    app.advance(4900);
    assert.equal(app.selected(), 6);
});

test('pause and resume preserve elapsed dwell instead of restarting it', () => {
    const app = mount();
    app.advance(2000);
    app.play.dispatch('click');
    assert.equal(app.pending(), 0);
    app.advance(12000);
    assert.equal(app.selected(), 0);
    app.play.dispatch('click');
    app.advance(2900);
    assert.equal(app.selected(), 1);
    assert.equal(app.pending(), 1);
});

test('pausing during connector travel retains the transition until playback resumes', () => {
    const app = mount();
    app.advance(4500);
    assert.equal(app.selected(), 0);
    app.play.dispatch('click');
    assert.equal(app.pending(), 0);
    app.advance(12000);
    assert.equal(app.selected(), 0);
    app.play.dispatch('click');
    app.advance(400);
    assert.equal(app.selected(), 1);
});

test('feedback completes a longer journey from maintenance back to planning', () => {
    const app = mount();
    app.select(8);
    app.advance(4900);
    assert.equal(app.selected(), 8, 'Feedback takes longer than an ordinary connector');
    app.advance(600);
    assert.equal(app.selected(), 2);
    assert.match(app.pipeline.querySelector('[data-pipeline-title]').textContent, /^Plan features/);
});

for (const reason of ['viewport', 'profile tab', 'document', 'page lifecycle']) {
    test(`leaving the ${reason} suspends the clock and resumes remaining time`, () => {
        const app = mount();
        const visible = value => {
            if (reason === 'viewport') app.view(value);
            if (reason === 'profile tab') app.panelVisible(value);
            if (reason === 'document') { app.document.hidden = !value; app.document.dispatch('visibilitychange'); }
            if (reason === 'page lifecycle') app.window.dispatch(value ? 'pageshow' : 'pagehide');
        };
        app.advance(2000);
        visible(false);
        assert.equal(app.pipeline.dataset.running, 'false');
        assert.equal(app.status.textContent, 'Animation on standby');
        assert.equal(app.pending(), 0);
        app.advance(30000);
        assert.equal(app.selected(), 0);
        visible(true);
        visible(true);
        app.tick(); // A separate one-shot layout measurement may accompany the animation clock.
        assert.equal(app.pending(), 1, 'Repeated visibility events must not duplicate the clock');
        app.advance(2900);
        assert.equal(app.selected(), 1);
    });
}

test('reduced motion starts paused and explicit playback skips connector travel', () => {
    const app = mount({ reduced: true });
    assert.equal(app.pipeline.dataset.running, 'false');
    assert.equal(app.pending(), 0);
    app.advance(10000);
    assert.equal(app.selected(), 0);
    app.play.dispatch('click');
    app.advance(4300);
    assert.equal(app.selected(), 1);
    app.media.matches = true;
    app.media.dispatch('change');
    assert.equal(app.pipeline.dataset.running, 'false');
    assert.equal(app.pending(), 0);
});

test('changing to reduced motion during travel settles the arrival and stops motion', () => {
    const app = mount();
    app.advance(4500);
    assert.equal(app.pipeline.dataset.phase, 'travel');
    app.media.matches = true;
    app.media.dispatch('change');
    assert.equal(app.selected(), 1);
    assert.equal(app.pipeline.dataset.running, 'false');
    assert.equal(app.pipeline.dataset.phase, 'dwell');
    assert.equal(app.pending(), 0);
    assert.equal(app.flow.querySelector('.pipeline-packet').style.display, 'none');
});

test('detail transitions pause with playback and when a manual selection leaves view', () => {
    const app = mount();
    const transitions = () => app.detail.querySelectorAll('.pipeline-detail-main, .pipeline-detail-output')
        .flatMap(element => element.getAnimations());
    app.advance(4900);
    assert.equal(transitions().length, 2);
    assert.ok(transitions().every(animation => animation.playState === 'running'));
    app.play.dispatch('click');
    assert.ok(transitions().every(animation => animation.playState === 'paused'));
    app.select(4);
    assert.equal(transitions().length, 2, 'A new selection cancels its previous transitions');
    assert.ok(transitions().every(animation => animation.playState === 'running'));
    app.view(false);
    assert.ok(transitions().every(animation => animation.playState === 'paused'));
    app.view(true);
    assert.ok(transitions().every(animation => animation.playState === 'running'));
    app.media.matches = true;
    app.media.dispatch('change');
    assert.equal(transitions().length, 0);
});

test('connectors are recalculated for a mobile column without duplicating playback', () => {
    const app = mount();
    const paths = () => app.flow.querySelectorAll('.pipeline-track').map(element => element.getAttribute('d')).filter(Boolean);
    const desktopPaths = paths();
    assert.ok(desktopPaths.length >= 9);
    assert.ok(desktopPaths[0].startsWith(`M ${app.steps[0].rect.right} `), 'The first row travels right');
    assert.ok(desktopPaths[3].startsWith(`M ${app.steps[3].rect.left} `), 'The second row travels left');
    app.resize(1);
    app.advance(20);
    const mobilePaths = paths();
    assert.equal(mobilePaths.length, desktopPaths.length);
    assert.notDeepEqual(mobilePaths, desktopPaths);
    assert.ok(mobilePaths.every(value => !/NaN|undefined|Infinity/.test(value)));
    assert.equal(app.pending(), 1);
});
