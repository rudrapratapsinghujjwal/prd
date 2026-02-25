import { storage } from '../modules/storage.js';
import { generateId, debounce } from '../modules/utils.js';
import { RichTextEditor } from './ui/RichTextEditor.js';
import { TEMPLATES } from '../modules/templates.js';
import { AIHelper } from '../modules/ai-helper.js';

export class PRDEditor {
    constructor(id = null) {
        this.id = id;
        this.currentStep = 0;

        // Check for template in hash params (simple parsing)
        const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
        const templateKey = urlParams.get('template');
        const template = TEMPLATES[templateKey] || TEMPLATES.empty;

        this.prd = {
            id: id || generateId(),
            title: templateKey && templateKey !== 'empty' ? `${template.name} - Untitled` : '',
            status: 'draft',
            sections: {
                what: template.sections.what || '',
                why: template.sections.why || '',
                successCriteria: template.sections.successCriteria || [],
                team: [],
                milestones: [],
                productSpec: template.sections.productSpec || '',
                designExploration: template.sections.designExploration || ''
            },
            updatedAt: new Date().toISOString()
        };

        this.steps = [
            { key: 'basics', label: 'Basics & What' },
            { key: 'why', label: 'Why?' },
            { key: 'success', label: 'Success Criteria' },
            { key: 'team', label: 'Team' },
            { key: 'milestones', label: 'Milestones' },
            { key: 'specs', label: 'Product Specs' },
            { key: 'design', label: 'Design Exploration' }
        ];

        this.debouncedSave = debounce(() => this.save(), 1000);
    }

    async render(container) {
        // Load existing data if editing
        if (this.id) {
            try {
                const existing = await storage.get(this.id);
                if (existing) {
                    this.prd = existing;
                }
            } catch (e) {
                console.error("Failed to load PRD", e);
            }
        }

        this.container = container;
        this.renderLayout();
    }

    renderLayout() {
        this.container.innerHTML = `
            <div class="editor-container">
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h1 class="text-xl font-bold">${this.id ? 'Edit PRD' : 'Create New PRD'}</h1>
                        <span id="save-status" class="text-sm text-muted">All changes saved locally</span>
                    </div>
                    <div class="flex gap-2">
                        <button id="snapshot-btn" class="btn btn-secondary" title="Save a version snapshot"><i class="fas fa-history"></i> Snapshot</button>
                        <a href="#/view/${this.prd.id}" class="btn btn-secondary">Preview</a>
                        <button id="save-btn" class="btn btn-primary">Save & Exit</button>
                    </div>
                </div>

                <div class="editor-layout">
                    <nav class="editor-sidebar">
                        <ul class="step-indicator">
                            ${this.steps.map((step, index) => `
                                <li class="step-item ${index === this.currentStep ? 'active' : ''} ${index < this.currentStep ? 'completed' : ''}" 
                                    data-step="${index}">
                                    ${step.label}
                                </li>
                            `).join('')}
                        </ul>
                    </nav>

                    <div class="editor-main card">
                        ${this.renderCurrentStep()}
                        
                        <div class="flex justify-between mt-8 pt-4 border-t" style="border-color: var(--border-color);">
                            <button class="btn btn-secondary ${this.currentStep === 0 ? 'hidden' : ''}" id="prev-btn">Previous</button>
                            ${this.currentStep < this.steps.length - 1
                ? `<button class="btn btn-primary" id="next-btn">Next</button>`
                : `<button class="btn btn-accent" id="finish-btn">Finish</button>`}
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.mountRTEs();
        this.attachEventListeners();
    }

    mountRTEs() {
        const step = this.steps[this.currentStep];
        const maps = {
            'basics': 'what',
            'why': 'why',
            'specs': 'productSpec',
            'design': 'designExploration'
        };

        const sectionKey = maps[step.key];
        if (sectionKey) {
            const container = document.getElementById(`rte-${step.key === 'specs' ? 'specs' : step.key === 'design' ? 'design' : sectionKey}`);
            // Fix key mapping for IDs
            // IDs in renderCurrentStep: rte-what, rte-why, rte-specs, rte-design
            // Section keys: what, why, productSpec, designExploration

            let targetId = '';
            if (step.key === 'basics') targetId = 'rte-what';
            else if (step.key === 'why') targetId = 'rte-why';
            else if (step.key === 'specs') targetId = 'rte-specs';
            else if (step.key === 'design') targetId = 'rte-design';

            const targetContainer = document.getElementById(targetId);

            if (targetContainer) {
                targetContainer.innerHTML = ''; // Clear
                const rte = new RichTextEditor({
                    initialValue: this.prd.sections[sectionKey] || '',
                    onUpdate: (val) => {
                        this.prd.sections[sectionKey] = val;
                        this.triggerAutoSave();
                    }
                });
                targetContainer.appendChild(rte.render());
            }
        }
    }

    renderCurrentStep() {
        const step = this.steps[this.currentStep];

        switch (step.key) {
            case 'basics':
                return `
                    <div class="form-group">
                        <label class="form-label">PRD Title</label>
                        <input type="text" class="form-input text-lg font-bold" value="${this.prd.title}" 
                               oninput="window.updateField('title', this.value)" placeholder="e.g. New User Onboarding Flow">
                    </div>
                    <div class="form-group">
                         <label class="form-label">Status</label>
                         <select class="form-input" onchange="window.updateField('status', this.value)">
                            <option value="draft" ${this.prd.status === 'draft' ? 'selected' : ''}>Draft</option>
                            <option value="in_progress" ${this.prd.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                            <option value="completed" ${this.prd.status === 'completed' ? 'selected' : ''}>Completed</option>
                         </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Cover Image</label>
                        <input type="file" accept="image/*" class="form-input" onchange="window.handleImageUpload(this.files[0], 'coverImage')">
                        <div id="coverImage-preview" class="img-preview-container">
                             ${this.prd.coverImage ? `<img src="${this.prd.coverImage}" alt="Cover Preview">` : '<div class="img-placeholder">No image selected <br> <i class="fas fa-image fa-2x mt-2 opacity-50"></i></div>'}
                        </div>
                    </div>
                    <div class="form-group">
                        <div class="flex justify-between items-center mb-2">
                           <label class="form-label mb-0">What is it?</label>
                           <button class="btn btn-sm btn-accent" onclick="window.generateAI('what')"><i class="fas fa-magic"></i> AI Assist</button>
                        </div>
                        <p class="text-sm text-muted mb-2">High-level description of the feature or product.</p>
                        <div id="rte-what"></div>
                    </div>
                `;
            case 'why':
                return `
                    <div class="form-group">
                        <div class="flex justify-between items-center mb-2">
                            <label class="form-label mb-0">Why are we building this?</label>
                            <button class="btn btn-sm btn-accent" onclick="window.generateAI('why')"><i class="fas fa-magic"></i> AI Assist</button>
                        </div>
                        <p class="text-sm text-muted mb-2">The problem statement, user value, and business impact.</p>
                        <div id="rte-why"></div>
                    </div>
                `;
            case 'success':
                return `
                    <div class="form-group">
                        <div class="flex justify-between items-center mb-4">
                            <div>
                                <label class="form-label">Success Criteria</label>
                                <p class="text-sm text-muted">Key metrics to measure success.</p>
                            </div>
                             <button class="btn btn-sm btn-accent" onclick="window.generateAIMetrics()"><i class="fas fa-magic"></i> Suggest Metrics</button>
                        </div>
                        <table class="dynamic-table" id="success-table">
                            <thead>
                                <tr>
                                    <th>Metric</th>
                                    <th>Target</th>
                                    <th>Priority</th>
                                    <th style="width: 50px;"></th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(this.prd.sections.successCriteria || []).map((item, idx) => `
                                    <tr>
                                        <td><input type="text" class="form-input" value="${item.metric}" onchange="window.updateArrayItem('successCriteria', ${idx}, 'metric', this.value)"></td>
                                        <td><input type="text" class="form-input" value="${item.target}" onchange="window.updateArrayItem('successCriteria', ${idx}, 'target', this.value)"></td>
                                        <td>
                                            <select class="form-input" onchange="window.updateArrayItem('successCriteria', ${idx}, 'priority', this.value)">
                                                <option value="P0" ${item.priority === 'P0' ? 'selected' : ''}>P0 (Must)</option>
                                                <option value="P1" ${item.priority === 'P1' ? 'selected' : ''}>P1 (Should)</option>
                                                <option value="P2" ${item.priority === 'P2' ? 'selected' : ''}>P2 (Nice)</option>
                                            </select>
                                        </td>
                                        <td><button class="icon-btn delete" onclick="window.removeArrayItem('successCriteria', ${idx})"><i class="fas fa-trash"></i></button></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        <button class="btn btn-secondary btn-sm" onclick="window.addArrayItem('successCriteria', {metric: '', target: '', priority: 'P1'})">
                            <i class="fas fa-plus"></i> Add Criterion
                        </button>
                    </div>
                `;
            case 'team':
                return `
                     <div class="form-group">
                        <label class="form-label">Team Members</label>
                        <ul id="team-list" style="list-style: none; padding: 0;">
                            ${(this.prd.sections.team || []).map((member, idx) => `
                                <li class="flex gap-2 mb-2">
                                    <input type="text" class="form-input" value="${member}" placeholder="Name / Role" onchange="window.updateSimpleArrayItem('team', ${idx}, this.value)">
                                    <button class="btn btn-danger" style="padding: 0 12px;" onclick="window.removeSimpleArrayItem('team', ${idx})"><i class="fas fa-trash"></i></button>
                                </li>
                            `).join('')}
                        </ul>
                         <button class="btn btn-secondary btn-sm" onclick="window.addSimpleArrayItem('team', '')">
                            <i class="fas fa-plus"></i> Add Team Member
                        </button>
                    </div>
                `;
            case 'milestones':
                return `
                    <div class="form-group">
                        <label class="form-label">Milestones & Timeline</label>
                         <table class="dynamic-table" id="milestones-table">
                            <thead>
                                <tr>
                                    <th>Milestone Name</th>
                                    <th>Target Date</th>
                                    <th style="width: 50px;"></th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(this.prd.sections.milestones || []).map((item, idx) => `
                                    <tr>
                                        <td><input type="text" class="form-input" value="${item.name}" onchange="window.updateArrayItem('milestones', ${idx}, 'name', this.value)"></td>
                                        <td><input type="date" class="form-input" value="${item.date}" onchange="window.updateArrayItem('milestones', ${idx}, 'date', this.value)"></td>
                                        <td><button class="icon-btn delete" onclick="window.removeArrayItem('milestones', ${idx})"><i class="fas fa-trash"></i></button></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                         <button class="btn btn-secondary btn-sm" onclick="window.addArrayItem('milestones', {name: '', date: ''})">
                            <i class="fas fa-plus"></i> Add Milestone
                        </button>
                    </div>
                `;
            case 'specs':
                return `
                    <div class="form-group">
                        <div class="flex justify-between items-center mb-2">
                           <label class="form-label mb-0">Product Specifications</label>
                           <button class="btn btn-sm btn-accent" onclick="window.generateAI('productSpec')"><i class="fas fa-magic"></i> AI Assist</button>
                        </div>
                        <p class="text-sm text-muted mb-2">Detailed functional requirements, user stories, and acceptance criteria.</p>
                        <div id="rte-specs"></div>
                    </div>
                `;
            case 'design':
                return `
                    <div class="form-group">
                        <div class="flex justify-between items-center mb-2">
                            <label class="form-label mb-0">Design Exploration</label>
                            <button class="btn btn-sm btn-accent" onclick="window.generateAI('designExploration')"><i class="fas fa-magic"></i> AI Assist</button>
                        </div>
                        <p class="text-sm text-muted mb-2">Links to Figma, screenshots, or design notes.</p>
                        <div id="rte-design"></div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Design Mockups / Screenshots</label>
                         <input type="file" accept="image/*" class="form-input" onchange="window.handleImageUpload(this.files[0], 'designImage', true)">
                         <div id="designImage-preview" class="img-preview-container">
                             ${this.prd.sections.designImage ? `<img src="${this.prd.sections.designImage}" alt="Design Preview">` : '<div class="img-placeholder">No image selected <br> <i class="fas fa-image fa-2x mt-2 opacity-50"></i></div>'}
                        </div>
                    </div>
                `;
            default:
                return `<div class="error">Unknown step</div>`;
        }
    }

    attachEventListeners() {
        // Step Navigation
        this.container.querySelectorAll('.step-item').forEach(el => {
            el.addEventListener('click', () => {
                const step = parseInt(el.dataset.step);
                this.goToStep(step);
            });
        });

        const prevBtn = document.getElementById('prev-btn');
        if (prevBtn) prevBtn.addEventListener('click', () => this.goToStep(this.currentStep - 1));

        const nextBtn = document.getElementById('next-btn');
        if (nextBtn) nextBtn.addEventListener('click', () => this.goToStep(this.currentStep + 1));

        const finishBtn = document.getElementById('finish-btn');
        if (finishBtn) finishBtn.addEventListener('click', () => {
            this.save().then(() => {
                window.location.hash = `/ view / ${this.prd.id} `;
            });
        });

        const saveBtn = document.getElementById('save-btn');
        if (saveBtn) saveBtn.addEventListener('click', () => {
            this.save().then(() => {
                window.location.hash = '/';
            });
        });

        const snapshotBtn = document.getElementById('snapshot-btn');
        if (snapshotBtn) snapshotBtn.addEventListener('click', async () => {
            const versionLabel = prompt("Enter a label for this version (e.g. 'v1.0' or 'Initial Draft'):");
            if (versionLabel) {
                if (!this.prd.versions) this.prd.versions = [];
                this.prd.versions.push({
                    id: generateId(),
                    label: versionLabel,
                    timestamp: new Date().toISOString(),
                    data: JSON.parse(JSON.stringify(this.prd)) // Deep copy
                });
                await this.save();
                alert("Version snapshot saved!");
                this.renderLayout(); // Re-render to show new status or just stay
            }
        });

        // Expose helpers for inline event handlers
        window.updateField = (field, value) => {
            this.prd[field] = value;
            this.triggerAutoSave();
        };

        window.updateSection = (section, value) => {
            this.prd.sections[section] = value;
            this.triggerAutoSave();
        };

        window.handleImageUpload = (file, targetField, isSection = false) => {
            if (!file) return;

            // Limit size to avoid IDB quota (e.g., 2MB)
            if (file.size > 2 * 1024 * 1024) {
                alert("Image too large. Please use an image under 2MB.");
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const base64 = e.target.result;
                if (isSection) {
                    this.prd.sections[targetField] = base64;
                    // Update preview
                    const preview = document.getElementById(`${targetField}-preview`);
                    if (preview) {
                        preview.innerHTML = `<img src="${base64}" alt="Preview">`;
                    }
                } else {
                    this.prd[targetField] = base64;
                    const preview = document.getElementById(`${targetField}-preview`);
                    if (preview) {
                        preview.innerHTML = `<img src="${base64}" alt="Preview">`;
                    }
                }
                this.triggerAutoSave();
            };
            reader.readAsDataURL(file);
        };

        window.updateArrayItem = (section, index, key, value) => {
            if (!this.prd.sections[section][index]) return;
            this.prd.sections[section][index][key] = value;
            this.triggerAutoSave();
        };

        window.removeArrayItem = (section, index) => {
            this.prd.sections[section].splice(index, 1);
            this.renderLayout(); // Re-render to update index data attributes
            this.triggerAutoSave();
        };

        window.addArrayItem = (section, defaultItem) => {
            if (!this.prd.sections[section]) this.prd.sections[section] = [];
            this.prd.sections[section].push(defaultItem);
            this.renderLayout();
            this.triggerAutoSave();
        };

        window.updateSimpleArrayItem = (section, index, value) => {
            this.prd.sections[section][index] = value;
            this.triggerAutoSave();
        };

        window.removeSimpleArrayItem = (section, index) => {
            this.prd.sections[section].splice(index, 1);
            this.renderLayout();
            this.triggerAutoSave();
        };

        window.addSimpleArrayItem = (section, value) => {
            if (!this.prd.sections[section]) this.prd.sections[section] = [];
            this.prd.sections[section].push(value);
            this.renderLayout();
            this.triggerAutoSave();
        };

        window.generateAI = (section) => {
            const suggestion = AIHelper.generateSuggestions(section, { title: this.prd.title });
            // If Text Area / RTE, we append or replace. 
            // Since we use RTEs, we need to update the instance data and re-render or insert.
            // Simplified: Update data and re-render.
            const currentContent = this.prd.sections[section] || '';
            const newContent = currentContent + suggestion;
            window.updateSection(section, newContent);

            // Re-render only if needed, but for RTE we generally need to re-mount or update value.
            // Our mountRTEs uses initialValue. So re-renderLayout works but is heavy.
            // Better: update the RTE instance if possible.
            // For now, simple re-render.
            this.renderLayout();
        };

        window.generateAIMetrics = () => {
            const metrics = AIHelper.getSuccessMetrics();
            if (!this.prd.sections.successCriteria) this.prd.sections.successCriteria = [];
            this.prd.sections.successCriteria.push(...metrics);
            this.renderLayout();
            this.triggerAutoSave();
        };
    }

    goToStep(index) {
        if (index >= 0 && index < this.steps.length) {
            this.currentStep = index;
            this.renderLayout();
        }
    }

    triggerAutoSave() {
        document.getElementById('save-status').textContent = 'Saving...';
        this.debouncedSave();
    }

    async save() {
        try {
            await storage.save(this.prd);
            const statusEl = document.getElementById('save-status');
            if (statusEl) statusEl.textContent = 'All changes saved locally';
        } catch (e) {
            console.error("Save failed", e);
            const statusEl = document.getElementById('save-status');
            if (statusEl) statusEl.textContent = 'Error saving changes';
        }
    }
}

