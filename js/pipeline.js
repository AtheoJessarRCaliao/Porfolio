/** An illustrative workflow with one clock for progress and connection travel. */
(() => {
    'use strict';
    let pipelineCount = 0;

    function initializePipeline(pipeline) {
        const steps = Array.from(pipeline.querySelectorAll('.pipeline-step'));
        const flow = pipeline.querySelector('.pipeline-flow');
        const playButton = pipeline.querySelector('[data-pipeline-play]');
        const status = pipeline.querySelector('[data-pipeline-status]');
        const detail = pipeline.querySelector('.pipeline-detail');
        const announcement = pipeline.querySelector('[data-pipeline-announcement]');
        if (steps.length < 3 || !flow || !playButton || !detail || !status) return;

        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        const panel = pipeline.closest('.tab-panel');
        const nodes = steps.map(step => step.querySelector('.pipeline-node'));
        const bars = steps.map(step => step.querySelector('.pipeline-node-progress'));
        const visited = new Set();
        const dwellDuration = 4200, travelDuration = 650, feedbackDuration = 1250;
        let selected = 0, destination = null, phase = 'dwell', elapsed = 0;
        let frame = null, geometryFrame = null, previousTime = null;
        let wantsPlayback = !reducedMotion.matches, inView = false, pageAvailable = true;
        let effectsFromSelection = false;
        const effects = new Set();

        pipeline.querySelector('.pipeline-controls').hidden = false;
        detail.hidden = false;
        pipeline.dataset.enhanced = 'true';
        steps.forEach((step, index) => step.style.setProperty('--pipeline-order', index));

        function svgElement(name, attributes = {}) {
            const element = document.createElementNS('http://www.w3.org/2000/svg', name);
            Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
            return element;
        }
        const svg = svgElement('svg', { class: 'pipeline-connections', 'aria-hidden': 'true', focusable: 'false' });
        const arrowId = 'pipeline-arrow-' + (++pipelineCount);
        const definitions = svgElement('defs');
        const arrow = svgElement('marker', {
            id: arrowId, viewBox: '0 0 8 8', refX: '6', refY: '4',
            markerWidth: '6', markerHeight: '6', markerUnits: 'userSpaceOnUse', orient: 'auto'
        });
        arrow.appendChild(svgElement('path', { class: 'pipeline-arrow', d: 'M 1 1 L 6 4 L 1 7', fill: 'none' }));
        definitions.appendChild(arrow);
        svg.appendChild(definitions);
        const routes = steps.map((_, index) => {
            const route = svgElement('path', {
                class: 'pipeline-track' + (index === steps.length - 1 ? ' pipeline-track-feedback' : ''),
                fill: 'none', 'marker-end': 'url(#' + arrowId + ')'
            });
            svg.appendChild(route);
            return route;
        });
        // Quiet moving traces keep the diagram alive during each stage's reading time.
        const streams = steps.map((_, index) => {
            const stream = svgElement('path', { class: 'pipeline-stream', fill: 'none' });
            stream.style.setProperty('--pipeline-stream-delay', (-index * 0.21) + 's');
            svg.appendChild(stream);
            return stream;
        });
        const trail = svgElement('path', { class: 'pipeline-trail', fill: 'none', pathLength: '100' });
        const packet = svgElement('g', { class: 'pipeline-packet' });
        packet.appendChild(svgElement('circle', { class: 'pipeline-packet-halo', r: '8' }));
        packet.appendChild(svgElement('circle', { class: 'pipeline-packet-core', r: '2.5' }));
        svg.appendChild(trail);
        svg.appendChild(packet);
        flow.prepend(svg);

        function hideSignal() {
            packet.style.display = 'none';
            trail.style.display = 'none';
        }
        function drawSignal() {
            if (phase !== 'travel' || reducedMotion.matches || pipeline.dataset.connected !== 'true') {
                hideSignal();
                return;
            }
            const route = routes[selected];
            const duration = selected === steps.length - 1 ? feedbackDuration : travelDuration;
            const fraction = Math.min(1, elapsed / duration);
            // Gentle acceleration/deceleration; the point and tail share one position.
            const eased = fraction * fraction * (3 - 2 * fraction);
            const length = route.getTotalLength();
            if (!length) return hideSignal();
            const point = route.getPointAtLength(length * eased);
            const tail = Math.min(12, 100 * eased);
            trail.setAttribute('d', route.getAttribute('d'));
            trail.setAttribute('stroke-dasharray', tail + ' 112');
            trail.setAttribute('stroke-dashoffset', String(-(100 * eased - tail)));
            packet.setAttribute('transform', 'translate(' + point.x + ' ' + point.y + ')');
            packet.style.display = '';
            trail.style.display = '';
        }
        function measureConnections() {
            geometryFrame = null;
            const bounds = flow.getBoundingClientRect();
            if (!bounds.width || !bounds.height) return;
            svg.setAttribute('viewBox', '0 0 ' + bounds.width + ' ' + bounds.height);
            svg.setAttribute('width', bounds.width);
            svg.setAttribute('height', bounds.height);
            // Wrappers stay stable while their inner card content animates.
            const boxes = steps.map(step => {
                const box = step.getBoundingClientRect();
                return {
                    left: box.left - bounds.left, right: box.right - bounds.left,
                    top: box.top - bounds.top, bottom: box.bottom - bounds.top,
                    x: box.left - bounds.left + box.width / 2,
                    y: box.top - bounds.top + box.height / 2
                };
            });
            boxes.forEach((from, index) => {
                const to = boxes[index === boxes.length - 1 ? 2 : index + 1];
                let path;
                if (index === boxes.length - 1) {
                    // Feedback goes around the outside, including the stacked mobile layout.
                    const canvas = pipeline.querySelector('.pipeline-canvas').getBoundingClientRect();
                    const gutter = Math.min(12, Math.max(6, (canvas.right - bounds.right) / 2));
                    const rail = bounds.width + gutter;
                    const radius = Math.min(6, gutter / 2);
                    path = 'M ' + from.right + ' ' + from.y + ' H ' + (rail - radius) +
                        ' Q ' + rail + ' ' + from.y + ' ' + rail + ' ' + (from.y - radius) +
                        ' V ' + (to.y + radius) + ' Q ' + rail + ' ' + to.y + ' ' +
                        (rail - radius) + ' ' + to.y + ' H ' + to.right;
                } else if (Math.abs(from.y - to.y) < 4) {
                    const rightward = to.x > from.x;
                    const start = rightward ? from.right : from.left;
                    const end = rightward ? to.left : to.right;
                    const middle = (start + end) / 2;
                    path = 'M ' + start + ' ' + from.y + ' C ' + middle + ' ' + from.y +
                        ' ' + middle + ' ' + to.y + ' ' + end + ' ' + to.y;
                } else {
                    const middle = (from.bottom + to.top) / 2;
                    path = 'M ' + from.x + ' ' + from.bottom + ' C ' + from.x + ' ' + middle +
                        ' ' + to.x + ' ' + middle + ' ' + to.x + ' ' + to.top;
                }
                routes[index].setAttribute('d', path);
                streams[index].setAttribute('d', path);
            });
            pipeline.dataset.connected = 'true';
            drawSignal();
        }
        function queueMeasurement() {
            if (geometryFrame === null && pageAvailable) geometryFrame = requestAnimationFrame(measureConnections);
        }
        function clearEffects() {
            effects.forEach(effect => effect.cancel());
            effects.clear();
        }
        function animateDetails(manual) {
            clearEffects();
            effectsFromSelection = manual;
            if (reducedMotion.matches || !inView) return;
            detail.querySelectorAll('.pipeline-detail-main, .pipeline-detail-output').forEach((section, index) => {
                if (!section.animate) return;
                const effect = section.animate([
                    { opacity: 0, transform: 'translateY(7px)' },
                    { opacity: 1, transform: 'translateY(0)' }
                ], { duration: 400, delay: index * 55, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' });
                effects.add(effect);
                effect.onfinish = () => effects.delete(effect);
            });
        }
        function selectStep(index, manual = false, animate = true) {
            const previous = selected;
            selected = index;
            destination = null;
            phase = 'dwell';
            elapsed = 0;
            pipeline.dataset.phase = phase;
            pipeline.dataset.feedback = String(previous === steps.length - 1 && selected === 2);
            hideSignal();
            steps.forEach((step, stepIndex) => {
                const active = stepIndex === selected;
                step.classList.toggle('is-active', active);
                step.classList.toggle('is-visited', visited.has(stepIndex));
                step.classList.remove('is-arriving', 'is-receiving');
                routes[stepIndex].classList.toggle('is-visited', visited.has(stepIndex));
                streams[stepIndex].classList.toggle('is-active', active);
                nodes[stepIndex].setAttribute('aria-pressed', String(active));
                if (active) nodes[stepIndex].setAttribute('aria-current', 'step');
                else nodes[stepIndex].removeAttribute('aria-current');
                bars[stepIndex].style.setProperty('--pipeline-progress', visited.has(stepIndex) && !active ? 1 : 0);
            });
            if (animate && !manual && !reducedMotion.matches) steps[selected].classList.add('is-receiving');
            const title = steps[selected].querySelector('.pipeline-node-title').textContent.trim();
            pipeline.querySelector('[data-pipeline-position]').textContent =
                'EXPLORING STEP ' + String(selected + 1).padStart(2, '0') + ' / ' + String(steps.length).padStart(2, '0');
            pipeline.querySelector('[data-pipeline-title]').textContent = title;
            pipeline.querySelector('[data-pipeline-description]').textContent = steps[selected].querySelector('.pipeline-node-description').textContent.trim();
            pipeline.querySelector('[data-pipeline-output]').textContent = steps[selected].dataset.output;
            if (animate) animateDetails(manual);
            // Autoplay stays silent to screen readers; deliberate selections are announced.
            if (manual && announcement) announcement.textContent = 'Step ' + (selected + 1) + ': ' + title + '. ' + steps[selected].dataset.output;
        }
        function finishTravel() {
            const next = destination;
            visited.add(selected);
            // A new iteration starts at planning, retaining only the discovery pass.
            if (selected === steps.length - 1) {
                for (let index = 2; index < steps.length; index++) visited.delete(index);
            }
            selectStep(next);
        }
        function tick(now) {
            frame = null;
            if (previousTime === null) previousTime = now;
            elapsed += Math.max(0, now - previousTime);
            previousTime = now;
            if (phase === 'dwell') {
                bars[selected].style.setProperty('--pipeline-progress', Math.min(1, elapsed / dwellDuration));
                if (elapsed >= 600) steps[selected].classList.remove('is-receiving');
                if (elapsed >= dwellDuration) {
                    destination = selected === steps.length - 1 ? 2 : selected + 1;
                    phase = 'travel';
                    elapsed = 0;
                    pipeline.dataset.phase = phase;
                    pipeline.dataset.feedback = String(selected === steps.length - 1);
                    steps[destination].classList.add('is-arriving');
                    if (reducedMotion.matches) finishTravel();
                }
            } else if (elapsed >= (selected === steps.length - 1 ? feedbackDuration : travelDuration)) {
                finishTravel();
            }
            drawSignal();
            if (pipeline.dataset.running === 'true') frame = requestAnimationFrame(tick);
        }
        function synchronizePlayback() {
            const visible = inView && (!panel || panel.classList.contains('active')) && !document.hidden && pageAvailable;
            const running = wantsPlayback && visible;
            pipeline.dataset.visible = String(visible);
            pipeline.dataset.running = String(running);
            status.textContent = running ? 'Live animation' : wantsPlayback ? 'Animation on standby' : 'Animation paused';
            playButton.querySelector('span').textContent = wantsPlayback ? 'Pause animation' : 'Play animation';
            playButton.querySelector('i').className = wantsPlayback ? 'fas fa-pause' : 'fas fa-play';
            playButton.setAttribute('aria-label', wantsPlayback ? 'Pause development workflow animation' : 'Play development workflow animation');
            effects.forEach(effect => {
                if (visible && (wantsPlayback || effectsFromSelection)) effect.play();
                else effect.pause();
            });
            if (!running) {
                if (frame !== null) cancelAnimationFrame(frame);
                frame = null;
                previousTime = null;
            } else if (frame === null) {
                previousTime = null;
                frame = requestAnimationFrame(tick);
            }
        }

        nodes.forEach((node, index) => node.addEventListener('click', () => {
            visited.clear();
            selectStep(index, true);
            synchronizePlayback();
        }));
        playButton.addEventListener('click', () => {
            wantsPlayback = !wantsPlayback;
            effectsFromSelection = false;
            synchronizePlayback();
        });
        document.addEventListener('visibilitychange', synchronizePlayback);
        window.addEventListener('pagehide', () => {
            pageAvailable = false;
            if (geometryFrame !== null) cancelAnimationFrame(geometryFrame);
            geometryFrame = null;
            synchronizePlayback();
        });
        window.addEventListener('pageshow', () => {
            pageAvailable = true;
            queueMeasurement();
            synchronizePlayback();
        });
        reducedMotion.addEventListener('change', () => {
            if (reducedMotion.matches) {
                wantsPlayback = false;
                clearEffects();
                if (destination !== null) finishTravel();
                steps.forEach(step => step.classList.remove('is-receiving'));
                hideSignal();
            }
            synchronizePlayback();
        });

        function setInView(visible) {
            inView = visible;
            if (inView) {
                pipeline.dataset.revealed = 'true';
                queueMeasurement();
            }
            synchronizePlayback();
        }
        if ('IntersectionObserver' in window) {
            new IntersectionObserver(entries => setInView(entries[0].isIntersecting), { threshold: 0 }).observe(flow);
        } else {
            const updateVisibility = () => {
                const bounds = flow.getBoundingClientRect();
                setInView(bounds.bottom > 0 && bounds.top < window.innerHeight);
            };
            document.addEventListener('scroll', updateVisibility, { passive: true, capture: true });
            window.addEventListener('resize', updateVisibility, { passive: true });
            updateVisibility();
        }
        if ('ResizeObserver' in window) new ResizeObserver(queueMeasurement).observe(flow);
        window.addEventListener('resize', queueMeasurement, { passive: true });
        if (panel) new MutationObserver(() => {
            if (panel.classList.contains('active')) queueMeasurement();
            synchronizePlayback();
        }).observe(panel, { attributes: true, attributeFilter: ['class'] });

        selectStep(0, false, false);
        queueMeasurement();
        synchronizePlayback();
    }

    function initializePipelines() {
        document.querySelectorAll('[data-project-pipeline]').forEach(initializePipeline);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializePipelines);
    else initializePipelines();
})();
