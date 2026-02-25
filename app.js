import { storage } from './modules/storage.js';
import { Router } from './modules/router.js';
import { Dashboard } from './components/Dashboard.js';
import { PRDEditor } from './components/PRDEditor.js';
import { PRDViewer } from './components/PRDViewer.js';
import { Tracker } from './components/Tracker.js';

// Define Routes
const routes = {
    '/': () => renderDashboard(),
    '/create': () => renderEditor(),
    '/edit/:id': (params) => renderEditor(params.id),
    '/view/:id': (params) => renderViewer(params.id),
    '/tracker/:id': (params) => renderTracker(params.id)
};

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await storage.init();
        const router = new Router(routes);

        // Theme initialization
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);

        window.toggleTheme = () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
        };
    } catch (error) {
        console.error("Failed to initialize app:", error);
        document.getElementById('app').innerHTML = `<div class="error">Failed to load application. Please refresh.</div>`;
    }
});

// View Renderers
async function renderDashboard() {
    const dashboard = new Dashboard();
    await dashboard.render(document.getElementById('app'));
}

async function renderEditor(id = null) {
    const editor = new PRDEditor(id);
    await editor.render(document.getElementById('app'));
}

async function renderViewer(id) {
    const viewer = new PRDViewer(id);
    await viewer.render(document.getElementById('app'));
}

async function renderTracker(id) {
    const tracker = new Tracker(id);
    await tracker.render(document.getElementById('app'));
}
