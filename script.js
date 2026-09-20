let texts = JSON.parse(localStorage.getItem('ubs-historico')) || [
    { id: 1, title: 'Alergias', text: 'Nega alergia a medicamentos. Nega comorbidades prévias.', color: '#007AFF' },
    { id: 2, title: 'Atestado Médico', text: 'Paciente compareceu à unidade de saúde, necessita de 1 dia de repouso.', color: '#FF99C8' },
    { id: 3, title: 'Encaminhamento', text: 'Solicito avaliação com especialista para seguimento do quadro.', color: '#FFD166' }
];

let isEditMode = false;
let currentMode = 'list'; // 'list' | 'create' | 'edit'
let editingId = null;
let selectedColor = '#007AFF';
let deleteTargetId = null;

const cardList = document.getElementById('card-list');
const inlineCreateContainer = document.getElementById('inline-create-container');
const confirmModal = document.getElementById('confirm-modal');
const screenFlash = document.getElementById('screen-flash');

const wrapCreate = document.getElementById('wrap-create');
const wrapEdit = document.getElementById('wrap-edit');
const btnCreate = document.getElementById('btn-create');
const btnCreateText = document.getElementById('btn-create-text');
const btnEdit = document.getElementById('btn-edit');
const inlineInputText = document.getElementById('inline-input-text');

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

function setupAutoCapitalize(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.addEventListener('input', () => {
        if (el.value.length > 0) {
            el.value = el.value.charAt(0).toUpperCase() + el.value.slice(1);
        }
    });
}

setupAutoCapitalize('inline-input-title');
setupAutoCapitalize('inline-input-text');

function autoResizeTextarea() {
    inlineInputText.style.height = 'auto';
    inlineInputText.style.height = inlineInputText.scrollHeight + 'px';
}

inlineInputText.addEventListener('input', autoResizeTextarea);

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
                <div class="card-text">${item.text}</div>
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
                    
                    <div class="divider-vertical"></div>
                    
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

function animateSwap(index1, index2) {
    const oldPositions = new Map();
    Array.from(cardList.children).forEach(card => {
        if (card.dataset.id) {
            oldPositions.set(card.dataset.id, card.getBoundingClientRect().top);
        }
    });

    const temp = texts[index1];
    texts[index1] = texts[index2];
    texts[index2] = temp;
    saveTexts();
    render(true);

    Array.from(cardList.children).forEach(card => {
        const id = card.dataset.id;
        const oldTop = oldPositions.get(id);
        if (oldTop !== undefined) {
            const newTop = card.getBoundingClientRect().top;
            const deltaY = oldTop - newTop;

            if (deltaY !== 0) {
                card.style.animation = 'none';
                card.style.transform = `translateY(${deltaY}px)`;
                card.style.transition = 'none';
                card.offsetHeight;
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
    if (index > 0) animateSwap(index, index - 1);
};

window.moveDown = function(id) {
    const index = texts.findIndex(t => t.id === id);
    if (index < texts.length - 1) animateSwap(index, index + 1);
};

function triggerCopyFeedback(color) {
    screenFlash.style.boxShadow = `inset 0 0 45px 12px ${color || '#34C759'}`;
    screenFlash.classList.add('active');
    setTimeout(() => screenFlash.classList.remove('active'), 250);
}

/* --- Controle do Modo de Edição da Lista --- */
btnEdit.parentElement.addEventListener('click', () => {
    if (currentMode === 'edit') {
        // Clicou em "Cancelar Edição"
        closeInlineForm();
        return;
    }

    if (currentMode !== 'list') return;

    // Entra ou sai do modo de edição da lista
    isEditMode = !isEditMode;
    btnEdit.innerText = isEditMode ? 'Concluído' : 'Editar';
    
    wrapEdit.style.setProperty('--glow-color', isEditMode ? '#34C759' : '#AF52DE');
    
    // Oculta/Exibe o botão de Criar com animação
    if (isEditMode) {
        wrapCreate.classList.add('hide-anim');
    } else {
        wrapCreate.classList.remove('hide-anim');
    }
    
    render();
});

/* --- Controle do Botão Superior Criar/Fechar --- */
btnCreate.parentElement.addEventListener('click', () => {
    if (isEditMode) return;

    if (currentMode === 'list') {
        openCreateMode();
    } else if (currentMode === 'create') {
        closeInlineForm();
    }
});

function openCreateMode() {
    currentMode = 'create';
    editingId = null;
    isEditMode = false;
    
    // Oculta o botão Editar
    wrapEdit.classList.add('hide-anim');
    
    // Transforma o botão Criar em Fechar
    btnCreateText.innerText = 'Fechar';
    btnCreate.querySelector('svg').style.transform = 'rotate(45deg)';
    wrapCreate.style.setProperty('--glow-color', '#FF3B30');
    wrapCreate.classList.remove('hide-anim');
    
    document.getElementById('inline-form-title').innerText = 'Novo Texto';
    document.getElementById('inline-input-title').value = '';
    inlineInputText.value = '';
    autoResizeTextarea();
    document.getElementById('inline-btn-save').innerText = 'Salvar';
    selectInlineColor('#007AFF');

    cardList.classList.add('hidden');
    inlineCreateContainer.classList.add('active');
    document.getElementById('inline-input-title').focus();
}

window.openEdit = function(id) {
    const item = texts.find(t => t.id === id);
    if (!item) return;

    currentMode = 'edit';
    editingId = id;
    isEditMode = false; // Sai do modo de edição de lista para edição única

    // O botão Concluído se transforma em Cancelar Edição
    btnEdit.innerText = 'Cancelar Edição';
    wrapEdit.style.setProperty('--glow-color', '#FF3B30'); // Efeito vermelho ao cancelar
    wrapEdit.classList.remove('hide-anim'); // Garante que esteja visível
    
    // Mantém o botão Criar oculto
    wrapCreate.classList.add('hide-anim');

    document.getElementById('inline-form-title').innerText = 'Editar Texto';
    document.getElementById('inline-input-title').value = item.title;
    inlineInputText.value = item.text;
    autoResizeTextarea();
    document.getElementById('inline-btn-save').innerText = 'Salvar Edição';
    selectInlineColor(item.color);

    cardList.classList.add('hidden');
    inlineCreateContainer.classList.add('active');
    document.getElementById('inline-input-title').focus();
}

function closeInlineForm() {
    currentMode = 'list';
    editingId = null;
    isEditMode = false;
    
    // Restaura o botão Editar
    btnEdit.innerText = 'Editar';
    wrapEdit.style.setProperty('--glow-color', '#AF52DE');
    wrapEdit.classList.remove('hide-anim');
    
    // Restaura o botão Criar
    btnCreateText.innerText = 'Criar';
    btnCreate.querySelector('svg').style.transform = 'rotate(0deg)';
    wrapCreate.style.setProperty('--glow-color', '#007AFF');
    wrapCreate.classList.remove('hide-anim');

    inlineCreateContainer.classList.remove('active');
    cardList.classList.remove('hidden');
    render();
}

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

/* Salvar do Painel Inline (Criação ou Edição) */
document.getElementById('inline-btn-save').parentElement.addEventListener('click', () => {
    let title = document.getElementById('inline-input-title').value.trim();
    let text = inlineInputText.value.trim();
    
    if (title && text) {
        title = title.charAt(0).toUpperCase() + title.slice(1);
        text = text.charAt(0).toUpperCase() + text.slice(1);

        if (currentMode === 'create') {
            texts.push({ id: Date.now(), title, text, color: selectedColor });
        } else if (currentMode === 'edit' && editingId !== null) {
            const item = texts.find(t => t.id === editingId);
            if (item) {
                item.title = title;
                item.text = text;
                item.color = selectedColor;
            }
        }

        saveTexts(); 
        render(); 
        closeInlineForm();
    }
});

function selectInlineColor(colorHex) {
    document.querySelectorAll('#inline-create-container .color-swatch').forEach(s => {
        s.classList.toggle('selected', s.dataset.color === colorHex);
    });
    selectedColor = colorHex;
}

document.querySelectorAll('#inline-create-container .color-swatch').forEach(swatch => {
    swatch.addEventListener('click', (e) => selectInlineColor(e.target.dataset.color));
});

render();