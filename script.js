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
const imcContainer = document.getElementById('imc-container');
const confirmModal = document.getElementById('confirm-modal');
const screenFlash = document.getElementById('screen-flash');
const filterBar = document.getElementById('filter-bar');

const wrapCreate = document.getElementById('wrap-create');
const wrapEdit = document.getElementById('wrap-edit');
const wrapBack = document.getElementById('wrap-back');
const wrapImc = document.getElementById('wrap-imc');
const btnCreate = document.getElementById('btn-create');
const btnCreateText = document.getElementById('btn-create-text');
const btnEdit = document.getElementById('btn-edit');
const btnBack = document.getElementById('btn-back');
const btnImc = document.getElementById('btn-imc');
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

/* Trava de dígitos/casas decimais + Cálculo Automático de IMC */
function setupInputDigitLimits() {
    const pesoInput = document.getElementById('imc-peso');
    const alturaInput = document.getElementById('imc-altura');

    function applyLimit(inputEl, maxTotalDigits, maxDecimals, btnClearId) {
        if (!inputEl) return;
        inputEl.addEventListener('input', () => {
            let val = inputEl.value;
            let digitCount = 0;
            let decimalCount = 0;
            let hasDecimal = false;
            let sanitized = '';

            for (let char of val) {
                if (/\d/.test(char)) {
                    if (!hasDecimal) {
                        if (digitCount < maxTotalDigits) {
                            digitCount++;
                            sanitized += char;
                        }
                    } else {
                        if (decimalCount < maxDecimals) {
                            decimalCount++;
                            sanitized += char;
                        }
                    }
                } else if (char === '.' || char === ',') {
                    if (!hasDecimal) {
                        hasDecimal = true;
                        sanitized += char;
                    }
                }
            }
            inputEl.value = sanitized;

            // Mostrar/Ocultar botão de limpar ("X")
            const wrapper = inputEl.parentElement;
            if (sanitized.length > 0) {
                wrapper.classList.add('has-value');
            } else {
                wrapper.classList.remove('has-value');
            }

            // Calcular IMC Automaticamente a cada digitação
            calcularIMC();
        });
    }

    /* Peso: Máximo 6 dígitos inteiros, máximo 3 após a vírgula/ponto */
    applyLimit(pesoInput, 6, 3, 'btn-clear-peso');
    
    /* Altura: Máximo 3 dígitos inteiros, máximo 2 após a vírgula/ponto */
    applyLimit(alturaInput, 3, 2, 'btn-clear-altura');
}

setupInputDigitLimits();

/* Função para Limpar Input pelos botões "X" */
window.clearInput = function(inputId, btnId) {
    const input = document.getElementById(inputId);
    if (input) {
        input.value = '';
        input.parentElement.classList.remove('has-value');
        input.focus();
        calcularIMC();
    }
};

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
        const isSelected = activeFilter === color;
        html += `<div class="filter-btn ${isSelected ? 'selected' : ''}" style="background-color: ${color}; --filter-color: ${color};" onclick="setFilter('${color}')"></div>`;
    });

    filterBar.innerHTML = html;
}

window.setFilter = function(color) {
    activeFilter = color;
    render();
    renderFilterBar();
}

function render() {
    cardList.innerHTML = '';
    
    let filteredTexts = texts;
    if (activeFilter !== null) {
        filteredTexts = texts.filter(t => t.color === activeFilter);
    }
    
    if (filteredTexts.length === 0 && activeFilter !== null) {
        activeFilter = null;
        renderFilterBar();
        render();
        return;
    }

    filteredTexts.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'glow-wrapper card-wrapper';
        div.style.setProperty('--glow-color', item.color || '#007AFF');
        div.style.animationDelay = `${index * 0.05}s`;
        
        let contentHtml = `
            <div class="glow-inner card-content" onclick="!isEditMode && copyText('${item.text}', '${item.color}')">
                <div class="card-title">${item.title}</div>
                <div class="card-text">${item.text}</div>
        `;
        
        if (isEditMode) {
            contentHtml += `
                <div class="edit-mode-ui" onclick="event.stopPropagation()">
                    <div class="reorder-actions">
                        <button class="arrow-btn" onclick="moveItem(${index}, -1)" ${index === 0 ? 'disabled' : ''}>
                            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                        </button>
                        <button class="arrow-btn" onclick="moveItem(${index}, 1)" ${index === filteredTexts.length - 1 ? 'disabled' : ''}>
                            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </button>
                    </div>
                    <div class="divider-vertical"></div>
                    <div class="edit-actions">
                        <div class="circle-wrapper" style="--glow-color: #007AFF;">
                            <button class="circle-btn" onclick="openEdit(${item.id})">
                                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                        </div>
                        <div class="circle-wrapper" style="--glow-color: #FF3B30;">
                            <button class="circle-btn" onclick="confirmDelete(${item.id})">
                                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
        
        contentHtml += `</div>`;
        div.innerHTML = contentHtml;
        attachGlow(div);
        cardList.appendChild(div);
    });
    
    renderFilterBar();
}

window.moveItem = function(index, direction) {
    if (activeFilter !== null) {
        let globalIndex = texts.findIndex(t => t.id === texts.filter(f => f.color === activeFilter)[index].id);
        let targetIndex = index + direction;
        let globalTargetIndex = texts.findIndex(t => t.id === texts.filter(f => f.color === activeFilter)[targetIndex].id);

        if (globalTargetIndex < 0 || globalTargetIndex >= texts.length) return;
        
        const temp = texts[globalIndex];
        texts[globalIndex] = texts[globalTargetIndex];
        texts[globalTargetIndex] = temp;
    } else {
        if (index + direction < 0 || index + direction >= texts.length) return;
        const temp = texts[index];
        texts[index] = texts[index + direction];
        texts[index + direction] = temp;
    }
    
    saveTexts();
    render();
}

function triggerCopyFeedback(color) {
    screenFlash.style.boxShadow = `inset 0 0 45px 12px ${color}`;
    screenFlash.classList.add('active');
    
    if('vibrate' in navigator) navigator.vibrate(50);

    setTimeout(() => {
        screenFlash.classList.remove('active');
    }, 150);
}

window.copyText = function(text, color) {
    navigator.clipboard.writeText(text).then(() => {
        triggerCopyFeedback(color);
    });
};

/* Cores */
document.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', function() {
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
        this.classList.add('selected');
        selectedColor = this.dataset.color;
    });
});

/* Modo Criar */
btnCreate.parentElement.addEventListener('click', () => {
    if (currentMode === 'list') {
        openCreateMode();
    }
});

function openCreateMode() {
    currentMode = 'create';
    isEditMode = false;
    editingId = null;
    document.getElementById('inline-form-title').innerText = 'Novo Texto';
    document.getElementById('inline-input-title').value = '';
    inlineInputText.value = '';
    
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
    document.querySelector('.color-swatch[data-color="#007AFF"]').classList.add('selected');
    selectedColor = '#007AFF';

    wrapCreate.classList.add('hide-anim');
    wrapEdit.classList.add('hide-anim');
    wrapImc.classList.add('hide-anim');
    wrapBack.classList.remove('hide-anim');

    cardList.classList.add('hidden');
    if (filterBar) filterBar.classList.add('hidden');
    inlineCreateContainer.classList.add('active');
    if(appFooter) appFooter.classList.add('hidden');
    
    setTimeout(() => {
        document.getElementById('inline-input-title').focus();
        autoResizeTextarea();
    }, 350);
}

window.openEdit = function(id) {
    const item = texts.find(t => t.id === id);
    if (!item) return;

    currentMode = 'edit-item';
    editingId = id;
    document.getElementById('inline-form-title').innerText = 'Editar Texto';
    document.getElementById('inline-input-title').value = item.title;
    inlineInputText.value = item.text;
    
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
    let swatch = document.querySelector(`.color-swatch[data-color="${item.color}"]`);
    if(swatch) {
        swatch.classList.add('selected');
        selectedColor = item.color;
    } else {
        document.querySelector('.color-swatch[data-color="#007AFF"]').classList.add('selected');
        selectedColor = '#007AFF';
    }

    wrapCreate.classList.add('hide-anim');
    wrapEdit.classList.add('hide-anim');
    wrapImc.classList.add('hide-anim');
    wrapBack.classList.remove('hide-anim');

    cardList.classList.add('hidden');
    if (filterBar) filterBar.classList.add('hidden');
    inlineCreateContainer.classList.add('active');
    if(appFooter) appFooter.classList.add('hidden');
    
    setTimeout(autoResizeTextarea, 50);
};

/* Salvar */
document.getElementById('inline-btn-save').addEventListener('click', () => {
    const title = document.getElementById('inline-input-title').value.trim();
    const text = inlineInputText.value.trim();
    
    if (!title || !text) return;

    if (editingId) {
        const index = texts.findIndex(t => t.id === editingId);
        if (index > -1) {
            texts[index] = { ...texts[index], title, text, color: selectedColor };
        }
    } else {
        texts.unshift({
            id: Date.now(),
            title,
            text,
            color: selectedColor
        });
        activeFilter = null;
    }
    
    saveTexts();
    closeInlineForm();
});

function closeInlineForm() {
    currentMode = 'list';
    
    wrapBack.classList.add('hide-anim');
    wrapEdit.classList.remove('hide-anim');
    wrapCreate.classList.remove('hide-anim');
    wrapImc.classList.remove('hide-anim');
    
    inlineCreateContainer.classList.remove('active');
    cardList.classList.remove('hidden');
    if (filterBar) filterBar.classList.remove('hidden');
    if(appFooter) appFooter.classList.remove('hidden');
    
    if (editingId) {
        isEditMode = true;
    }
    
    render();
}

/* Modo Editar Lista */
btnEdit.parentElement.addEventListener('click', () => {
    if (currentMode !== 'list') return;
    isEditMode = !isEditMode;
    
    if (isEditMode) {
        wrapCreate.classList.add('hide-anim');
        wrapImc.classList.add('hide-anim');
        btnEdit.innerText = 'Concluído';
        btnEdit.parentElement.style.setProperty('--glow-color', '#34C759');
    } else {
        wrapCreate.classList.remove('hide-anim');
        wrapImc.classList.remove('hide-anim');
        btnEdit.innerText = 'Editar';
        btnEdit.parentElement.style.setProperty('--glow-color', '#AF52DE');
    }
    render();
});

/* Voltar */
btnBack.parentElement.addEventListener('click', () => {
    if (currentMode === 'create' || currentMode === 'edit-item') {
        closeInlineForm();
    } else if (currentMode === 'settings') {
        closeSettings();
    } else if (currentMode === 'imc') {
        closeImc();
    }
});

/* Configurações */
window.openSettings = function() {
    if (currentMode !== 'list') return;
    currentMode = 'settings';
    isEditMode = false;
    
    wrapCreate.classList.add('hide-anim');
    wrapEdit.classList.add('hide-anim');
    wrapImc.classList.add('hide-anim');
    wrapBack.classList.remove('hide-anim');

    cardList.classList.add('hidden');
    if (filterBar) filterBar.classList.add('hidden');
    settingsContainer.classList.add('active');
    if(appFooter) appFooter.classList.add('hidden');
}

function closeSettings() {
    currentMode = 'list';
    
    wrapBack.classList.add('hide-anim');
    wrapEdit.classList.remove('hide-anim');
    wrapCreate.classList.remove('hide-anim');
    wrapImc.classList.remove('hide-anim');
    
    settingsContainer.classList.remove('active');
    cardList.classList.remove('hidden');
    if (filterBar) filterBar.classList.remove('hidden');
    if(appFooter) appFooter.classList.remove('hidden');
    
    render();
}

/* IMC */
btnImc.parentElement.addEventListener('click', () => {
    if (currentMode === 'list') openImc();
});

function openImc() {
    currentMode = 'imc';
    isEditMode = false;
    
    wrapCreate.classList.add('hide-anim');
    wrapEdit.classList.add('hide-anim');
    wrapImc.classList.add('hide-anim');
    wrapBack.classList.remove('hide-anim');

    cardList.classList.add('hidden');
    if (filterBar) filterBar.classList.add('hidden');
    
    imcContainer.classList.add('active');
    if(appFooter) appFooter.classList.add('hidden');
    
    document.getElementById('imc-peso').value = '';
    document.getElementById('imc-altura').value = '';
    document.getElementById('imc-peso').parentElement.classList.remove('has-value');
    document.getElementById('imc-altura').parentElement.classList.remove('has-value');
    
    calcularIMC();
    
    setTimeout(() => {
        document.getElementById('imc-peso').focus();
    }, 350);
}

function closeImc() {
    currentMode = 'list';
    
    wrapBack.classList.add('hide-anim');
    wrapEdit.classList.remove('hide-anim');
    wrapCreate.classList.remove('hide-anim');
    wrapImc.classList.remove('hide-anim');
    
    imcContainer.classList.remove('active');
    cardList.classList.remove('hidden');
    if (filterBar) filterBar.classList.remove('hidden');
    if(appFooter) appFooter.classList.remove('hidden');
    
    render();
}

/* Cálculo Automático e Atualização do Marcador da Barra */
window.calcularIMC = function() {
    let pesoRaw = document.getElementById('imc-peso').value;
    let alturaRaw = document.getElementById('imc-altura').value;
    const marker = document.getElementById('imc-bar-marker');
    const classifEl = document.getElementById('imc-classificacao');
    const valorEl = document.getElementById('imc-valor');
    
    let peso = parseFloat(pesoRaw.replace(',', '.'));
    let altura = parseFloat(alturaRaw.replace(',', '.'));
    
    if (!peso || !altura || peso <= 0 || altura <= 0) {
        valorEl.innerText = '--';
        classifEl.innerText = 'Informe o peso e a altura';
        classifEl.style.color = 'var(--text-muted)';
        classifEl.style.backgroundColor = 'transparent';
        marker.classList.remove('active');
        return;
    }
    
    if (altura > 3) altura = altura / 100;
    
    let imc = (peso / (altura * altura)).toFixed(1);
    let imcNum = parseFloat(imc);
    
    let classif = '';
    let color = '';
    let pct = 0; // % na barra horizontal

    if (imcNum < 18.5) {
        classif = 'Abaixo do peso';
        color = '#5AC8FA';
        pct = Math.max(2, Math.min(18, ((imcNum - 10) / (18.5 - 10)) * 20));
    } else if (imcNum <= 24.9) {
        classif = 'Peso normal';
        color = '#34C759';
        pct = 20 + ((imcNum - 18.5) / (24.9 - 18.5)) * 20;
    } else if (imcNum <= 29.9) {
        classif = 'Sobrepeso';
        color = '#FFD166';
        pct = 40 + ((imcNum - 25.0) / (29.9 - 25.0)) * 20;
    } else if (imcNum <= 34.9) {
        classif = 'Obesidade Grau I';
        color = '#FF9500';
        pct = 60 + ((imcNum - 30.0) / (34.9 - 30.0)) * 15;
    } else if (imcNum <= 39.9) {
        classif = 'Obesidade Grau II';
        color = '#FF3B30';
        pct = 75 + ((imcNum - 35.0) / (39.9 - 35.0)) * 15;
    } else {
        classif = 'Obesidade Grau III';
        color = '#AF52DE';
        pct = Math.min(98, 90 + ((imcNum - 40.0) / (50.0 - 40.0)) * 10);
    }
    
    valorEl.innerText = imc;
    classifEl.innerText = classif;
    
    // Transforma em pílula mudando a cor de fundo e garantindo contraste ideal
    classifEl.style.backgroundColor = color;
    classifEl.style.color = (color === '#FFD166' || color === '#5AC8FA') ? '#000000' : '#ffffff';
    
    marker.style.left = `${pct}%`;
    marker.style.borderColor = color;
    marker.classList.add('active');
}

/* Modal Excluir */
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

/* Backup */
window.exportBackup = function() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(texts));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "ubs_textos_backup.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

window.importBackup = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (Array.isArray(imported)) {
                texts = imported;
                saveTexts();
                render();
                alert('Backup importado com sucesso!');
            } else {
                alert('Formato de arquivo inválido.');
            }
        } catch (err) {
            alert('Erro ao ler arquivo.');
        }
    };
    reader.readAsText(file);
}

/* Splash, Mensagens e Carrossel */
const welcomeMessages = [
    "Bom plantão!", "Beba água!", "Salve os textos!", 
    "Café salva vidas!", "Mais uma ficha?", "Respira fundo!"
];

const footerMessages = [
    "🐾 A Menininha pediu sachê", "🐾 O Pitico está dormindo", 
    "🐾 Peludão ronronando", "🐾 Gatinhos alimentados hoje!", 
    "🐾 Eles agradecem seu carinho!"
];

window.onload = () => {
    const splash = document.getElementById('welcome-splash');
    const msgElement = document.getElementById('welcome-text');
    
    msgElement.innerHTML = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)] + '<br><span class="welcome-subtitle">App de Textos Rápidos</span>';
    
    setTimeout(() => {
        splash.classList.add('fade-out');
        setTimeout(() => splash.remove(), 500);
    }, 1800);

    footerMessageText.innerText = footerMessages[Math.floor(Math.random() * footerMessages.length)];
    setInterval(() => {
        footerMessageText.innerText = footerMessages[Math.floor(Math.random() * footerMessages.length)];
    }, 15000);

    render();
};

/* Lógica do Carrossel */
const images = document.querySelectorAll('.carousel-img');
const caption = document.getElementById('carousel-caption');
const captionsText = [
    "Menininha e Pitico num cochilo bem agarradinhos ❤️",
    "Menininha e Peludão dividindo o almoço",
    "a Gangue dos Gatos"
];
let currentImgIndex = 0;

setInterval(() => {
    images[currentImgIndex].classList.remove('active');
    currentImgIndex = (currentImgIndex + 1) % images.length;
    images[currentImgIndex].classList.add('active');
    caption.innerText = captionsText[currentImgIndex];
}, 4000);

window.copyPix = function() {
    const input = document.getElementById('pix-key-input');
    input.select();
    input.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(input.value);
};
