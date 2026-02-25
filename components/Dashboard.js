import { storage } from '../modules/storage.js';

export class Dashboard {
    constructor() {
        this.prds = [];
        this.filter = { search: '', status: 'all' };
    }

    async render(container) {
        container.innerHTML = '<div class="spinner"></div>';

        try {
            this.prds = await storage.getAll();
            this.container = container;
            this.renderLayout();
        } catch (error) {
            console.error(error);
            container.innerHTML = `<div class="error">Error loading dashboard.</div>`;
        }
    }

    renderLayout() {
        const filteredPRDs = this.filterPRDs();

        this.container.innerHTML = `
            <div class="dashboard">
                <div class="header flex justify-between items-center mb-6">
                    <div>
                        <h1 class="text-3xl font-bold mb-2">My PRDs</h1>
                        <p class="text-muted">Manage and track your product requirements.</p>
                    </div>
                    <div class="flex gap-2">
                         <button class="btn btn-secondary" onclick="window.toggleTheme()" title="Toggle Dark/Light Mode">
                            <i class="fas fa-moon"></i>
                        </button>
                        <div class="dropdown" style="position: relative; display: inline-block;">
                            <button class="btn btn-primary" onclick="window.toggleTemplateMenu()">
                                <i class="fas fa-plus"></i> Create New
                            </button>
                            <div id="template-menu" class="hidden" style="position: absolute; right: 0; top: 100%; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: var(--shadow-lg); width: 220px; z-index: 10; margin-top: 8px;">
                                <a href="#/create?template=empty" class="d-block p-3 hover:bg-gray-50 text-dark decoration-none" style="display: block; padding: 12px; color: var(--text-primary); text-decoration: none; border-bottom: 1px solid var(--border-color);">Blank Document</a>
                                <a href="#/create?template=feature" class="d-block p-3 hover:bg-gray-50 text-dark decoration-none" style="display: block; padding: 12px; color: var(--text-primary); text-decoration: none; border-bottom: 1px solid var(--border-color);">New Feature</a>
                                <a href="#/create?template=mvp" class="d-block p-3 hover:bg-gray-50 text-dark decoration-none" style="display: block; padding: 12px; color: var(--text-primary); text-decoration: none; border-bottom: 1px solid var(--border-color);">MVP Launch</a>
                                <a href="#/create?template=bugfix" class="d-block p-3 hover:bg-gray-50 text-dark decoration-none" style="display: block; padding: 12px; color: var(--text-primary); text-decoration: none;">Bug Fix</a>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="filters flex gap-4 mb-6">
                    <input type="text" class="form-input" style="width: 300px;" placeholder="Search PRDs..." 
                           value="${this.filter.search}" oninput="window.updateDashboardSearch(this.value)">
                    
                    <select class="form-input" style="width: 200px;" onchange="window.updateDashboardFilter(this.value)">
                        <option value="all" ${this.filter.status === 'all' ? 'selected' : ''}>All Status</option>
                        <option value="draft" ${this.filter.status === 'draft' ? 'selected' : ''}>Draft</option>
                        <option value="in_progress" ${this.filter.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                        <option value="completed" ${this.filter.status === 'completed' ? 'selected' : ''}>Completed</option>
                    </select>
                </div>
                
                ${filteredPRDs.length === 0 ? this.renderEmptyState() : this.renderGrid(filteredPRDs)}
            </div>
        `;

        this.attachEvents();
    }

    attachEvents() {
        window.toggleTemplateMenu = () => {
            const menu = document.getElementById('template-menu');
            if (menu) menu.classList.toggle('hidden');
        };

        // Close menu when clicking outside - ensure only one listener
        if (!window.templateMenuListenerAdded) {
            document.addEventListener('click', (e) => {
                const menu = document.getElementById('template-menu');
                const btn = e.target.closest('button');
                // Check if click is inside menu or on the button
                const isClickInside = menu && (menu.contains(e.target) || (btn && btn.getAttribute('onclick') === 'window.toggleTemplateMenu()'));

                if (menu && !menu.classList.contains('hidden') && !isClickInside) {
                    menu.classList.add('hidden');
                }
            });
            window.templateMenuListenerAdded = true;
        }

        window.updateDashboardSearch = (val) => {
            this.filter.search = val.toLowerCase();
            this.renderLayout();
            // Restore focus
            const input = document.querySelector('input[placeholder="Search PRDs..."]');
            if (input) {
                input.focus();
                input.setSelectionRange(input.value.length, input.value.length);
            }
        };

        window.updateDashboardFilter = (val) => {
            this.filter.status = val;
            this.renderLayout();
        };
    }

    filterPRDs() {
        return this.prds.filter(prd => {
            const matchesSearch = (prd.title || '').toLowerCase().includes(this.filter.search);
            const matchesStatus = this.filter.status === 'all' || prd.status === this.filter.status;
            return matchesSearch && matchesStatus;
        });
    }

    renderEmptyState() {
        const isFilterActive = this.filter.search || this.filter.status !== 'all';
        return `
            <div class="empty-state card" style="text-align: center; padding: 48px;">
                <h3 class="mb-4">${isFilterActive ? 'No matching PRDs found' : 'No PRDs yet'}</h3>
                <p>${isFilterActive ? 'Try adjusting your search or filters.' : 'Create your first Product Requirement Document to get started.'}</p>
                ${!isFilterActive ? `<a href="#/create" class="btn btn-primary mt-4">Create New</a>` : ''}
            </div>
        `;
    }

    renderGrid(prds) {
        return `
            <div class="prd-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px;">
                ${prds.map(prd => this.renderCard(prd)).join('')}
            </div>
        `;
    }

    renderCard(prd) {
        let statusClass = prd.status || 'draft';
        let statusLabel = (prd.status || 'Draft').replace('_', ' ');
        if (statusLabel === 'in progress') statusLabel = 'In Progress';

        // Capitalize
        statusLabel = statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1);

        return `
            <div class="card">
                <div class="flex justify-between items-start mb-4">
                    <h3 class="text-lg font-semibold"><a href="#/view/${prd.id}" style="text-decoration: none; color: inherit;">${prd.title || 'Untitled PRD'}</a></h3>
                    <span class="badge ${statusClass}">${statusLabel}</span>
                </div>
                <p class="text-sm text-muted mb-4">Last updated: ${new Date(prd.updatedAt).toLocaleDateString()}</p>
                <div class="flex justify-between">
                    <a href="#/edit/${prd.id}" class="btn btn-secondary btn-sm">Edit</a>
                    <a href="#/view/${prd.id}" class="btn btn-secondary btn-sm">View</a>
                </div>
            </div>
        `;
    }
}
