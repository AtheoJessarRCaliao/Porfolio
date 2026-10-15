/** A local portfolio guide with curated answers, not a remote chat service. */
(() => {
    'use strict';

    function initializeGuide() {
        const widget = document.getElementById('aiAssistant');
        const launcher = document.getElementById('aiAssistantToggle');
        const panel = document.getElementById('aiAssistantPanel');
        if (!widget || !launcher || !panel) return;

        const closeButton = panel.querySelector('[data-ai-close]');
        const answer = panel.querySelector('.ai-answer');
        const answerTitle = panel.querySelector('[data-ai-answer-title]');
        const answerText = panel.querySelector('[data-ai-answer-text]');
        const answerLink = panel.querySelector('[data-ai-answer-link]');
        const announcement = panel.querySelector('[data-ai-announcement]');
        const suggestions = Array.from(panel.querySelectorAll('[data-ai-question]'));
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        const topics = {
            services: {
                title: 'From an idea to a working product',
                text: 'Explore web applications, mobile apps, networking, e-commerce, SaaS, capstone project systems, UI and UX design, and data analytics. Each service includes specific areas and the tools I use.',
                href: '#about', label: 'Explore my services', target: '.services-section'
            },
            projects: {
                title: 'Explore my work',
                text: 'Featured projects include Smart Health Integration, the LGU Impasug-ong Tourism Portal, a real-time intramurals tally system, and Acadex, an offline study companion.',
                href: '#projects', label: 'View the projects'
            },
            process: {
                title: 'A clear process, with room to improve',
                text: 'I start with the problem and the people using the product, then plan, choose the technology, design, build, test, and deploy. Maintenance and feedback inform the next iteration.',
                href: '#about', label: 'See the live pipeline', target: '.project-pipeline'
            },
            contact: {
                title: 'Let’s talk about your project',
                text: 'Share what you want to build, who it will help, and your priorities. The Contact page has my direct contact details and a place to introduce your project.',
                href: '#contact', label: 'Get in touch'
            }
        };
        let isOpen = false;
        let currentTopic = null;

        function setOpen(open, restoreFocus = false) {
            isOpen = open;
            panel.hidden = !open;
            launcher.setAttribute('aria-expanded', String(open));
            launcher.setAttribute('aria-label', open ? 'Close portfolio guide' : 'Open AI portfolio guide');
            if (open) suggestions[0].focus({ preventScroll: true });
            else if (restoreFocus && !widget.hidden) launcher.focus({ preventScroll: true });
        }

        launcher.addEventListener('click', () => setOpen(!isOpen));
        closeButton.addEventListener('click', () => setOpen(false, true));
        suggestions.forEach(button => button.addEventListener('click', () => {
            currentTopic = topics[button.dataset.aiQuestion];
            if (!currentTopic) return;
            suggestions.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
            answerTitle.textContent = currentTopic.title;
            answerText.textContent = currentTopic.text;
            answerLink.href = currentTopic.href;
            answerLink.querySelector('span').textContent = currentTopic.label;
            answer.hidden = false;
            announcement.textContent = currentTopic.title + '. ' + currentTopic.text;
            answer.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'nearest' });
        }));

        answerLink.addEventListener('click', () => {
            const target = currentTopic?.target;
            setOpen(false);
            // The existing navigation handles #about/#projects/#contact before this frame.
            requestAnimationFrame(() => {
                const destination = document.querySelector(target || answerLink.getAttribute('href'));
                if (!destination) return;
                const originalTabIndex = destination.getAttribute('tabindex');
                destination.setAttribute('tabindex', '-1');
                destination.focus({ preventScroll: true });
                if (target) destination.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
                destination.addEventListener('blur', () => {
                    if (originalTabIndex === null) destination.removeAttribute('tabindex');
                    else destination.setAttribute('tabindex', originalTabIndex);
                }, { once: true });
            });
        });

        document.addEventListener('pointerdown', event => {
            if (isOpen && !widget.contains(event.target)) setOpen(false);
        });
        document.addEventListener('focusin', event => {
            if (isOpen && !widget.contains(event.target)) setOpen(false);
        });
        document.addEventListener('keydown', event => {
            if (isOpen && event.key === 'Escape') {
                event.preventDefault();
                event.stopImmediatePropagation();
                setOpen(false, true);
            }
        }, true);

        // Existing modals and the mobile drawer take precedence over this nonmodal guide.
        const overlays = Array.from(document.querySelectorAll('#projectModal, #cvModal, #quickCmdBackdrop, #siteSidebar'));
        function syncOverlays() {
            const obscured = overlays.some(overlay => overlay.classList.contains('open'));
            if (obscured) setOpen(false);
            widget.hidden = obscured;
        }
        const observer = new MutationObserver(syncOverlays);
        overlays.forEach(overlay => observer.observe(overlay, { attributes: true, attributeFilter: ['class'] }));
        syncOverlays();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeGuide);
    else initializeGuide();
})();
