export class Modal {
    private static overlay: HTMLElement | null = null;
    private static title: HTMLElement | null = null;
    private static body: HTMLElement | null = null;
    private static confirmBtn: HTMLElement | null = null;
    private static cancelBtn: HTMLElement | null = null;
    private static resolvePromise: ((value: boolean) => void) | null = null;
    private static type: 'success' | 'error' | 'warning' | 'info' = 'info';

    private static getIcon(type: string): string {
        switch (type) {
            case 'success':
                return `<div class="modal-icon modal-icon-success"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>`;
            case 'error':
                return `<div class="modal-icon modal-icon-error"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div>`;
            case 'warning':
                return `<div class="modal-icon modal-icon-warning"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>`;
            default:
                return `<div class="modal-icon modal-icon-info"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg></div>`;
        }
    }

    private static init(type: 'success' | 'error' | 'warning' | 'info' = 'info') {
        if (this.overlay) {
            this.overlay.remove(); // Re-create to update icon/structure if needed
            this.overlay = null;
        }

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay-animated';
        overlay.innerHTML = `
            <div class="modal-content-animated modal-${type}">
                <div class="modal-header-centered">
                    ${this.getIcon(type)}
                    <h3 id="modal-title"></h3>
                </div>
                <div class="modal-body">
                    <div id="modal-body"></div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="modal-cancel">Скасувати</button>
                    <button class="btn btn-primary" id="modal-confirm">ОК</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        this.overlay = overlay;
        this.title = overlay.querySelector('#modal-title');
        this.body = overlay.querySelector('#modal-body');
        this.confirmBtn = overlay.querySelector('#modal-confirm');
        this.cancelBtn = overlay.querySelector('#modal-cancel');

        this.confirmBtn?.addEventListener('click', () => this.close(true));
        this.cancelBtn?.addEventListener('click', () => this.close(false));
        
        // Close on click outside
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close(false);
            }
        });
    }

    static confirm(message: string, title: string = 'Підтвердження', type: 'warning' | 'info' = 'warning'): Promise<boolean> {
        this.init(type);
        
        if (this.title) this.title.textContent = title;
        if (this.body) this.body.innerHTML = message;
        
        if (this.cancelBtn) {
            this.cancelBtn.style.display = '';
            this.cancelBtn.textContent = 'Ні, скасувати';
        }
        if (this.confirmBtn) {
            this.confirmBtn.textContent = 'Так, продовжити';
            if (type === 'warning') {
                this.confirmBtn.className = 'btn btn-danger';
            } else {
                this.confirmBtn.className = 'btn btn-primary';
            }
        }
        
        requestAnimationFrame(() => {
            this.overlay?.classList.add('open');
        });

        return new Promise((resolve) => {
            this.resolvePromise = resolve;
        });
    }

    static alert(message: string, title: string = 'Інформація', type: 'success' | 'error' | 'warning' | 'info' = 'info'): Promise<void> {
        // Auto-detect type from title if not provided (simple heuristic)
        if (type === 'info') {
            if (title.toLowerCase().includes('помилка') || title.toLowerCase().includes('error')) type = 'error';
            else if (title.toLowerCase().includes('успіш') || title.toLowerCase().includes('success')) type = 'success';
        }

        this.init(type);

        if (this.title) this.title.textContent = title;
        if (this.body) this.body.innerHTML = message;
        
        if (this.cancelBtn) this.cancelBtn.style.display = 'none';
        if (this.confirmBtn) {
            this.confirmBtn.textContent = 'Зрозуміло';
            this.confirmBtn.className = 'btn btn-primary';
        }

        requestAnimationFrame(() => {
            this.overlay?.classList.add('open');
        });

        return new Promise((resolve) => {
            this.resolvePromise = () => resolve();
        });
    }

    private static close(result: boolean) {
        this.overlay?.classList.remove('open');
        
        // Wait for transition to finish before resolving
        setTimeout(() => {
            if (this.resolvePromise) {
                this.resolvePromise(result);
                this.resolvePromise = null;
            }
        }, 200);
    }
}
