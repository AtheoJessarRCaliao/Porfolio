/**
 * Atheo Jessar R. Caliao - Modern Minimal Portfolio
 * Interactive Functionality & Theme Manager
 */

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNavigation();
    initProjectsSpotlight();
    initSkillsFilter();
    initMilestonesFilter();
    initProjectModals();
    initClipboardCopy();
    initContactForm();
    initSiteLiveMatrixBackground();
});

/* ==========================================================================
   1. Theme Management (Dark / Light Mode) with Circular Ripple & Micro-Interactions
   ========================================================================== */
let themeTransitionTimer = null;

function enableThemeTransitionClass() {
    document.documentElement.classList.add('theme-transitioning');
    if (themeTransitionTimer) clearTimeout(themeTransitionTimer);
    themeTransitionTimer = setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning');
    }, 450);
}

function initTheme() {
    const themeButtons = document.querySelectorAll('.theme-toggle-btn');
    if (!themeButtons.length) return;

    // Check localStorage or system preference
    const savedTheme = localStorage.getItem('theo-portfolio-theme');
    const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Default to dark mode if no preference stored
    const activeTheme = savedTheme || (systemPrefersDark ? 'dark' : 'dark');
    applyTheme(activeTheme, false);

    themeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            toggleThemeWithTransition(e, newTheme, btn);
        });
    });

    // Listen for OS preference changes if not explicitly set
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theo-portfolio-theme')) {
            applyTheme(e.matches ? 'dark' : 'light', true);
        }
    });
}

function toggleThemeWithTransition(event, newTheme, triggerBtn) {
    // 1. Play button tactile pulse ring animation
    if (triggerBtn) {
        triggerBtn.classList.remove('btn-pulse');
        void triggerBtn.offsetWidth; // force reflow
        triggerBtn.classList.add('btn-pulse');
    }

    // 2. Global smooth CSS transition on colors & surfaces
    enableThemeTransitionClass();

    // 3. Modern Circular Ripple expansion via View Transitions API
    const isReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (document.startViewTransition && !isReducedMotion) {
        // Calculate origin center of the clicked button
        let x = window.innerWidth / 2;
        let y = 0;
        
        if (triggerBtn) {
            const rect = triggerBtn.getBoundingClientRect();
            x = rect.left + rect.width / 2;
            y = rect.top + rect.height / 2;
        } else if (event) {
            x = event.clientX;
            y = event.clientY;
        }

        const endRadius = Math.hypot(
            Math.max(x, window.innerWidth - x),
            Math.max(y, window.innerHeight - y)
        );

        const transition = document.startViewTransition(() => {
            applyTheme(newTheme, true);
            localStorage.setItem('theo-portfolio-theme', newTheme);
        });

        transition.ready.then(() => {
            const isDark = newTheme === 'dark';
            const clipPath = [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${endRadius}px at ${x}px ${y}px)`
            ];

            document.documentElement.animate(
                {
                    clipPath: isDark ? [...clipPath].reverse() : clipPath
                },
                {
                    duration: 480,
                    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
                    pseudoElement: isDark ? '::view-transition-old(root)' : '::view-transition-new(root)'
                }
            );
        }).catch(() => {
            applyTheme(newTheme, true);
            localStorage.setItem('theo-portfolio-theme', newTheme);
        });
    } else {
        // Fallback for browsers without View Transitions
        applyTheme(newTheme, true);
        localStorage.setItem('theo-portfolio-theme', newTheme);
    }
}

function applyTheme(theme, animateIcon = false) {
    document.documentElement.setAttribute('data-theme', theme);
    const themeButtons = document.querySelectorAll('.theme-toggle-btn');
    
    themeButtons.forEach(btn => {
        const icon = btn.querySelector('i');
        const label = btn.querySelector('.theme-label-text, .theme-btn-label');
        
        if (icon) {
            if (theme === 'light') {
                icon.className = 'fas fa-moon';
            } else {
                icon.className = 'fas fa-sun';
            }
            if (animateIcon) {
                icon.classList.remove('theme-icon-spin');
                void icon.offsetWidth; // trigger reflow
                icon.classList.add('theme-icon-spin');
            }
        }

        if (theme === 'light') {
            btn.setAttribute('title', 'Switch to dark theme');
            btn.setAttribute('aria-label', 'Switch to dark theme');
            if (label) label.textContent = 'Dark';
        } else {
            btn.setAttribute('title', 'Switch to light theme');
            btn.setAttribute('aria-label', 'Switch to light theme');
            if (label) label.textContent = 'Light';
        }
    });
}

/* ==========================================================================
   2. Tabbed Navigation & Mobile Drawer (Independent Category Views)
   ========================================================================== */
function initNavigation() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
    const sidebarCollapseBtn = document.getElementById('sidebarCollapseBtn');
    const floatingNavToggleBtn = document.getElementById('floatingNavToggleBtn');
    const siteSidebar = document.getElementById('siteSidebar');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');
    const navLinks = document.querySelectorAll('.sidebar-nav-link');
    const tabPanels = document.querySelectorAll('.tab-panel');
    const validTabs = ['about', 'projects', 'skills', 'journey', 'interests', 'contact'];

    function openSidebar() {
        if (!siteSidebar) return;
        siteSidebar.classList.add('open');
        if (sidebarBackdrop) sidebarBackdrop.classList.add('open');
        if (mobileMenuBtn) mobileMenuBtn.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        if (!siteSidebar) return;
        siteSidebar.classList.remove('open');
        if (sidebarBackdrop) sidebarBackdrop.classList.remove('open');
        if (mobileMenuBtn) mobileMenuBtn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
    }

    // Desktop & Tablet Sidebar Collapse / Expand Controller
    function toggleDesktopSidebar(forceState) {
        const isClosed = forceState !== undefined 
            ? forceState 
            : !document.body.classList.contains('sidebar-closed');

        if (isClosed) {
            document.body.classList.add('sidebar-closed');
            localStorage.setItem('theo-portfolio-sidebar-closed', 'true');
        } else {
            document.body.classList.remove('sidebar-closed');
            localStorage.removeItem('theo-portfolio-sidebar-closed');
        }
    }

    // Restore desktop sidebar closed state from localStorage
    if (window.innerWidth > 1024) {
        const savedClosed = localStorage.getItem('theo-portfolio-sidebar-closed') === 'true';
        if (savedClosed) {
            document.body.classList.add('sidebar-closed');
        }
    }

    if (sidebarCollapseBtn) {
        sidebarCollapseBtn.addEventListener('click', () => {
            if (window.innerWidth <= 1024) {
                closeSidebar();
            } else {
                toggleDesktopSidebar(true);
            }
        });
    }

    if (floatingNavToggleBtn) {
        floatingNavToggleBtn.addEventListener('click', () => {
            if (window.innerWidth <= 1024) {
                openSidebar();
            } else {
                toggleDesktopSidebar(false);
            }
        });
    }

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', openSidebar);
    }

    if (sidebarCloseBtn) {
        sidebarCloseBtn.addEventListener('click', closeSidebar);
    }

    if (sidebarBackdrop) {
        sidebarBackdrop.addEventListener('click', closeSidebar);
    }

    // Close mobile drawer upon pressing ESC key; Toggle with Ctrl+B / Cmd+B
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && siteSidebar && siteSidebar.classList.contains('open')) {
            closeSidebar();
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
            e.preventDefault();
            if (window.innerWidth <= 1024) {
                if (siteSidebar && siteSidebar.classList.contains('open')) {
                    closeSidebar();
                } else {
                    openSidebar();
                }
            } else {
                toggleDesktopSidebar();
            }
        }
    });

    let currentTabIndex = 0;
    const initialHashCheck = (window.location.hash || '').replace(/^#/, '');
    if (initialHashCheck && validTabs.includes(initialHashCheck)) {
        currentTabIndex = validTabs.indexOf(initialHashCheck);
    }

    /**
     * Switch active tab view with alternate directional transitions
     * @param {string} tabId - ID of the tab to display
     * @param {boolean} updateHistory - Whether to push state to browser history
     */
    function switchTab(tabId, updateHistory = true) {
        const cleanId = (tabId || '').replace(/^#/, '');
        const targetTab = validTabs.includes(cleanId) ? cleanId : 'about';
        const targetPanel = document.getElementById(targetTab);

        if (!targetPanel) return;

        const newIndex = validTabs.indexOf(targetTab);
        const isForward = newIndex >= currentTabIndex;
        const directionClass = isForward ? 'tab-enter-forward' : 'tab-enter-backward';
        currentTabIndex = newIndex >= 0 ? newIndex : 0;

        // Hide all tab panels and activate chosen one with directional slide
        tabPanels.forEach(panel => {
            panel.classList.remove('active', 'tab-enter-forward', 'tab-enter-backward');
        });

        void targetPanel.offsetWidth; // force reflow for smooth animation replay
        targetPanel.classList.add('active', directionClass);

        // Update active class and trigger tactile pulse on sidebar navigation links
        navLinks.forEach(link => {
            const linkHref = link.getAttribute('href');
            const isActive = linkHref === `#${targetTab}`;
            link.classList.toggle('active', isActive);
            if (isActive) {
                link.classList.remove('nav-click-pulse');
                void link.offsetWidth; // force reflow
                link.classList.add('nav-click-pulse');
            }
        });

        // Close mobile drawer if open
        if (window.innerWidth <= 1024) {
            closeSidebar();
        }

        // Scroll back to top of content smoothly (both window and page wrapper)
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
        const contentWrapper = document.querySelector('.page-content-wrapper');
        if (contentWrapper) {
            contentWrapper.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }

        // Update browser URL hash
        if (updateHistory && history.pushState) {
            history.pushState({ tab: targetTab }, '', `#${targetTab}`);
        }
    }

    // Intercept clicks on any hash links matching valid tabs (sidebar + in-page CTAs)
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href^="#"]');
        if (!link) return;

        const href = link.getAttribute('href');
        const tabId = href ? href.substring(1) : '';

        if (validTabs.includes(tabId)) {
            e.preventDefault();
            switchTab(tabId);
        }
    });

    // Handle browser Back and Forward navigation
    window.addEventListener('popstate', () => {
        const currentHash = window.location.hash.substring(1) || 'about';
        switchTab(currentHash, false);
    });

    // Initialize initial tab on page load based on URL hash
    const initialHash = window.location.hash.substring(1);
    if (initialHash && validTabs.includes(initialHash)) {
        switchTab(initialHash, false);
    } else {
        switchTab('about', false);
    }

    // Initialize Linear/Raycast-style Quick Command Palette
    initQuickCommandPalette(switchTab);
}

/* ==========================================================================
   2.2. Quick Command Palette (Spotlight Navigation & Search)
   ========================================================================== */
function initQuickCommandPalette(switchTabFn) {
    const backdrop = document.getElementById('quickCmdBackdrop');
    const input = document.getElementById('quickCmdInput');
    const resultsContainer = document.getElementById('quickCmdResults');
    const triggerBtn = document.getElementById('sidebarQuickCmdBtn');

    if (!backdrop || !input || !resultsContainer) return;

    const items = [
        { type: 'page', id: 'about', title: 'About', subtitle: 'Overview, Bio & Background', icon: 'fas fa-user-circle', badge: 'Key 1' },
        { type: 'page', id: 'projects', title: 'Projects', subtitle: 'Architecture & Engineering Experience', icon: 'fas fa-layer-group', badge: 'Key 2' },
        { type: 'page', id: 'skills', title: 'Skills', subtitle: 'Languages, Frameworks & Core Stack', icon: 'fas fa-cubes', badge: 'Key 3' },
        { type: 'page', id: 'journey', title: 'Journey', subtitle: 'Experience, Milestones & Awards', icon: 'fas fa-graduation-cap', badge: 'Key 4' },
        { type: 'page', id: 'interests', title: 'Interests', subtitle: 'Personal Interests & Explorations', icon: 'fas fa-compass', badge: 'Key 5' },
        { type: 'page', id: 'contact', title: 'Contact', subtitle: 'Get in Touch & Direct Messaging', icon: 'fas fa-envelope', badge: 'Key 6' },
        { type: 'project', id: 'health', title: 'Smart Health Integration (AI-DSUHIS)', subtitle: 'Deployed Health System • Laravel / React', icon: 'fas fa-laptop-medical', badge: 'Project' },
        { type: 'project', id: 'tourism', title: 'LGU Impasug-ong Tourism Portal', subtitle: 'Municipal Booking Platform • MERN / Laravel', icon: 'fas fa-landmark', badge: 'Project' },
        { type: 'project', id: 'tally', title: 'Real-Time Intramurals Tally System', subtitle: 'Scoreboard Platform • React / Async API', icon: 'fas fa-trophy', badge: 'Project' },
        { type: 'project', id: 'acadex', title: 'Acadex: Offline Study Companion', subtitle: 'Personal Project • Offline-First React', icon: 'fas fa-graduation-cap', badge: 'Project' }
    ];

    let selectedIndex = 0;
    let filteredItems = [...items];

    function openPalette() {
        backdrop.classList.add('open');
        input.value = '';
        renderItems('');
        setTimeout(() => input.focus(), 60);
    }

    function closePalette() {
        backdrop.classList.remove('open');
    }

    function renderItems(filterText) {
        const query = (filterText || '').toLowerCase().trim();
        filteredItems = items.filter(item => 
            item.title.toLowerCase().includes(query) ||
            item.subtitle.toLowerCase().includes(query)
        );
        selectedIndex = 0;

        if (filteredItems.length === 0) {
            resultsContainer.innerHTML = `
                <div style="text-align: center; padding: 2rem 1rem; color: var(--text-muted); font-size: 0.9rem;">
                    <i class="fas fa-magnifying-glass" style="font-size: 1.5rem; margin-bottom: 0.5rem; opacity: 0.4; display: block;"></i>
                    No matches found for "${query}"
                </div>
            `;
            return;
        }

        let html = '';
        let currentType = '';

        filteredItems.forEach((item, index) => {
            if (item.type !== currentType) {
                currentType = item.type;
                const groupTitle = currentType === 'page' ? 'Pages' : 'Featured Projects';
                html += `<div class="quick-cmd-group-label">${groupTitle}</div>`;
            }

            const isSelected = index === selectedIndex ? 'selected' : '';
            html += `
                <div class="quick-cmd-item ${isSelected}" data-index="${index}" data-type="${item.type}" data-id="${item.id}">
                    <div class="quick-cmd-item-icon">
                        <i class="${item.icon}"></i>
                    </div>
                    <div class="quick-cmd-item-title">
                        <div>${item.title}</div>
                        <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 400;">${item.subtitle}</div>
                    </div>
                    <span class="quick-cmd-item-badge">${item.badge}</span>
                </div>
            `;
        });

        resultsContainer.innerHTML = html;

        resultsContainer.querySelectorAll('.quick-cmd-item').forEach(el => {
            el.addEventListener('click', () => {
                const idx = parseInt(el.getAttribute('data-index'), 10);
                executeItem(filteredItems[idx]);
            });
            el.addEventListener('mouseenter', () => {
                const idx = parseInt(el.getAttribute('data-index'), 10);
                updateSelection(idx);
            });
        });
    }

    function updateSelection(newIdx) {
        if (newIdx < 0) newIdx = filteredItems.length - 1;
        if (newIdx >= filteredItems.length) newIdx = 0;
        selectedIndex = newIdx;

        const itemsEl = resultsContainer.querySelectorAll('.quick-cmd-item');
        itemsEl.forEach((el, idx) => {
            el.classList.toggle('selected', idx === selectedIndex);
        });

        const activeEl = itemsEl[selectedIndex];
        if (activeEl) {
            activeEl.scrollIntoView({ block: 'nearest' });
        }
    }

    function executeItem(item) {
        if (!item) return;
        closePalette();

        if (item.type === 'page') {
            if (typeof switchTabFn === 'function') {
                switchTabFn(item.id);
            }
        } else if (item.type === 'project') {
            if (typeof switchTabFn === 'function') {
                switchTabFn('projects');
            }
            setTimeout(() => {
                if (typeof window.openProjectModal === 'function') {
                    window.openProjectModal(item.id);
                }
            }, 300);
        }
    }

    if (triggerBtn) {
        triggerBtn.addEventListener('click', openPalette);
    }

    backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closePalette();
    });

    input.addEventListener('input', (e) => {
        renderItems(e.target.value);
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            updateSelection(selectedIndex + 1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            updateSelection(selectedIndex - 1);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredItems[selectedIndex]) {
                executeItem(filteredItems[selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closePalette();
        }
    });

    // Global keyboard shortcuts (Ctrl+K, 1-6)
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            if (backdrop.classList.contains('open')) {
                closePalette();
            } else {
                openPalette();
            }
        } else if (e.key === 'Escape' && backdrop.classList.contains('open')) {
            closePalette();
        } else if (!backdrop.classList.contains('open')) {
            const activeTag = (document.activeElement && document.activeElement.tagName) || '';
            const isTyping = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT';
            if (!isTyping && !e.ctrlKey && !e.altKey && !e.metaKey) {
                const keyNum = parseInt(e.key, 10);
                if (keyNum >= 1 && keyNum <= 6) {
                    const tabMap = ['about', 'projects', 'skills', 'journey', 'interests', 'contact'];
                    const targetTab = tabMap[keyNum - 1];
                    if (targetTab && typeof switchTabFn === 'function') {
                        switchTabFn(targetTab);
                    }
                }
            }
        }
    });
}

/* ==========================================================================
   2.5. Projects Spotlight & Interactive Filter
   ========================================================================== */
function initProjectsSpotlight() {
    const projectCards = document.querySelectorAll('.project-card');
    const projectsGrid = document.querySelector('.projects-grid');
    const spotlightBackdrop = document.getElementById('projectsSpotlightBackdrop');
    const filterPills = document.querySelectorAll('.project-filter-pill');

    if (!projectCards.length || !projectsGrid) return;

    // Interactive category filter pills with smooth micro-transitions
    if (filterPills.length) {
        filterPills.forEach(pill => {
            pill.addEventListener('click', () => {
                const filter = pill.getAttribute('data-filter');
                filterPills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');

                projectCards.forEach(card => {
                    const categories = (card.getAttribute('data-category') || '').split(' ');
                    if (filter === 'all' || categories.includes(filter)) {
                        card.style.display = 'flex';
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        });
    }

    projectCards.forEach(card => {
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        const title = card.querySelector('.project-title')?.textContent?.trim() || 'project';
        card.setAttribute('aria-label', `View architecture details for ${title}`);

        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const projectId = card.getAttribute('data-project') || card.querySelector('[data-project]')?.getAttribute('data-project');
                if (projectId && typeof window.openProjectModal === 'function') {
                    window.openProjectModal(projectId);
                }
            }
        });
    });

    if (spotlightBackdrop) {
        spotlightBackdrop.addEventListener('click', () => {
            spotlightBackdrop.classList.remove('active');
            projectsGrid.classList.remove('has-selected');
            projectCards.forEach(c => c.classList.remove('is-selected', 'is-blurred'));
        });
    }
}

/* ==========================================================================
   3. Skills Category Spotlight & Profile Selection
   ========================================================================== */
function initSkillsFilter() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const skillCategories = document.querySelectorAll('.skill-category-card');
    const skillsGrid = document.querySelector('.skills-grid');
    const spotlightBackdrop = document.getElementById('skillsSpotlightBackdrop');

    if (!skillCategories.length || !skillsGrid) return;

    let activeFilter = 'all';

    function setCategoryFocus(filter, scrollIntoFocus = false) {
        activeFilter = filter;

        // Update active state on filter buttons if present
        if (filterButtons && filterButtons.length) {
            filterButtons.forEach(btn => {
                const btnFilter = btn.getAttribute('data-filter');
                if (btnFilter === filter) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }

        if (filter === 'all') {
            skillsGrid.classList.remove('has-selected');
            if (spotlightBackdrop) spotlightBackdrop.classList.remove('active');

            skillCategories.forEach(card => {
                // Clear any inline styles left over from previous state
                card.style.display = '';
                card.style.opacity = '';
                card.style.transform = '';
                card.classList.remove('is-selected', 'is-blurred');
            });
        } else {
            skillsGrid.classList.add('has-selected');
            if (spotlightBackdrop) spotlightBackdrop.classList.add('active');

            let selectedCard = null;

            skillCategories.forEach(card => {
                card.style.display = '';
                card.style.opacity = '';
                card.style.transform = '';

                const category = card.getAttribute('data-category');
                if (category === filter) {
                    card.classList.add('is-selected');
                    card.classList.remove('is-blurred');
                    selectedCard = card;
                } else {
                    card.classList.remove('is-selected');
                    card.classList.add('is-blurred');
                }
            });

            if (scrollIntoFocus && selectedCard) {
                selectedCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }

    // Filter tab buttons (if present)
    if (filterButtons && filterButtons.length) {
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const filter = btn.getAttribute('data-filter');
                if (filter !== 'all' && activeFilter === filter) {
                    setCategoryFocus('all');
                } else {
                    setCategoryFocus(filter, true);
                }
            });
        });
    }

    // Clicking a category card directly selects / focuses it
    skillCategories.forEach(card => {
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        const category = card.getAttribute('data-category');
        const title = card.querySelector('.category-title')?.textContent?.trim() || category;
        card.setAttribute('aria-label', `Select ${title} skills profile`);

        card.addEventListener('click', () => {
            if (card.classList.contains('is-selected')) {
                // Clicking the already selected card deselects it
                setCategoryFocus('all');
            } else {
                setCategoryFocus(category, false);
            }
        });

        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (card.classList.contains('is-selected')) {
                    setCategoryFocus('all');
                } else {
                    setCategoryFocus(category, true);
                }
            }
        });
    });

    // Clicking the backdrop closes the spotlight and unblurs
    if (spotlightBackdrop) {
        spotlightBackdrop.addEventListener('click', () => {
            setCategoryFocus('all');
        });
    }

    // Press Escape to dismiss spotlight and reset to all
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && activeFilter !== 'all') {
            setCategoryFocus('all');
        }
    });
}

/* ==========================================================================
   4. Milestones / Journey Category Filter
   ========================================================================== */
function initMilestonesFilter() {
    const filterButtons = document.querySelectorAll('.milestone-filter-btn');
    const milestoneCards = document.querySelectorAll('.milestone-card');

    if (!filterButtons.length || !milestoneCards.length) return;

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.getAttribute('data-filter');

            milestoneCards.forEach(card => {
                const category = card.getAttribute('data-milestone');
                if (filter === 'all' || category === filter) {
                    card.style.display = 'flex';
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }, 20);
                } else {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(8px)';
                    setTimeout(() => {
                        card.style.display = 'none';
                    }, 180);
                }
            });
        });
    });
}

/* ==========================================================================
   5. Project Details Modal (Architecture & Deep Dive)
   ========================================================================== */
const projectData = {
    'health': {
        title: 'Smart Health Integration (AI-DSUHIS)',
        role: 'Lead Fullstack Developer',
        image: 'assets/images/smart-health-integration.png',
        tech: ['Laravel', 'React.js', 'Java (Android)', 'MySQL / SQL', 'RESTful API', 'AI Sync'],
        highlights: [
            'Engineered an AI-Driven Unified Health Information System for Malaybalay City local health units, consolidating maternal healthcare, disease epidemiology monitoring, and community immunization records.',
            'Architected a high-throughput, decoupled REST API backend using Laravel to feed a single-page application (SPA) client interface.',
            'Developed a native Android application in Java specifically built for field healthcare personnel operating in rural areas.',
            'Designed a conflict-free, offline-first data replication protocol that caches records locally in SQLite and synchronizes changes back to MySQL as soon as connectivity resumes.'
        ],
        overview: 'This flagship healthcare project solves the persistent fragmentation of patient data across rural barangays. Through role-based security, field workers can log maternal vitals and vaccination status even in zero-reception areas, automatically syncing records with central municipal hospital databases.'
    },
    'tourism': {
        title: 'LGU Impasug-ong Tourism Accommodation Portal',
        role: 'Fullstack Developer',
        image: 'assets/images/LGU.webp',
        tech: ['MERN Stack', 'Laravel', 'RBAC Security', 'Relational Schemas', 'Express.js', 'React'],
        highlights: [
            'Developed a multi-tenant booking and accommodation management system for the Municipality of Impasug-ong Tourism Office, hotel/inn operators, and visitors.',
            'Designed and normalized complex relational database schemas for handling room availability, date reservations, and customer billing histories.',
            'Implemented granular Role-Based Access Control (RBAC) to ensure absolute data isolation across municipality administrators, property merchants, and guests.',
            'Created automated reporting dashboards and financial summaries for Impasug-ong municipal revenue and tourist volume audits.'
        ],
        overview: 'Created to digitize the regional tourism sector for the Municipality of Impasug-ong, Bukidnon by providing local property managers with automated room inventory controls while granting local government units real-time visibility into tourism analytics and municipal tax compliance.'
    },
    'tally': {
        title: 'Real-Time Intramurals Tally System',
        role: 'Fullstack Developer',
        image: 'assets/images/TALLY.png',
        tech: ['React.js', 'JavaScript (Fetch API/AJAX)', 'Backend REST', 'Real-Time Analytics'],
        highlights: [
            'Engineered an event scoring and tallying dashboard deployed during university-wide sports and socio-cultural intramural competitions.',
            'Implemented non-blocking asynchronous data polling via AJAX/Fetch API, streaming score updates to spectator screens and judging panels without page refreshes.',
            'Architected automated tie-breaking algorithms and overall championship medal tally aggregators.'
        ],
        overview: 'Delivered an interactive, zero-latency tournament management experience during Bukidnon State University intramurals, keeping thousands of students, faculty, and athletes updated on tournament rankings in real-time.'
    },
    'acadex': {
        title: 'Acadex: Offline Study Companion',
        role: 'Personal Project',
        image: 'assets/images/ACADEX.png',
        tech: ['JavaScript / React', 'Offline-First Architecture', 'Client Storage / IndexedDB', 'Pomodoro Timer', 'Productivity Analytics'],
        highlights: [
            'Engineered an all-in-one offline academic productivity companion empowering students to organize coursework, manage assignment deadlines, and track exam readiness with zero internet dependency.',
            'Implemented an integrated Pomodoro study timer with automated focus sessions, customizable intervals, and daily focus tracking metrics.',
            'Architected client-side local persistence (IndexedDB / LocalStorage) guaranteeing instant response times, offline resilience, and zero data leakage.',
            'Designed dynamic exam countdown widgets, automated task prioritization queues, and historical study score analytics.'
        ],
        overview: 'Developed as a dedicated personal project to help students excel academically even without reliable internet connectivity. Acadex combines course organization, Pomodoro study timing, task management, and focus performance metrics into a distraction-free offline experience.'
    }
};

function initProjectModals() {
    const modalBackdrop = document.getElementById('projectModal');
    const modalContent = document.getElementById('projectModalBody');
    const closeBtn = document.getElementById('projectModalClose');
    const modalDialog = modalBackdrop?.querySelector('.modal-dialog');
    const triggerButtons = document.querySelectorAll('.project-modal-trigger');

    if (!modalBackdrop || !modalContent) return;

    function openModal(projectId) {
        const data = projectData[projectId];
        if (!data) return;

        const techPills = data.tech.map(t => `<span class="tech-pill">${t}</span>`).join(' ');
        const bullets = data.highlights.map(h => `<li>${h}</li>`).join('');

        modalContent.innerHTML = `
            <div style="margin-bottom: 1.25rem;">
                <span class="project-role-badge" style="display: inline-block; margin-bottom: 0.5rem; font-size: 12px;">${data.role}</span>
                <h2 style="font-size: 16px; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem; letter-spacing: -0.01em; line-height: 1.3;">${data.title}</h2>
                <div style="display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 1rem;">
                    ${techPills}
                </div>
                ${data.image ? `
                    <div style="border-radius: var(--radius-sm); overflow: hidden; border: 1px solid var(--border-subtle); background-color: #000000; box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45); margin-bottom: 1.15rem;">
                        <img src="${data.image}" alt="${data.title} Interface Preview" style="width: 100%; height: auto; display: block; object-fit: contain;">
                    </div>
                ` : ''}
            </div>
            
            <div style="margin-bottom: 1.25rem;">
                <h4 style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; font-family: var(--font-mono); margin-bottom: 0.45rem; color: var(--accent);">Architectural Overview</h4>
                <p style="font-size: 12px; color: var(--text-secondary); line-height: 1.6;">${data.overview}</p>
            </div>

            <div>
                <h4 style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; font-family: var(--font-mono); margin-bottom: 0.55rem; color: var(--accent);">Key Engineering Contributions</h4>
                <ul class="project-bullets">
                    ${bullets}
                </ul>
            </div>
        `;

        modalBackdrop.classList.add('open');
        document.body.style.overflow = 'hidden';
        if (modalDialog) {
            modalDialog.scrollTop = 0;
            modalDialog.style.transform = '';
            modalDialog.style.transition = '';
        }
    }

    function closeModal() {
        modalBackdrop.classList.remove('open');
        document.body.style.overflow = '';
        if (modalDialog) {
            modalDialog.style.transform = '';
            modalDialog.style.transition = '';
        }
    }

    window.openProjectModal = openModal;

    triggerButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const projectId = btn.getAttribute('data-project') || btn.closest('[data-project]')?.getAttribute('data-project');
            if (projectId) {
                openModal(projectId);
            }
        });
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }

    modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) {
            closeModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalBackdrop.classList.contains('open')) {
            closeModal();
        }
    });

    // Mobile Touch Gesture: Swipe Down on Dialog to Dismiss Modal
    if (modalDialog) {
        let touchStartY = 0;
        let touchCurrentY = 0;
        let isSwiping = false;

        modalDialog.addEventListener('touchstart', (e) => {
            if (modalDialog.scrollTop <= 5) {
                touchStartY = e.touches[0].clientY;
                isSwiping = true;
            }
        }, { passive: true });

        modalDialog.addEventListener('touchmove', (e) => {
            if (!isSwiping) return;
            touchCurrentY = e.touches[0].clientY;
            const diffY = touchCurrentY - touchStartY;
            if (diffY > 0) {
                modalDialog.style.transform = `translateY(${Math.min(diffY, 130)}px) scale(${1 - Math.min(diffY / 1200, 0.04)})`;
                modalDialog.style.transition = 'none';
            }
        }, { passive: true });

        modalDialog.addEventListener('touchend', () => {
            if (!isSwiping) return;
            isSwiping = false;
            const diffY = touchCurrentY - touchStartY;
            modalDialog.style.transition = 'transform 0.22s ease';
            if (diffY > 75) {
                closeModal();
            } else {
                modalDialog.style.transform = '';
            }
            touchStartY = 0;
            touchCurrentY = 0;
        }, { passive: true });
    }
}


/* ==========================================================================
   6. 1-Click Clipboard Copy with Feedback Toast
   ========================================================================== */
function initClipboardCopy() {
    const copyButtons = document.querySelectorAll('.copy-btn');

    copyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const textToCopy = btn.getAttribute('data-copy');
            if (!textToCopy) return;

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(textToCopy).then(() => {
                    showToast(`Copied "${textToCopy}" to clipboard!`);
                    temporarilyChangeButton(btn);
                }).catch(() => {
                    fallbackCopy(textToCopy, btn);
                });
            } else {
                fallbackCopy(textToCopy, btn);
            }
        });
    });
}

function fallbackCopy(text, btn) {
    const tempInput = document.createElement('input');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    try {
        document.execCommand('copy');
        showToast(`Copied "${text}" to clipboard!`);
        temporarilyChangeButton(btn);
    } catch (err) {
        showToast('Unable to copy text.');
    }
    document.body.removeChild(tempInput);
}

function temporarilyChangeButton(btn) {
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check" style="color: var(--accent);"></i> Copied';
    setTimeout(() => {
        btn.innerHTML = originalText;
    }, 2000);
}

function showToast(message) {
    let toast = document.getElementById('siteToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'siteToast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }

    toast.innerHTML = `
        <span class="toast-icon"><i class="fas fa-check-circle"></i></span>
        <span>${message}</span>
    `;

    toast.classList.add('show');
    clearTimeout(toast.timeoutId);
    toast.timeoutId = setTimeout(() => {
        toast.classList.remove('show');
    }, 3200);
}

/* ==========================================================================
   7. Contact Form Interactive Handler
   ========================================================================== */
function initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const nameInput = document.getElementById('formName');
        const emailInput = document.getElementById('formEmail');
        const messageInput = document.getElementById('formMessage');
        const submitBtn = form.querySelector('button[type="submit"]');

        const name = nameInput ? nameInput.value.trim() : '';
        const email = emailInput ? emailInput.value.trim() : '';
        const message = messageInput ? messageInput.value.trim() : '';

        if (!name || !email || !message) {
            showToast('Please fill in all required fields.');
            return;
        }

        // Simulate submission
        if (submitBtn) {
            const originalHtml = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending message...';

            setTimeout(() => {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalHtml;
                form.reset();
                showToast(`Thank you, ${name}! Your message has been sent.`);
            }, 1200);
        }
    });
}

/* ==========================================================================
   8. Live Dynamic Interactive Matrix Canvas Background (All Pages & Navbar)
   ========================================================================== */
function initSiteLiveMatrixBackground() {
    const canvasIds = ['siteMatrixCanvas', 'sidebarMatrixCanvas'];
    const instances = [];

    // Global mouse state
    const mouse = {
        x: -9999,
        y: -9999,
        targetX: -9999,
        targetY: -9999,
        radius: 175
    };

    let isVisible = true;
    let time = 0;
    let animationFrameId = null;

    canvasIds.forEach(id => {
        const canvas = document.getElementById(id);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        instances.push({
            id,
            canvas,
            ctx,
            width: 0,
            height: 0,
            points: [],
            spacing: id === 'sidebarMatrixCanvas' ? 26 : 34,
            isSidebar: id === 'sidebarMatrixCanvas'
        });
    });

    if (instances.length === 0) return;

    const sidebar = document.getElementById('siteSidebar');

    function resizeInstance(inst) {
        let w, h;
        if (inst.isSidebar && sidebar) {
            const rect = sidebar.getBoundingClientRect();
            w = Math.max(rect.width || 280, 240);
            h = Math.max(sidebar.scrollHeight || 0, rect.height || window.innerHeight, 600);
        } else {
            w = window.innerWidth;
            h = window.innerHeight;
        }

        inst.width = w;
        inst.height = h;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        inst.canvas.width = Math.floor(w * dpr);
        inst.canvas.height = Math.floor(h * dpr);
        inst.canvas.style.width = `${w}px`;
        inst.canvas.style.height = `${h}px`;

        inst.ctx.setTransform(1, 0, 0, 1, 0, 0);
        inst.ctx.scale(dpr, dpr);

        buildGrid(inst);
    }

    function buildGrid(inst) {
        inst.points = [];
        const spacing = inst.spacing;
        const cols = Math.ceil(inst.width / spacing) + 2;
        const rows = Math.ceil(inst.height / spacing) + 2;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const isAccent = (c * 7 + r * 11) % 11 === 0;
                inst.points.push({
                    baseX: c * spacing,
                    baseY: r * spacing,
                    x: c * spacing,
                    y: r * spacing,
                    size: isAccent ? (inst.isSidebar ? 1.75 : 1.7) : (inst.isSidebar ? 1.15 : 1.1),
                    phase: (c * 0.28) + (r * 0.35),
                    alpha: isAccent ? (inst.isSidebar ? 0.48 : 0.42) : (inst.isSidebar ? 0.24 : 0.18)
                });
            }
        }
    }

    function resizeAll() {
        instances.forEach(resizeInstance);
    }

    function onMouseMove(e) {
        mouse.targetX = e.clientX;
        mouse.targetY = e.clientY;
    }

    function onMouseLeave() {
        mouse.targetX = -9999;
        mouse.targetY = -9999;
    }

    window.addEventListener('resize', resizeAll, { passive: true });
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave, { passive: true });

    // Track sidebar expansion/collapse transitions and scrolling
    if (sidebar) {
        sidebar.addEventListener('transitionend', () => {
            const sbInst = instances.find(i => i.isSidebar);
            if (sbInst) resizeInstance(sbInst);
        });
        sidebar.addEventListener('scroll', () => {
            // Re-render will naturally sync canvasMouseY with scrollTop
        }, { passive: true });
    }

    function render() {
        if (!isVisible) {
            animationFrameId = requestAnimationFrame(render);
            return;
        }

        time += 0.022;

        // Smooth mouse damping
        mouse.x += (mouse.targetX - mouse.x) * 0.1;
        mouse.y += (mouse.targetY - mouse.y) * 0.1;

        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        const baseRgb = isLight ? '0, 0, 0' : '255, 255, 255';

        const instCount = instances.length;
        for (let k = 0; k < instCount; k++) {
            const inst = instances[k];
            const ctx = inst.ctx;
            const points = inst.points;
            const len = points.length;

            ctx.clearRect(0, 0, inst.width, inst.height);

            // Compute relative mouse coordinates for this canvas
            let canvasMouseX = mouse.x;
            let canvasMouseY = mouse.y;

            if (inst.isSidebar && sidebar) {
                const sbRect = sidebar.getBoundingClientRect();
                canvasMouseX = mouse.x - sbRect.left;
                canvasMouseY = mouse.y - sbRect.top + sidebar.scrollTop;
            }

            // Determine if mouse is in proximity of this canvas
            const isMouseActive = inst.isSidebar
                ? (canvasMouseX >= -60 && canvasMouseX <= inst.width + 60 && mouse.x > -500)
                : (mouse.x > -500);

            for (let i = 0; i < len; i++) {
                const p = points[i];

                // 2D undulating wave mechanics
                const waveY = Math.sin(time + p.phase) * (inst.isSidebar ? 2.4 : 3);
                const waveX = Math.cos(time * 0.75 + p.phase) * (inst.isSidebar ? 1.6 : 2);
                const targetX = p.baseX + waveX;
                const targetY = p.baseY + waveY;

                // Distance to mouse pointer
                const dx = p.x - canvasMouseX;
                const dy = p.y - canvasMouseY;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < mouse.radius && isMouseActive) {
                    const force = (1 - dist / mouse.radius);
                    const angle = Math.atan2(dy, dx);
                    p.x += Math.cos(angle) * force * (inst.isSidebar ? 9 : 12);
                    p.y += Math.sin(angle) * force * (inst.isSidebar ? 9 : 12);
                }

                // Spring return to wave harmonic position
                p.x += (targetX - p.x) * 0.085;
                p.y += (targetY - p.y) * 0.085;

                // Interactive lighting & size scaling
                let ptAlpha = p.alpha;
                let ptSize = p.size;

                if (dist < mouse.radius && isMouseActive) {
                    const proximity = 1 - (dist / mouse.radius);
                    ptAlpha = Math.min(0.95, p.alpha + proximity * 0.65);
                    ptSize = p.size + proximity * 1.6;

                    // Glowing fine filaments to nearby active points
                    if (i % 2 === 0 && proximity > 0.3) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(canvasMouseX, canvasMouseY);
                        ctx.strokeStyle = `rgba(${baseRgb}, ${proximity * (inst.isSidebar ? 0.28 : 0.2)})`;
                        ctx.lineWidth = 0.75;
                        ctx.stroke();
                    }
                }

                // Draw matrix dot
                ctx.beginPath();
                ctx.arc(p.x, p.y, ptSize, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${baseRgb}, ${ptAlpha})`;
                ctx.fill();
            }
        }

        animationFrameId = requestAnimationFrame(render);
    }

    // Battery-friendly pause when tab is minimized or hidden
    document.addEventListener('visibilitychange', () => {
        isVisible = !document.hidden;
    });

    setTimeout(() => {
        resizeAll();
        render();
    }, 40);
}
