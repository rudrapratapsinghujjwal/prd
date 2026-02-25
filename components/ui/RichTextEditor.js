export class RichTextEditor {
    constructor({ initialValue = '', onUpdate = () => { }, placeholder = 'Start typing...' }) {
        this.value = initialValue;
        this.onUpdate = onUpdate;
        this.placeholder = placeholder;
        this.id = 'rte-' + Math.random().toString(36).substr(2, 9);
    }

    render() {
        // Create container wrapper
        const container = document.createElement('div');
        container.className = 'rte-container';

        // Toolbar
        const toolbar = document.createElement('div');
        toolbar.className = 'rte-toolbar';
        toolbar.innerHTML = `
            <button type="button" class="rte-btn" data-cmd="bold" title="Bold"><i class="fas fa-bold"></i></button>
            <button type="button" class="rte-btn" data-cmd="italic" title="Italic"><i class="fas fa-italic"></i></button>
            <span class="rte-separator"></span>
            <button type="button" class="rte-btn" data-cmd="formatBlock" data-val="H3" title="Heading"><i class="fas fa-heading"></i></button>
            <button type="button" class="rte-btn" data-cmd="formatBlock" data-val="P" title="Paragraph"><i class="fas fa-paragraph"></i></button>
             <span class="rte-separator"></span>
            <button type="button" class="rte-btn" data-cmd="insertUnorderedList" title="Bullet List"><i class="fas fa-list-ul"></i></button>
            <button type="button" class="rte-btn" data-cmd="insertOrderedList" title="Numbered List"><i class="fas fa-list-ol"></i></button>
        `;

        // Editor Content
        const editor = document.createElement('div');
        editor.className = 'rte-editor form-textarea';
        editor.contentEditable = true;
        editor.id = this.id;
        editor.innerHTML = this.value || `<p><br></p>`; // Default logical start

        // Placeholder logic (CSS based mostly, but ensures content isnt empty)
        if (!this.value) {
            editor.classList.add('empty');
        }

        // Event Listeners for Toolbar
        toolbar.addEventListener('click', (e) => {
            const btn = e.target.closest('.rte-btn');
            if (btn) {
                e.preventDefault();
                const cmd = btn.dataset.cmd;
                const val = btn.dataset.val || null;
                document.execCommand(cmd, false, val);
                editor.focus();
                this.handleInput(editor); // Trigger update immediately on format change
            }
        });

        // Event Listeners for Editor
        editor.addEventListener('input', () => this.handleInput(editor));
        editor.addEventListener('blur', () => this.handleInput(editor));
        editor.addEventListener('focus', () => {
            if (editor.innerHTML === '<p><br></p>') {
                // editor.innerHTML = ''; 
            }
        });

        container.appendChild(toolbar);
        container.appendChild(editor);
        return container;
    }

    handleInput(editor) {
        this.value = editor.innerHTML;
        this.onUpdate(this.value);
    }
}
