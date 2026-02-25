import { storage } from '../modules/storage.js';
import { formatDate } from '../modules/utils.js';

export class PRDViewer {
    constructor(id) {
        this.id = id;
    }

    async render(container) {
        try {
            this.prd = await storage.get(this.id);
            if (!this.prd) {
                container.innerHTML = `<div class="error">PRD not found</div>`;
                return;
            }
        } catch (e) {
            console.error("Error loading PRD", e);
            container.innerHTML = `<div class="error">Error loading PRD</div>`;
            return;
        }

        container.innerHTML = `
            <div class="viewer-layout">
                <div class="flex justify-between items-center mb-6 no-print">
                    <a href="#/" class="btn btn-secondary">
                        <i class="fas fa-arrow-left"></i> Dashboard
                    </a>
                    <div class="flex gap-2">
                         <a href="#/tracker/${this.prd.id}" class="btn btn-secondary">
                            <i class="fas fa-tasks"></i> Tracker
                        </a>
                        <a href="#/edit/${this.prd.id}" class="btn btn-primary">
                            <i class="fas fa-edit"></i> Edit
                        </a>
                        <button class="btn btn-secondary" onclick="window.exportJSON()">
                            <i class="fas fa-download"></i> Export JSON
                        </button>
                        <button class="btn btn-accent" onclick="window.print()">
                            <i class="fas fa-file-pdf"></i> PDF
                        </button>
                    </div>
                </div>

                <div class="document-container">
                    <header class="doc-header">
                        ${this.prd.coverImage ? `<img src="${this.prd.coverImage}" class="doc-cover-image" alt="Cover Image">` : ''}
                        
                        <div class="flex justify-between items-start">
                             <h1 class="doc-title">${this.prd.title || 'Untitled PRD'}</h1>
                             <span class="badge ${this.prd.status}" style="font-size: 1rem; padding: 6px 12px; border-radius: 4px; background: var(--bg-app); border: 1px solid var(--border-color);">${this.prd.status || 'Draft'}</span>
                        </div>
                        <div class="doc-meta">
                            <span>Last Updated: ${formatDate(this.prd.updatedAt)}</span>
                            <span>ID: ${this.prd.id.substring(0, 8)}...</span>
                        </div>
                    </header>

                    <div class="doc-content-body">
                        ${this.renderSection('What is it?', this.prd.sections.what)}
                        ${this.renderSection('Why are we building this?', this.prd.sections.why)}
                        
                        ${this.renderSuccessCriteria(this.prd.sections.successCriteria)}
                        
                        ${this.renderTeam(this.prd.sections.team)}
                        
                        ${this.renderMilestones(this.prd.sections.milestones)}
                        
                        ${this.renderSection('Product Specifications', this.prd.sections.productSpec)}
                        ${this.renderSection('Design Exploration', this.prd.sections.designExploration)}
                        ${this.prd.sections.designImage ?
                `<div class="doc-section">
                                <h2>Mockups</h2>
                                <img src="${this.prd.sections.designImage}" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" alt="Design Mockup">
                             </div>` : ''}
                    </div>

                    ${this.renderHistory(this.prd.versions)}
                </div>
            </div>
        `;

        window.restoreVersion = async (versionId) => {
            if (confirm("Are you sure you want to restore this version? Current unsaved changes might be lost (though they should be saved to draft). This will overwrite the current PRD content.")) {
                const version = this.prd.versions.find(v => v.id === versionId);
                if (version) {
                    // Restore data but keep the same ID and maybe updated timestamp?
                    // Actually we want to revert to that state.
                    const restoredData = JSON.parse(JSON.stringify(version.data));
                    restoredData.updatedAt = new Date().toISOString();
                    // Keep the version history!
                    restoredData.versions = this.prd.versions;

                    try {
                        await storage.save(restoredData);
                        alert("Version restored successfully.");
                        window.location.reload();
                    } catch (e) {
                        console.error(e);
                        alert("Failed to restore version.");
                    }
                }
            }
        };
    }

    renderHistory(versions) {
        if (!versions || versions.length === 0) return '';
        return `
            <div class="doc-section mt-8 pt-8 border-t" style="border-color: var(--border-color);">
                <h2 class="text-lg font-semibold mb-4">Version History</h2>
                <ul class="version-list">
                    ${versions.slice().reverse().map(v => `
                        <li class="flex justify-between items-center py-2 border-b" style="border-color: var(--border-color);">
                            <div>
                                <span class="font-medium">${v.label}</span>
                                <span class="text-sm text-muted ml-2">${formatDate(v.timestamp)}</span>
                            </div>
                            <button class="btn btn-secondary btn-sm" onclick="window.restoreVersion('${v.id}')">Restore</button>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }

    renderSection(title, content) {
        if (!content) return '';
        return `
            <section class="doc-section">
                <h2>${title}</h2>
                <div class="doc-content">${content}</div>
            </section>
        `;
    }

    renderSuccessCriteria(criteria) {
        if (!criteria || criteria.length === 0) return '';
        return `
            <section class="doc-section">
                <h2>Success Criteria</h2>
                <table class="doc-table">
                    <thead>
                        <tr>
                            <th>Metric</th>
                            <th>Target</th>
                            <th>Priority</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${criteria.map(c => `
                            <tr>
                                <td>${c.metric}</td>
                                <td>${c.target}</td>
                                <td>${c.priority}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </section>
        `;
    }

    renderTeam(team) {
        if (!team || team.length === 0) return '';
        return `
            <section class="doc-section">
                <h2>Team</h2>
                <ul style="list-style: disc; padding-left: 20px;">
                    ${team.map(t => `<li class="doc-content">${t}</li>`).join('')}
                </ul>
            </section>
        `;
    }

    renderMilestones(milestones) {
        if (!milestones || milestones.length === 0) return '';
        return `
            <section class="doc-section">
                <h2>Milestones</h2>
                <table class="doc-table">
                    <thead>
                        <tr>
                            <th>Milestone</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${milestones.map(m => `
                            <tr>
                                <td>${m.name}</td>
                                <td>${m.date}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </section>
        `;
    }
}

