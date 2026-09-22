let texts = JSON.parse(localStorage.getItem('ubs-historico')) || [
    { id: 1, title: 'Alergias', text: 'Nega alergia a medicamentos. Nega comorbidades prévias.', color: '#007AFF' },
    { id: 2, title: 'Atestado Médico', text: 'Paciente compareceu à unidade de saúde, necessita de 1 dia de repouso.', color: '#FF99C8' },
    { id: 3, title: 'Encaminhamento', text: 'Solicito avaliação com especialista para seguimento do quadro.', color: '#FFD166' }
];

let isEditMode = false;
let currentMode = 'list'; 
let editingId = null;
let selectedColor = '#007AFF';
let deleteTargetId = null;
let activeFilter = null;

const cardList = document.getElementById('card-list');
const inlineCreateContainer = document.getElementById('inline-create-container');
const settingsContainer = document.getElementById('settings-container');
const confirmModal = document.getElementById('confirm-modal');
const screenFlash = document.getElementById('screen-flash');
const filterBar = document.getElementById('filter-bar');

const wrapCreate = document.getElementById('wrap-create');
const wrapEdit = document.getElementById('wrap-edit');
const wrapBack = document.getElementById('wrap-back');
const btnCreate = document.getElementById('btn-create');
const btnCreateText = document.getElementById('btn-create-text');
const btnEdit = document.getElementById('btn-edit');
const btnBack = document.getElementById('btn-back');
const inlineInputText = document.getElementById('inline-input-text');
const footerMessageText = document.getElementById('footer-message-text');
const appFooter = document.getElementById('app-footer');

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

/* --- Barra de Filtros --- */
function renderFilterBar() {
    if (!filterBar) return;
    
    if (isEditMode) {
        filterBar.classList.add('hidden');
        return;
    } else {
        filterBar.classList.remove('hidden');
    }
    
    const uniqueColors = [...new Set(texts.map(t => t.color))];
    
    if (uniqueColors.length === 0) {
        filterBar.innerHTML = '';
        filterBar.style.display = 'none';
        return;
    }

    filterBar.style.display = 'flex';

    let html = `
        <div class="filter-btn filter-all ${activeFilter === null ? 'selected' : ''}" style="--filter-color: #8E8E93;" onclick="setFilter(null)" title="Mostrar Todos">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
        </div>
    `;

    uniqueColors.forEach(color => {
        const isActive = activeFilter === color ? 'selected' : '';
        html += `<div class="filter-btn ${isActive}" style="background-color: ${color}; --filter-color: ${color};" onclick="setFilter('${color}')" title="Filtrar por esta cor"></div>`;
    });

    filterBar.innerHTML = html;
}

window.setFilter = function(color) {
    if (activeFilter === color) return;
    activeFilter = color;
    
    cardList.style.opacity = '0';
    cardList.style.transform = 'translateY(15px)';
    
    setTimeout(() => {
        render();
        cardList.style.opacity = '1';
        cardList.style.transform = 'translateY(0)';
    }, 250);
};

function render(skipEntranceAnimation = false) {
    cardList.innerHTML = '';
    renderFilterBar();

    const filteredTexts = activeFilter ? texts.filter(t => t.color === activeFilter) : texts;

    filteredTexts.forEach((item, index) => {
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
            const realIndex = texts.findIndex(t => t.id === item.id);
            const disableReorder = activeFilter !== null;

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
                            <button class="glow-inner arrow-btn" onclick="moveUp(${item.id})" ${disableReorder || realIndex === 0 ? 'disabled' : ''} title="Mover para cima">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" width="20" height="20"><path d="M18 15l-6-6-6 6"/></svg>
                            </button>
                        </div>
                        <div class="glow-wrapper circle-wrapper" style="--glow-color: #007AFF">
                            <button class="glow-inner arrow-btn" onclick="moveDown(${item.id})" ${disableReorder || realIndex === texts.length - 1 ? 'disabled' : ''} title="Mover para baixo">
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

/* --- Modos Superiores --- */
btnEdit.parentElement.addEventListener('click', () => {
    if (currentMode === 'edit') {
        closeInlineForm();
        return;
    }
    if (currentMode !== 'list') return;

    isEditMode = !isEditMode;
    btnEdit.innerText = isEditMode ? 'Concluído' : 'Editar';
    wrapEdit.style.setProperty('--glow-color', isEditMode ? '#34C759' : '#AF52DE');
    
    if (isEditMode) {
        wrapCreate.classList.add('hide-anim');
    } else {
        wrapCreate.classList.remove('hide-anim');
    }
    render();
});

btnCreate.parentElement.addEventListener('click', () => {
    if (isEditMode) return;
    if (currentMode === 'list') {
        openCreateMode();
    } else if (currentMode === 'create') {
        closeInlineForm();
    }
});

btnBack.parentElement.addEventListener('click', () => {
    if (currentMode === 'settings') {
        closeSettings();
    }
});

function openCreateMode() {
    currentMode = 'create';
    editingId = null;
    isEditMode = false;
    
    if (filterBar) filterBar.classList.add('hidden');
    wrapEdit.classList.add('hide-anim');
    
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
    isEditMode = false;

    if (filterBar) filterBar.classList.add('hidden');

    btnEdit.innerText = 'Cancelar Edição';
    wrapEdit.style.setProperty('--glow-color', '#FF3B30');
    wrapEdit.classList.remove('hide-anim');
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
    
    if (filterBar) filterBar.classList.remove('hidden');

    btnEdit.innerText = 'Editar';
    wrapEdit.style.setProperty('--glow-color', '#AF52DE');
    wrapEdit.classList.remove('hide-anim');
    
    btnCreateText.innerText = 'Criar';
    btnCreate.querySelector('svg').style.transform = 'rotate(0deg)';
    wrapCreate.style.setProperty('--glow-color', '#007AFF');
    wrapCreate.classList.remove('hide-anim');

    inlineCreateContainer.classList.remove('active');
    cardList.classList.remove('hidden');
    render();
}

/* --- Exclusão --- */
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
        const targetCard = document.querySelector(`.card-wrapper[data-id="${deleteTargetId}"]`);
        
        if (targetCard) {
            targetCard.classList.add('fade-out-anim');
            setTimeout(() => {
                texts = texts.filter(t => t.id !== deleteTargetId);
                if (activeFilter && !texts.some(t => t.color === activeFilter)) activeFilter = null;
                saveTexts(); 
                render(true); 
                closeConfirmModal();
            }, 300);
        } else {
            texts = texts.filter(t => t.id !== deleteTargetId);
            saveTexts(); 
            render(true);
            closeConfirmModal();
        }
    }
}

/* --- Salvar Criação/Edição --- */
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

/* --- Boas-vindas Dinâmica --- */
window.addEventListener('DOMContentLoaded', () => {
    const splash = document.getElementById('welcome-splash');
    const textEl = document.getElementById('welcome-text');
    const emojiEl = document.getElementById('welcome-emoji');
    
    if (!splash || !textEl || !emojiEl) return;
    const catEmojis = ['🐱', '😸', '😺', '😻', '🐾', '🐈‍⬛', '😽', '😹'];
    
    const greetings = {
        morning: { title: "Bom dia!", phrases: ["Já serviu o sachê de hoje?", "Hora de miar na porta até abrir!"] },
        afternoon: { title: "Boa tarde!", phrases: ["Hora do cochilo perfeito.", "Amassando pãozinho perto do teclado."] },
        night: { title: "Boa noite!", phrases: ["Preparando a corrida louca (zoomies)!", "Silêncio no recinto..."] }
    };

    const hour = new Date().getHours();
    let period = 'night';
    if (hour >= 5 && hour < 12) period = 'morning';
    else if (hour >= 12 && hour < 18) period = 'afternoon';

    const randomEmoji = catEmojis[Math.floor(Math.random() * catEmojis.length)];
    const periodData = greetings[period];
    const randomPhrase = periodData.phrases[Math.floor(Math.random() * periodData.phrases.length)];

    emojiEl.innerText = randomEmoji;
    textEl.innerHTML = `${periodData.title}<br><span class="welcome-subtitle">${randomPhrase}</span>`;

    setTimeout(() => {
        splash.classList.add('fade-out');
        setTimeout(() => splash.remove(), 500);
    }, 1400);
});

/* --- Configurações --- */
window.openSettings = function() {
    if (currentMode === 'settings') return;
    currentMode = 'settings';
    isEditMode = false;

    wrapCreate.classList.add('hide-anim');
    wrapEdit.classList.add('hide-anim');
    wrapBack.classList.remove('hide-anim');

    cardList.classList.add('hidden');
    if (filterBar) filterBar.classList.add('hidden');
    inlineCreateContainer.classList.remove('active');
    
    settingsContainer.classList.add('active');
    
    if(appFooter) appFooter.classList.add('hidden');
};

window.closeSettings = function() {
    currentMode = 'list';
    
    wrapBack.classList.add('hide-anim');
    wrapEdit.classList.remove('hide-anim');
    wrapCreate.classList.remove('hide-anim');
    
    settingsContainer.classList.remove('active');
    cardList.classList.remove('hidden');
    if (filterBar) filterBar.classList.remove('hidden');
    
    if(appFooter) appFooter.classList.remove('hidden');
    
    render();
};

const catMessages = [
    "🐾 Menininha mandou avisar: o sachê tá no fim! [Clique aqui]",
    "😸 Pitico agradece o carinho no plantão!",
    "🐈‍⬛ Peludão está de olho! Que tal um Pix pra ração?",
    "🥣 Ajude a manter a tigelinha dos gatos cheia! Clique aqui."
];
let msgIndex = 0;

if (footerMessageText) {
    footerMessageText.innerText = catMessages[msgIndex];
    
    footerMessageText.addEventListener('animationiteration', () => {
        msgIndex = (msgIndex + 1) % catMessages.length;
        footerMessageText.innerText = catMessages[msgIndex];
    });
}

const carouselImgs = document.querySelectorAll('.carousel-img');
const carouselCaption = document.getElementById('carousel-caption');
const captions = [
    "Menininha na fiscalização",
    "Pitico esperando o sachê",
    "Peludão de olho no posto"
];
let currentSlide = 0;

window.nextSlide = function() {
    if(carouselImgs.length === 0) return;
    carouselImgs[currentSlide].classList.remove('active');
    currentSlide = (currentSlide + 1) % carouselImgs.length;
    carouselImgs[currentSlide].classList.add('active');
    carouselCaption.innerText = captions[currentSlide];
};

setInterval(window.nextSlide, 3500);

window.exportBackup = function() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(texts));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "historico_ubs_backup.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    triggerCopyFeedback('#007AFF');
};

window.importBackup = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedTexts = JSON.parse(e.target.result);
            if (Array.isArray(importedTexts)) {
                texts = importedTexts;
                saveTexts();
                render();
                triggerCopyFeedback('#34C759');
                setTimeout(() => alert("Backup importado com sucesso!"), 300);
            } else {
                alert("Arquivo inválido. Certifique-se de usar o backup gerado pelo app.");
            }
        } catch (err) {
            alert("Erro ao ler o arquivo.");
        }
        event.target.value = '';
    };
    reader.readAsText(file);
};

window.copyPix = function() {
    const pixInput = document.getElementById('pix-key-input');
    pixInput.select();
    navigator.clipboard.writeText(pixInput.value).then(() => {
        triggerCopyFeedback('#34C759'); 
    });
};

render();