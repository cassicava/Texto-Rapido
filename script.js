let texts = JSON.parse(localStorage.getItem('ubs-historico')) || [
    { id: 1, title: 'Alergias', text: 'Nega alergia a medicamentos. Nega comorbidades prévias.', color: '#007AFF' },
    { id: 2, title: 'Atestado Médico', text: 'Paciente compareceu à unidade de saúde, necessita de 1 dia de repouso.', color: '#FF99C8' },
    { id: 3, title: 'Encaminhamento', text: 'Solicito avaliação com especialista para seguimento do quadro.', color: '#FFD166' }
];

let isEditMode = false;
let editingId = null;
let selectedColor = '#007AFF';
let deleteTargetId = null;

const cardList = document.getElementById('card-list');
const modal = document.getElementById('modal');
const confirmModal = document.getElementById('confirm-modal');
const screenFlash = document.getElementById('screen-flash');

const wrapCreate = document.getElementById('wrap-create');
const wrapEdit = document.getElementById('wrap-edit');
const btnEdit = document.getElementById('btn-edit');

function saveTexts() { 
    localStorage.setItem('ubs-historico', JSON.stringify(texts)); 
}

function attachGlow(element) {
    element.addEventListener('mousemove', e => {
        const rect = element.getBoundingClientRect();
        element.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
        element.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
    });
}

document.querySelectorAll('.glow-wrapper').forEach(attachGlow);

/* --- Primeira Letra Maiúscula nos Inputs --- */
function setupAutoCapitalize(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.addEventListener('input', () => {
        if (el.value.length > 0) {
            el.value = el.value.charAt(0).toUpperCase() + el.value.slice(1);
        }
    });
}

setupAutoCapitalize('input-title');
setupAutoCapitalize('input-text');

function render(skipEntranceAnimation = false) {
    cardList.innerHTML = '';
    texts.forEach((item, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'glow-wrapper card-wrapper';
        wrapper.style.setProperty('--glow-color', item.color);
        wrapper.dataset.id = item.id;
        
        if (skipEntranceAnimation) {
            wrapper.style.animation = 'none';
            wrapper.style.opacity = '1';
            wrapper.style.transform = 'translateY(0)';
        } else {
            wrapper.style.animationDelay = `${index * 0.04}s`;
        }

        attachGlow(wrapper);

        const inner = document.createElement('div');
        inner.className = 'glow-inner card-content';

        if (!isEditMode) {
            inner.innerHTML = `
                <div class="card-title">${item.title}</div>
                <div class="card-text">${item.text}</div>
            `;
            inner.addEventListener('click', () => {
                navigator.clipboard.writeText(item.text).then(() => triggerCopyFeedback(item.color));
            });
        } else {
            inner.innerHTML = `
                <div class="card-title">${item.title}</div>
                <div class="edit-mode-ui">
                    <div class="edit-actions">
                        <div class="glow-wrapper circle-wrapper" style="--glow-color: #FF3B30">
                            <button class="glow-inner circle-btn" onclick="confirmDelete(${item.id})" title="Excluir">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="22" height="22"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>
                        <div class="glow-wrapper circle-wrapper" style="--glow-color: #007AFF">
                            <button class="glow-inner circle-btn" onclick="openEdit(${item.id})" title="Editar">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="22" height="22"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                            </button>
                        </div>
                    </div>
                    
                    <div class="reorder-actions">
                        <div class="glow-wrapper circle-wrapper" style="--glow-color: #007AFF">
                            <button class="glow-inner arrow-btn" onclick="moveUp(${item.id})" ${index === 0 ? 'disabled' : ''} title="Mover para cima">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" width="20" height="20"><path d="M18 15l-6-6-6 6"/></svg>
                            </button>
                        </div>
                        <div class="glow-wrapper circle-wrapper" style="--glow-color: #007AFF">
                            <button class="glow-inner arrow-btn" onclick="moveDown(${item.id})" ${index === texts.length - 1 ? 'disabled' : ''} title="Mover para baixo">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" width="20" height="20"><path d="M6 9l6 6 6-6"/></svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            inner.querySelectorAll('.glow-wrapper').forEach(attachGlow);
        }

        wrapper.appendChild(inner);
        cardList.appendChild(wrapper);
    });
}

/* --- Reordenação Animada (Técnica FLIP) --- */
function animateSwap(index1, index2) {
    // 1. Posições originais dos cards antes da troca
    const oldPositions = new Map();
    Array.from(cardList.children).forEach(card => {
        if (card.dataset.id) {
            oldPositions.set(card.dataset.id, card.getBoundingClientRect().top);
        }
    });

    // 2. Troca os elementos no array
    const temp = texts[index1];
    texts[index1] = texts[index2];
    texts[index2] = temp;
    saveTexts();

    // 3. Renderiza novamente sem animação de entrada
    render(true);

    // 4. Calcula o deslocamento e aplica o deslize fluido
    Array.from(cardList.children).forEach(card => {
        const id = card.dataset.id;
        const oldTop = oldPositions.get(id);
        if (oldTop !== undefined) {
            const newTop = card.getBoundingClientRect().top;
            const deltaY = oldTop - newTop;

            if (deltaY !== 0) {
                // Move instantaneamente para onde estava
                card.style.animation = 'none';
                card.style.transform = `translateY(${deltaY}px)`;
                card.style.transition = 'none';

                // Força reflow do navegador
                card.offsetHeight;

                // Anima suavemente até a nova posição
                requestAnimationFrame(() => {
                    card.style.transition = 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)';
                    card.style.transform = 'translateY(0)';
                });
            }
        }
    });
}

window.moveUp = function(id) {
    const index = texts.findIndex(t => t.id === id);
    if (index > 0) {
        animateSwap(index, index - 1);
    }
};

window.moveDown = function(id) {
    const index = texts.findIndex(t => t.id === id);
    if (index < texts.length - 1) {
        animateSwap(index, index + 1);
    }
};

/* --- Feedback Visual de Cópia --- */
function triggerCopyFeedback(color) {
    screenFlash.style.boxShadow = `inset 0 0 45px 12px ${color || '#34C759'}`;
    screenFlash.classList.add('active');
    setTimeout(() => screenFlash.classList.remove('active'), 250);
}

/* --- Controle do Modo de Edição --- */
btnEdit.parentElement.addEventListener('click', () => {
    isEditMode = !isEditMode;
    btnEdit.innerText = isEditMode ? 'Concluído' : 'Editar';
    
    wrapEdit.style.setProperty('--glow-color', isEditMode ? '#34C759' : '#007AFF');
    wrapCreate.style.display = isEditMode ? 'none' : 'block';
    
    render();
});

/* --- Lógica de Exclusão --- */
window.confirmDelete = function(id) {
    deleteTargetId = id;
    confirmModal.classList.add('active');
}

window.closeConfirmModal = function() {
    confirmModal.classList.remove('active');
    deleteTargetId = null;
}

window.executeDelete = function() {
    if (deleteTargetId !== null) {
        texts = texts.filter(t => t.id !== deleteTargetId);
        saveTexts(); 
        render();
        closeConfirmModal();
    }
}

/* --- Lógica do Modal Principal --- */
window.openEdit = function(id) {
    const item = texts.find(t => t.id === id);
    document.getElementById('input-title').value = item.title;
    document.getElementById('input-text').value = item.text;
    selectColor(item.color);
    editingId = id;
    document.getElementById('modal-title').innerText = 'Editar Texto';
    openModal();
}

document.getElementById('btn-create').parentElement.addEventListener('click', () => {
    editingId = null;
    document.getElementById('input-title').value = '';
    document.getElementById('input-text').value = '';
    document.getElementById('modal-title').innerText = 'Novo Texto';
    selectColor('#007AFF');
    openModal();
});

window.openModal = function() {
    modal.classList.add('active');
}

window.closeModal = function() {
    modal.classList.remove('active');
}

document.getElementById('btn-save').parentElement.addEventListener('click', () => {
    let title = document.getElementById('input-title').value.trim();
    let text = document.getElementById('input-text').value.trim();
    
    if (title && text) {
        title = title.charAt(0).toUpperCase() + title.slice(1);
        text = text.charAt(0).toUpperCase() + text.slice(1);

        if (editingId) {
            const item = texts.find(t => t.id === editingId);
            item.title = title; 
            item.text = text; 
            item.color = selectedColor;
        } else {
            texts.push({ id: Date.now(), title, text, color: selectedColor });
        }
        saveTexts(); 
        render(); 
        closeModal();
    }
});

function selectColor(colorHex) {
    document.querySelectorAll('.color-swatch').forEach(s => {
        s.classList.toggle('selected', s.dataset.color === colorHex);
    });
    selectedColor = colorHex;
}

document.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', (e) => selectColor(e.target.dataset.color));
});

render();