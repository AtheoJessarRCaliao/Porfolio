/**
 * Atheo Jessar Caliao - Modern Minimal Portfolio
 * Interactive Functionality & Theme Manager
 */

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNavigation();
    initSkillsFilter();
    initProjectModals();
    initClipboardCopy();
    initContactForm();
});

/* ==========================================================================
   1. Theme Management (Dark / Light Mode)
   ========================================================================== */
function initTheme() {
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (!themeToggleBtn) return;

    // Check localStorage or system preference
    const savedTheme = localStorage.getItem('theo-portfolio-theme');
    const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Default to dark mode if no preference stored
    const activeTheme = savedTheme || (systemPrefersDark ? 'dark' : 'dark');
    applyTheme(activeTheme);

    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
        localStorage.setItem('theo-portfolio-theme', newTheme);
    });

    // Listen for OS preference changes if not explicitly set
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theo-portfolio-theme')) {
            applyTheme(e.matches ? 'dark' : 'light');
        }
    });
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
        const icon = themeToggleBtn.querySelector('i');
        if (icon) {
            if (theme === 'light') {
                icon.className = 'fas fa-moon';
                themeToggleBtn.setAttribute('title', 'Switch to dark theme');
                themeToggleBtn.setAttribute('aria-label', 'Switch to dark theme');
            } else {
                icon.className = 'fas fa-sun';
                themeToggleBtn.setAttribute('title', 'Switch to light theme');
                themeToggleBtn.setAttribute('aria-label', 'Switch to light theme');
            }
        }
    }
}

/* ==========================================================================
   2. Sticky Navigation & Scroll Spy
   ========================================================================== */
function initNavigation() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileNavDrawer = document.getElementById('mobileNavDrawer');
    const navLinks = document.querySelectorAll('.nav-link');
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
    const sections = document.querySelectorAll('section[id]');

    // Mobile menu toggle
    if (mobileMenuBtn && mobileNavDrawer) {
        mobileMenuBtn.addEventListener('click', () => {
            const isOpen = mobileNavDrawer.classList.toggle('open');
            mobileMenuBtn.setAttribute('aria-expanded', isOpen);
            const icon = mobileMenuBtn.querySelector('i');
            if (icon) {
                icon.className = isOpen ? 'fas fa-times' : 'fas fa-bars';
            }
        });

        // Close on link click
        mobileNavLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileNavDrawer.classList.remove('open');
                mobileMenuBtn.setAttribute('aria-expanded', 'false');
                const icon = mobileMenuBtn.querySelector('i');
                if (icon) icon.className = 'fas fa-bars';
            });
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!mobileNavDrawer.contains(e.target) && !mobileMenuBtn.contains(e.target) && mobileNavDrawer.classList.contains('open')) {
                mobileNavDrawer.classList.remove('open');
                mobileMenuBtn.setAttribute('aria-expanded', 'false');
                const icon = mobileMenuBtn.querySelector('i');
                if (icon) icon.className = 'fas fa-bars';
            }
        });
    }

    // Scroll spy for active link indicator
    function onScroll() {
        const scrollY = window.pageYOffset + 120;

        sections.forEach(section => {
            const sectionHeight = section.offsetHeight;
            const sectionTop = section.offsetTop;
            const sectionId = section.getAttribute('id');

            if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.toggle('active', link.getAttribute('href') === `#${sectionId}`);
                });
                mobileNavLinks.forEach(link => {
                    link.classList.toggle('active', link.getAttribute('href') === `#${sectionId}`);
                });
            }
        });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
}

/* ==========================================================================
   3. Skills Category Filter
   ========================================================================== */
function initSkillsFilter() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const skillCategories = document.querySelectorAll('.skill-category-card');

    if (!filterButtons.length || !skillCategories.length) return;

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.getAttribute('data-filter');

            skillCategories.forEach(card => {
                const category = card.getAttribute('data-category');
                if (filter === 'all' || category === filter) {
                    card.style.display = 'block';
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }, 20);
                } else {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(10px)';
                    setTimeout(() => {
                        card.style.display = 'none';
                    }, 180);
                }
            });
        });
    });
}

/* ==========================================================================
   4. Project Details Modal (Architecture & Deep Dive)
   ========================================================================== */
const projectData = {
    'health': {
        title: 'Smart Health Integration (AI-DSUHIS)',
        role: 'Lead Fullstack Developer',
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
        title: 'LGU Tourism Accommodation Portal',
        role: 'Fullstack Developer',
        tech: ['MERN Stack', 'Laravel', 'RBAC Security', 'Relational Schemas', 'Express.js', 'React'],
        highlights: [
            'Developed a multi-tenant booking and accommodation management system for the Department of Tourism, hotel operators, and visitors.',
            'Designed and normalized complex relational database schemas for handling room availability, date reservations, and customer billing histories.',
            'Implemented granular Role-Based Access Control (RBAC) to ensure absolute data isolation across municipality administrators, property merchants, and guests.'
        ],
        overview: 'Created to digitize the regional tourism sector by providing property managers with automated room inventory controls while granting local government units real-time visibility into tourism analytics and municipal tax compliance.'
    },
    'bhw': {
        title: 'BHW Digital Recording System',
        role: 'Fullstack Developer',
        tech: ['Web Technologies', 'PHP', 'Relational SQL', 'CRUD Ops', 'Form Sanitization'],
        highlights: [
            'Digitized decades of legacy paper registers for Barangay Health Workers (BHW) into an instant search-indexed web repository.',
            'Optimized relational database indexes and queries to provide near-instant retrieval times during high-volume triage and consultation periods.',
            'Implemented comprehensive validation and sanitization filters across critical clinical input forms to guarantee patient data fidelity.'
        ],
        overview: 'A community-focused software solution that eliminated record loss, reduced patient intake check-in wait times by over 60%, and enabled health workers to generate accurate statistical morbidity reports in seconds.'
    },
    'tally': {
        title: 'Real-Time Intramurals Tally System',
        role: 'Fullstack Developer',
        tech: ['React.js', 'JavaScript (Fetch API/AJAX)', 'Backend REST', 'Real-Time Analytics'],
        highlights: [
            'Engineered an event scoring and tallying dashboard deployed during university-wide sports and socio-cultural intramural competitions.',
            'Implemented non-blocking asynchronous data polling via AJAX/Fetch API, streaming score updates to spectator screens and judging panels without page refreshes.',
            'Architected automated tie-breaking algorithms and overall championship medal tally aggregators.'
        ],
        overview: 'Delivered an interactive, zero-latency tournament management experience during Bukidnon State University intramurals, keeping thousands of students, faculty, and athletes updated on tournament rankings in real-time.'
    }
};

function initProjectModals() {
    const modalBackdrop = document.getElementById('projectModal');
    const modalContent = document.getElementById('projectModalBody');
    const closeBtn = document.getElementById('projectModalClose');
    const triggerButtons = document.querySelectorAll('.project-modal-trigger');

    if (!modalBackdrop || !modalContent) return;

    function openModal(projectId) {
        const data = projectData[projectId];
        if (!data) return;

        const techPills = data.tech.map(t => `<span class="tech-pill">${t}</span>`).join(' ');
        const bullets = data.highlights.map(h => `<li>${h}</li>`).join('');

        modalContent.innerHTML = `
            <div style="margin-bottom: 1.5rem;">
                <span class="project-role-badge" style="display: inline-block; margin-bottom: 0.75rem;">${data.role}</span>
                <h2 style="font-size: 1.6rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.75rem; letter-spacing: -0.02em;">${data.title}</h2>
                <div style="display: flex; flex-wrap: wrap; gap: 0.45rem; margin-bottom: 1.25rem;">
                    ${techPills}
                </div>
            </div>
            
            <div style="margin-bottom: 1.5rem;">
                <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary); text-transform: uppercase; letter-spacing: 0.05em; font-family: var(--font-mono); margin-bottom: 0.5rem; color: var(--accent);">Architectural Overview</h4>
                <p style="font-size: 0.95rem; color: var(--text-secondary); line-height: 1.7;">${data.overview}</p>
            </div>

            <div>
                <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary); text-transform: uppercase; letter-spacing: 0.05em; font-family: var(--font-mono); margin-bottom: 0.75rem; color: var(--accent);">Key Engineering Contributions</h4>
                <ul class="project-bullets">
                    ${bullets}
                </ul>
            </div>
        `;

        modalBackdrop.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modalBackdrop.classList.remove('open');
        document.body.style.overflow = '';
    }

    triggerButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const projectId = btn.getAttribute('data-project');
            openModal(projectId);
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
