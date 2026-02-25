import { storage } from '../modules/storage.js';
import { generateId } from '../modules/utils.js';

export class Tracker {
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
            if (!this.prd.tasks) {
                this.prd.tasks = [];
                // Auto-generate some tasks from milestones if empty
                if (this.prd.sections.milestones && this.prd.sections.milestones.length > 0) {
                    this.prd.tasks = this.prd.sections.milestones.map(m => ({
                        id: generateId(),
                        text: `Complete milestone: ${m.name}`,
                        completed: false
                    }));
                    await storage.save(this.prd);
                }
            }
        } catch (e) {
            console.error("Error loading PRD", e);
            return;
        }

        this.container = container;
        this.renderLayout();
    }

    renderLayout() {
        const completedCount = this.prd.tasks.filter(t => t.completed).length;
        const totalCount = this.prd.tasks.length;
        const percentage = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

        this.container.innerHTML = `
            <div class="tracker-container">
                <div class="flex justify-between items-center mb-6">
                    <a href="#/view/${this.prd.id}" class="btn btn-secondary">
                        <i class="fas fa-arrow-left"></i> Back to PRD
                    </a>
                    <h1 class="text-xl font-bold">Execution Tracker</h1>
                    <div style="width: 100px;"></div> <!-- Spacer -->
                </div>

                <div class="card">
                     <h2 class="text-lg font-semibold mb-2">${this.prd.title}</h2>
                     <div class="flex justify-between items-center mb-2">
                        <span>Progress</span>
                        <span class="font-bold">${percentage}%</span>
                     </div>
                     <div class="progress-bar mb-6">
                        <div class="progress-fill" style="width: ${percentage}%"></div>
                     </div>

                     <div class="flex gap-2 mb-4">
                        <input type="text" id="new-task-input" class="form-input" placeholder="Add a new task...">
                        <button id="add-task-btn" class="btn btn-primary">Add</button>
                     </div>

                     <ul class="task-list" id="task-list">
                        ${this.prd.tasks.map(task => `
                            <li class="task-item ${task.completed ? 'completed' : ''}">
                                <input type="checkbox" class="task-checkbox" 
                                       onchange="window.toggleTask('${task.id}')" 
                                       ${task.completed ? 'checked' : ''}>
                                <span class="task-text">${task.text}</span>
                                <button class="icon-btn delete" onclick="window.deleteTask('${task.id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </li>
                        `).join('')}
                     </ul>
                </div>
            </div>
        `;

        this.attachEventListeners();
    }

    attachEventListeners() {
        const input = document.getElementById('new-task-input');
        const addBtn = document.getElementById('add-task-btn');

        const addTask = async () => {
            const text = input.value.trim();
            if (!text) return;

            this.prd.tasks.push({
                id: generateId(),
                text: text,
                completed: false
            });

            await this.save();
            this.renderLayout(); // Re-render
            document.getElementById('new-task-input').focus();
        };

        addBtn.addEventListener('click', addTask);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addTask();
        });

        // Global handlers
        window.toggleTask = async (id) => {
            const task = this.prd.tasks.find(t => t.id === id);
            if (task) {
                task.completed = !task.completed;
                await this.save();
                this.renderLayout();
            }
        };

        window.deleteTask = async (id) => {
            this.prd.tasks = this.prd.tasks.filter(t => t.id !== id);
            await this.save();
            this.renderLayout();
        };
    }

    async save() {
        try {
            await storage.save(this.prd);
        } catch (e) {
            console.error("Save failed", e);
        }
    }
}
