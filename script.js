// DADOS DO REPERTÓRIO
const STORAGE_KEY = 'repertorio_vaquejada_data';
const THEME_KEY = 'repertorio_theme';
const TIMER_STORAGE_KEY = 'repertorio_timer_data';
const META_KEY = 'repertorio_meta';
const CURRENT_ID_KEY = 'repertorio_current_id';
const DATA_PREFIX = 'repertorio_data_';
const CONFIG_KEY = 'repertorio_config';
const SCROLL_SPEED_KEY = 'repertorio_scroll_speed';
const CUSTOM_COLOR_KEY = 'repertorio_custom_color';

const defaultData = [
    {
        id: "B01",
        rhythm: "FORRÓ VAQUEJADA – ARRASTA PÉ",
        songs: [
            { title: "MEU BEIJA FLOR", key: "SOL" },
            { title: "EU LACEI O CORAÇÃOZINHO", key: "MIm" },
            { title: "ZOM ZOOM ZOOM", key: "SIm" },
            { title: "DEIXE PRA DE NOITE", key: "SOL" },
            { title: "SE BULIRAM COM VOCÊ", key: "SOL" }
        ]
    },
    {
        id: "B02",
        rhythm: "PISADINHA",
        songs: [
            { title: "PEGUEI MINHA SANFONA", key: "FAm" },
            { title: "SENTA NO COLINHO", key: "DOm" },
            { title: "NA PENEIRA", key: "SOL" },
            { title: "NO TUTANO", key: "REm" }
        ]
    },
    {
        id: "B03",
        rhythm: "VANERÃO",
        songs: [
            { title: "FILHO SEM SORTE", key: "DÓ" },
            { title: "ALEGRIA DO VAQUEIRO", key: "SOL" },
            { title: "FORROBODÓ", key: "SOLm" },
            { title: "SEIS CORDAS", key: "SOL" },
            { title: "BAIÃO DE DOIS", key: "SOLm" }
        ]
    }
];

let setlistData = [];
let currentSetlistId = 'default';
let isSelectionMode = false;
let editingIndex = -1;
let currentEditingSong = null;

// UNDO/REDO LOGIC
let historyStack = [];
let redoStack = [];

function pushHistory() {
    historyStack.push(JSON.stringify(setlistData));
    if (historyStack.length > 50) historyStack.shift();
    redoStack = []; // Limpa redo ao fazer nova ação
}

function undo() {
    if (historyStack.length === 0) return;
    redoStack.push(JSON.stringify(setlistData));
    setlistData = JSON.parse(historyStack.pop());
    saveData();
    renderSetlist();
}

function redo() {
    if (redoStack.length === 0) return;
    historyStack.push(JSON.stringify(setlistData));
    setlistData = JSON.parse(redoStack.pop());
    saveData();
    renderSetlist();
}

const container = document.getElementById('repertoire-container');

function renderSetlist() {
    container.innerHTML = '';
    let previousKey = null;
    setlistData.forEach((block, index) => { // Criação do Bloco
        const blockDiv = document.createElement('div');
        blockDiv.className = 'block-container';
        blockDiv.draggable = true;
        blockDiv.dataset.originalIndex = index;

        // Eventos de Drag and Drop do Bloco
        blockDiv.addEventListener('dragstart', (e) => {
            // Evita arrastar se clicar nos botões
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                e.preventDefault();
                return;
            }
            blockDiv.classList.add('dragging-block');
        });

        blockDiv.addEventListener('dragend', () => {
            blockDiv.classList.remove('dragging-block');
            reorderBlocks();
        });

        // Cabeçalho do Bloco
        const headerDiv = document.createElement('div');
        headerDiv.className = 'block-header';

        const titleDiv = document.createElement('div');
        titleDiv.className = 'block-title';
        titleDiv.innerHTML = `${block.id} <span style="font-size:0.8rem; opacity:0.7; margin-left:10px;">// ${block.rhythm}</span>`;

        const controlsDiv = document.createElement('div');
        
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'control-btn btn-toggle';
        toggleBtn.textContent = '-';
        toggleBtn.onclick = () => {
            blockDiv.classList.toggle('collapsed');
            toggleBtn.textContent = blockDiv.classList.contains('collapsed') ? '+' : '-';
        };

        // Expande/Recolhe ao clicar no título
        titleDiv.onclick = () => {
            blockDiv.classList.toggle('collapsed');
            toggleBtn.textContent = blockDiv.classList.contains('collapsed') ? '+' : '-';
        };

        const editBtn = document.createElement('button');
        editBtn.className = 'control-btn';
        editBtn.textContent = 'EDITAR';
        editBtn.onclick = () => editBlock(index);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'control-btn btn-delete';
        deleteBtn.textContent = 'EXCLUIR';
        deleteBtn.onclick = () => deleteBlock(index);

        controlsDiv.appendChild(toggleBtn);
        controlsDiv.appendChild(editBtn);
        controlsDiv.appendChild(deleteBtn);

        headerDiv.appendChild(titleDiv);
        headerDiv.appendChild(controlsDiv);

        // Lista de Músicas
        const listUl = document.createElement('ul');
        listUl.className = 'song-list';

        block.songs.forEach((song, index) => {
            const listItem = document.createElement('li');
            listItem.className = 'song-item';
            if (song.played) listItem.classList.add('played');

            // Container clicável (Cabeçalho)
            const headerDiv = document.createElement('div');
            headerDiv.className = 'song-header';
            
            // Lógica de expandir notas ao clicar
            headerDiv.onclick = function() {
                const notes = this.nextElementSibling;
                if (notes) notes.style.display = notes.style.display === 'none' ? 'block' : 'none';
            };

            // Checkbox para modo de seleção
            if (isSelectionMode) {
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'song-checkbox';
                checkbox.dataset.songData = JSON.stringify(song); // Guarda dados da música
                checkbox.onchange = updateSelectionCount;
                checkbox.onclick = (e) => e.stopPropagation(); // Evita abrir as notas ao marcar
                headerDiv.appendChild(checkbox);
            }

            const indexSpan = document.createElement('span');
            indexSpan.className = 'song-index';
            indexSpan.textContent = String(index + 1).padStart(2, '0');
            indexSpan.title = "Marcar como tocada";
            
            indexSpan.onclick = (e) => {
                e.stopPropagation();
                pushHistory();
                song.played = !song.played;
                saveData();
                listItem.classList.toggle('played');
            };

            const lyricsBtn = document.createElement('button');
            lyricsBtn.className = 'btn-lyrics';
            lyricsBtn.textContent = 'LETRA';
            if (song.lyrics) lyricsBtn.classList.add('has-lyrics');
            lyricsBtn.title = "Adicionar/Ver Letra";
            lyricsBtn.onclick = (e) => {
                e.stopPropagation();
                openLyricsModal(song);
            };

            const nameSpan = document.createElement('span');
            nameSpan.className = 'song-name';
            nameSpan.textContent = song.title;

            // RENDERIZAÇÃO DAS TAGS
            if (song.tags && song.tags.length > 0) {
                const tagsDiv = document.createElement('div');
                tagsDiv.className = 'song-tags';
                song.tags.forEach(tag => {
                    const span = document.createElement('span');
                    span.className = 'song-tag';
                    span.textContent = tag;
                    
                    // Cores automáticas baseadas no texto
                    const t = tag.toLowerCase();
                    if(t.includes('nova')) span.classList.add('tag-nova');
                    else if(t.includes('hit')) span.classList.add('tag-hit');
                    else if(t.includes('ensaio')) span.classList.add('tag-ensaio');
                    else if(t.includes('revisar')) span.classList.add('tag-revisar');
                    else if(t.includes('pout')) span.classList.add('tag-pout-pourri');
                    
                    tagsDiv.appendChild(span);
                });
                nameSpan.appendChild(tagsDiv);
            }

            const keySpan = document.createElement('span');
            keySpan.className = 'song-key';
            keySpan.textContent = song.key;
            
            let tooltip = "Clique para alterar o tom";
            if (previousKey && song.key !== '-' && previousKey.toUpperCase() === song.key.toUpperCase()) {
                keySpan.classList.add('same-key-sequence');
                tooltip = "🔗 Mesmo tom da anterior! " + tooltip;
            }
            previousKey = song.key;

            keySpan.title = tooltip;
            keySpan.onclick = (e) => {
                e.stopPropagation(); // Impede que abra as notas
                openKeyModal(song);
            };

            headerDiv.appendChild(indexSpan);
            headerDiv.appendChild(lyricsBtn);
            headerDiv.appendChild(nameSpan);
            headerDiv.appendChild(keySpan);
            listItem.appendChild(headerDiv);

            // Área de Notas (se houver)
            if (song.notes) {
                const notesDiv = document.createElement('div');
                notesDiv.className = 'song-notes-display';
                notesDiv.textContent = `OBS: ${song.notes}`;
                listItem.appendChild(notesDiv);
            }

            listUl.appendChild(listItem);
        });

        // Rodapé do Bloco
        const footerDiv = document.createElement('div');
        footerDiv.className = 'block-footer';
        footerDiv.textContent = `TOTAL FAIXAS: ${block.songs.length} // END OF DATA`;

        // Juntar tudo
        blockDiv.appendChild(headerDiv);
        blockDiv.appendChild(listUl);
        blockDiv.appendChild(footerDiv);
        container.appendChild(blockDiv);
    });

    // Resetar botão de alternar todos
    const toggleAllBtn = document.getElementById('btn-toggle-all');
    if(toggleAllBtn) toggleAllBtn.textContent = 'RECOLHER TODOS';

    // Reaplicar filtro se houver texto na busca
    filterRepertoire();
}

// FUNÇÕES DO EDITOR
const modal = document.getElementById('edit-modal');
const songsInputs = document.getElementById('songs-inputs');

function toggleAllBlocks() {
    const btn = document.getElementById('btn-toggle-all');
    const blocks = document.querySelectorAll('.block-container');
    const isCollapsing = btn.textContent.includes('RECOLHER');

    blocks.forEach(block => {
        const toggleBtn = block.querySelector('.btn-toggle');
        if (isCollapsing) {
            block.classList.add('collapsed');
            if (toggleBtn) toggleBtn.textContent = '+';
        } else {
            block.classList.remove('collapsed');
            if (toggleBtn) toggleBtn.textContent = '-';
        }
    });

    btn.textContent = isCollapsing ? 'EXPANDIR TODOS' : 'RECOLHER TODOS';
}

function filterRepertoire() {
    const input = document.getElementById('search-input');
    const counter = document.getElementById('stats-counter');
    if (!input) return;
    const term = input.value.toLowerCase();
    const blocks = document.querySelectorAll('.block-container');
    
    let visibleBlocks = 0;
    let visibleSongs = 0;

    blocks.forEach(block => {
        const text = block.innerText.toLowerCase();
        const isVisible = text.includes(term);
        block.style.display = isVisible ? 'block' : 'none';
        
        if (isVisible) {
            visibleBlocks++;
            visibleSongs += block.querySelectorAll('.song-item').length;
        }
    });

    counter.innerHTML = `EXIBINDO: <span>${visibleBlocks}</span> BLOCOS // <span>${visibleSongs}</span> MÚSICAS`;
}

// DRAG AND DROP LOGIC
songsInputs.addEventListener('dragover', e => {
    e.preventDefault();
    const afterElement = getDragAfterElement(songsInputs, e.clientY, '.song-row:not(.dragging)');
    const draggable = document.querySelector('.dragging');
    if (afterElement == null) {
        songsInputs.appendChild(draggable);
    } else {
        songsInputs.insertBefore(draggable, afterElement);
    }
});

// Lógica de Drag and Drop para os Blocos Principais
container.addEventListener('dragover', e => {
    e.preventDefault();
    const afterElement = getDragAfterElement(container, e.clientY, '.block-container:not(.dragging-block)');
    const draggable = document.querySelector('.dragging-block');
    if (draggable) {
        if (afterElement == null) {
            container.appendChild(draggable);
        } else {
            container.insertBefore(draggable, afterElement);
        }
    }
});

function openModal() {
    closeConfigModal(); // Fecha o menu de config se estiver aberto
    editingIndex = -1;
    modal.style.display = 'flex';
    document.getElementById('new-id').value = '';
    document.getElementById('new-rhythm').value = '';
    songsInputs.innerHTML = '';
    addSongInput(); // Adiciona um campo inicial
}

function editBlock(index) {
    editingIndex = index;
    const block = setlistData[index];
    document.getElementById('new-id').value = block.id;
    document.getElementById('new-rhythm').value = block.rhythm;
    
    songsInputs.innerHTML = '';
    block.songs.forEach(song => {
        const tagsStr = song.tags ? song.tags.join(', ') : '';
        addSongInput(song.title, song.key, song.notes, tagsStr);
    });
    
    modal.style.display = 'flex';
}

function deleteBlock(index) {
    if(confirm('Tem certeza que deseja excluir este bloco?')) {
        pushHistory();
        setlistData.splice(index, 1);
        saveData();
        renderSetlist();
    }
}

function closeModal() {
    modal.style.display = 'none';
}

// KEY TRANSPOSE LOGIC
function openKeyModal(song) {
    currentEditingSong = song;
    const modal = document.getElementById('key-modal');
    const input = document.getElementById('new-key-input');
    const title = document.getElementById('key-song-title');
    
    input.value = song.key;
    title.textContent = song.title;
    modal.style.display = 'flex';
    input.focus();
}

function closeKeyModal() {
    document.getElementById('key-modal').style.display = 'none';
    currentEditingSong = null;
}

let wasScrollingBeforeLyrics = false;

function openLyricsModal(song) {
    currentEditingSong = song;
    const modal = document.getElementById('lyrics-modal');
    const title = document.getElementById('lyrics-song-title');
    const input = document.getElementById('lyrics-input');
    const view = document.getElementById('lyrics-view');
    
    title.textContent = song.title;
    input.value = song.lyrics || '';
    view.textContent = song.lyrics || '(Sem letra cadastrada)';
    
    // Reseta para modo visualização ao abrir
    resetLyricsModalState();
    
    // Parar scroll do palco se estiver ativo para não interferir na leitura
    wasScrollingBeforeLyrics = isScrolling;
    if (isScrolling) {
        stopAutoScroll();
        const btn = document.getElementById('btn-scroll-toggle');
        if(btn) btn.textContent = '▶';
    }
    
    modal.style.display = 'flex';
}

function closeLyricsModal() {
    stopLyricsScroll(); // Para o scroll se estiver rodando
    document.getElementById('lyrics-modal').style.display = 'none';
    currentEditingSong = null;

    // Retomar scroll do palco se estava ativo e a config permitir
    const config = JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}');
    if (config.resumeScroll && wasScrollingBeforeLyrics) {
        startAutoScroll();
        const btn = document.getElementById('btn-scroll-toggle');
        if(btn) btn.textContent = '⏸';
    }
    wasScrollingBeforeLyrics = false;
}

function saveLyrics() {
    if (currentEditingSong) {
        pushHistory();
        const input = document.getElementById('lyrics-input');
        const view = document.getElementById('lyrics-view');
        currentEditingSong.lyrics = input.value;
        view.textContent = input.value; // Atualiza a view
        saveData();
        renderSetlist();
        toggleLyricsEditMode(); // Volta para o modo visualização
    }
}

function adjustLyricsFontSize(change) {
    // Ajusta tanto a view quanto o input
    const view = document.getElementById('lyrics-view');
    const input = document.getElementById('lyrics-input');
    
    let currentSize = parseFloat(window.getComputedStyle(view).fontSize);
    let newSize = currentSize + change;
    if (newSize < 10) newSize = 10;
    if (newSize > 60) newSize = 60;
    
    view.style.fontSize = `${newSize}px`;
    input.style.fontSize = `${newSize}px`;
}

let lyricsScrollInterval;
let isLyricsScrolling = false;
let lyricsScrollAccumulator = 0;

function toggleLyricsScroll() {
    const btn = document.getElementById('btn-lyrics-scroll');
    const view = document.getElementById('lyrics-view');
    const speedInput = document.getElementById('lyrics-scroll-speed');
    
    if (isLyricsScrolling) {
        stopLyricsScroll();
    } else {
        isLyricsScrolling = true;
        lyricsScrollAccumulator = 0;
        btn.textContent = '⏸ PAUSAR';
        btn.style.background = 'var(--primary)';
        btn.style.color = '#000';
        
        function scroll() {
            if (!isLyricsScrolling) return;
            
            let speed = speedInput ? parseFloat(speedInput.value) : 3;
            lyricsScrollAccumulator += speed * 0.2; // Fator de ajuste para suavidade
            
            if (lyricsScrollAccumulator >= 1) {
                const pixels = Math.floor(lyricsScrollAccumulator);
                view.scrollTop += pixels;
                lyricsScrollAccumulator -= pixels;
            }
            
            lyricsScrollInterval = requestAnimationFrame(scroll);
        }
        lyricsScrollInterval = requestAnimationFrame(scroll);
    }
}

function stopLyricsScroll() {
    isLyricsScrolling = false;
    cancelAnimationFrame(lyricsScrollInterval);
    const btn = document.getElementById('btn-lyrics-scroll');
    if(btn) {
        btn.textContent = '▶ SCROLL';
        btn.style.background = '';
        btn.style.color = '';
    }
}

function toggleLyricsEditMode() {
    const view = document.getElementById('lyrics-view');
    const input = document.getElementById('lyrics-input');
    const btnEdit = document.getElementById('btn-lyrics-edit-toggle');
    const btnSave = document.getElementById('btn-save-lyrics');
    const btnScroll = document.getElementById('btn-lyrics-scroll');

    if (input.style.display === 'none') {
        // Entrar no modo edição
        input.style.display = 'block';
        view.style.display = 'none';
        btnSave.style.display = 'inline-block';
        btnScroll.style.display = 'none'; // Esconde scroll na edição
        btnEdit.textContent = '👁 VISUALIZAR';
        stopLyricsScroll();
    } else {
        // Voltar para modo visualização
        input.style.display = 'none';
        view.style.display = 'block';
        btnSave.style.display = 'none';
        btnScroll.style.display = 'inline-block';
        btnEdit.textContent = '✏ EDITAR';
        // Atualiza view com o que estava no input (caso tenha editado mas não salvo, visualiza preview)
        view.textContent = input.value;
    }
}

function resetLyricsModalState() {
    const view = document.getElementById('lyrics-view');
    const input = document.getElementById('lyrics-input');
    const btnEdit = document.getElementById('btn-lyrics-edit-toggle');
    const btnSave = document.getElementById('btn-save-lyrics');
    const btnScroll = document.getElementById('btn-lyrics-scroll');

    input.style.display = 'none';
    view.style.display = 'block';
    btnSave.style.display = 'none';
    btnScroll.style.display = 'inline-block';
    btnEdit.textContent = '✏ EDITAR';
    stopLyricsScroll();
}

function saveKeyChange() {
    if (currentEditingSong) {
        pushHistory();
        const input = document.getElementById('new-key-input');
        currentEditingSong.key = input.value.toUpperCase() || '-';
        saveData();
        renderSetlist();
        closeKeyModal();
    }
}

function transposeKey(semitones) {
    const input = document.getElementById('new-key-input');
    let noteStr = input.value.trim();
    if (!noteStr) return;

    // Definição das escalas
    const scales = {
        'PT': ["DÓ", "DÓ#", "RÉ", "RÉ#", "MI", "FÁ", "FÁ#", "SOL", "SOL#", "LÁ", "LÁ#", "SI"],
        'EN': ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    };

    // Normalização de Bemóis para Sustenidos para facilitar o cálculo
    const flatMap = {
        "DB": "C#", "EB": "D#", "GB": "F#", "AB": "G#", "BB": "A#",
        "RÉB": "DÓ#", "MIB": "RÉ#", "SOLB": "FÁ#", "LÁB": "SOL#", "SIB": "LÁ#"
    };

    let upper = noteStr.toUpperCase();
    
    // Substitui bemóis se encontrar no início
    for (let flat in flatMap) {
        if (upper.startsWith(flat)) {
            upper = upper.replace(flat, flatMap[flat]);
            break;
        }
    }

    // Identificar escala e nota raiz
    // Ordenar por tamanho para pegar "SOL#" antes de "SOL"
    const allRoots = [...scales.PT, ...scales.EN].sort((a, b) => b.length - a.length);
    
    let root = "";
    let suffix = "";
    let scaleUsed = null;

    for (let r of allRoots) {
        if (upper.startsWith(r)) {
            root = r;
            suffix = noteStr.slice(r.length); // Preserva o sufixo original (m, 7, etc)
            scaleUsed = scales.PT.includes(r) ? 'PT' : 'EN';
            break;
        }
    }

    if (scaleUsed) {
        const currentScale = scales[scaleUsed];
        let idx = currentScale.indexOf(root);
        let newIdx = (idx + semitones) % 12;
        if (newIdx < 0) newIdx += 12;
        input.value = currentScale[newIdx] + suffix;
    }
}

function addSongInput(title = '', key = '', notes = '', tags = '') {
    const div = document.createElement('div');
    div.className = 'song-row';
    div.draggable = true;
    
    div.addEventListener('dragstart', () => div.classList.add('dragging'));
    div.addEventListener('dragend', () => div.classList.remove('dragging'));

    div.innerHTML = `
        <span class="drag-handle">☰</span>
        <input type="text" class="input-field song-title" placeholder="Nome da Música" value="${title}">
        <input type="text" class="input-field song-key" placeholder="Tom" value="${key}">
        <input type="text" class="input-field song-notes" placeholder="Obs" value="${notes}">
        <input type="text" class="input-field song-tags-input" placeholder="Tags (ex: Nova, Hit)" value="${tags}">
        <button class="btn-remove-song" onclick="this.parentElement.remove()" title="Remover música">X</button>
    `;
    songsInputs.appendChild(div);
}

function getDragAfterElement(container, y, selector) {
    const draggableElements = [...container.querySelectorAll(selector)];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function reorderBlocks() {
    pushHistory();
    const newSetlistData = [];
    const blocks = container.querySelectorAll('.block-container');
    
    blocks.forEach(blockDiv => {
        const originalIndex = parseInt(blockDiv.dataset.originalIndex);
        if (setlistData[originalIndex]) {
            newSetlistData.push(setlistData[originalIndex]);
        }
    });

    setlistData = newSetlistData;
    saveData();
    renderSetlist(); // Re-renderiza para atualizar os índices
}

function saveBlock() {
    const id = document.getElementById('new-id').value;
    const rhythm = document.getElementById('new-rhythm').value;
    const songRows = document.querySelectorAll('.song-row');
    const songs = [];

    songRows.forEach(row => {
        const title = row.querySelector('.song-title').value;
        const key = row.querySelector('.song-key').value;
        const notes = row.querySelector('.song-notes').value;
        const tagsStr = row.querySelector('.song-tags-input').value;
        const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(t => t) : [];
        if(title) songs.push({ title, key: key || '-', notes, tags });
    });

    if(id && songs.length > 0) {
        pushHistory();
        if(editingIndex > -1) {
            setlistData[editingIndex] = { id, rhythm, songs };
        } else {
            setlistData.push({ id, rhythm, songs });
        }
        saveData();
        renderSetlist();
        closeModal();
    } else {
        alert('Preencha o ID e adicione pelo menos uma música.');
    }
}

function exportRepertoire() {
    let content = "MENDES & MATEUS - REPERTÓRIO\n";
    content += "================================\n\n";

    const blocks = document.querySelectorAll('.block-container');
    let hasVisible = false;

    blocks.forEach(block => {
        // Verifica se o bloco está visível (respeitando o filtro de busca)
        if (block.style.display !== 'none') {
            hasVisible = true;
            const title = block.querySelector('.block-title').innerText;
            content += `[ ${title} ]\n`;
            
            const songs = block.querySelectorAll('.song-item');
            songs.forEach(song => {
                const index = song.querySelector('.song-index').innerText;
                const name = song.querySelector('.song-name').innerText;
                const key = song.querySelector('.song-key').innerText;
                content += `${index} - ${name} (${key})\n`;
            });
            content += "\n--------------------------------\n\n";
        }
    });

    if (!hasVisible) return alert("Nenhum repertório visível para exportar.");

    const blob = new Blob([content], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'repertorio_export.txt';
    link.click();
}

function exportRepertoirePDF() {
    if (typeof html2pdf === 'undefined') {
        return alert("Biblioteca PDF não carregada. Verifique sua conexão com a internet.");
    }

    // Cria um elemento temporário para o PDF (visual limpo para impressão)
    const element = document.createElement('div');
    element.style.padding = '20px';
    element.style.fontFamily = 'Helvetica, Arial, sans-serif';
    element.style.color = '#000';
    element.style.background = '#fff';
    element.style.width = '100%';

    // Cabeçalho do PDF
    const title = document.createElement('h1');
    title.textContent = document.getElementById('band-name-display').innerText || 'REPERTÓRIO';
    title.style.textAlign = 'center';
    title.style.fontSize = '24px';
    title.style.marginBottom = '5px';
    title.style.textTransform = 'uppercase';
    element.appendChild(title);

    const subtitle = document.createElement('div');
    subtitle.textContent = document.getElementById('band-subtitle-display').innerText || '';
    subtitle.style.textAlign = 'center';
    subtitle.style.fontSize = '12px';
    subtitle.style.marginBottom = '30px';
    subtitle.style.color = '#666';
    element.appendChild(subtitle);

    const blocks = document.querySelectorAll('.block-container');
    let hasVisible = false;

    blocks.forEach(block => {
        if (block.style.display !== 'none') {
            hasVisible = true;
            const blockTitle = block.querySelector('.block-title').innerText;
            
            const blockDiv = document.createElement('div');
            blockDiv.style.marginBottom = '20px';
            blockDiv.style.pageBreakInside = 'avoid'; // Evita quebra de bloco no meio

            const h3 = document.createElement('h3');
            h3.textContent = blockTitle;
            h3.style.borderBottom = '2px solid #000';
            h3.style.paddingBottom = '5px';
            h3.style.marginBottom = '10px';
            h3.style.fontSize = '16px';
            h3.style.textTransform = 'uppercase';
            blockDiv.appendChild(h3);

            const ul = document.createElement('ul');
            ul.style.listStyle = 'none';
            ul.style.padding = '0';
            ul.style.margin = '0';

            const songs = block.querySelectorAll('.song-item');
            songs.forEach(song => {
                const index = song.querySelector('.song-index').innerText;
                const name = song.querySelector('.song-name').innerText;
                const key = song.querySelector('.song-key').innerText;

                const li = document.createElement('li');
                li.style.display = 'flex';
                li.style.justifyContent = 'space-between';
                li.style.padding = '4px 0';
                li.style.borderBottom = '1px solid #eee';
                li.style.fontSize = '12px';
                
                li.innerHTML = `<span style="flex:1">${index} - ${name}</span><span style="font-weight:bold; margin-left:10px;">${key}</span>`;
                ul.appendChild(li);
            });

            blockDiv.appendChild(ul);
            element.appendChild(blockDiv);
        }
    });

    if (!hasVisible) return alert("Nenhum repertório visível para exportar.");

    const opt = {
        margin: 10,
        filename: 'repertorio_export.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
}

function shareViaWhatsApp() {
    let content = "*" + (document.getElementById('band-name-display').innerText || 'REPERTÓRIO') + "*\n";
    content += "_" + (document.getElementById('band-subtitle-display').innerText || '') + "_\n\n";

    const blocks = document.querySelectorAll('.block-container');
    let hasVisible = false;

    blocks.forEach(block => {
        // Verifica se o bloco está visível
        if (block.style.display !== 'none') {
            hasVisible = true;
            const title = block.querySelector('.block-title').innerText;
            content += `*[ ${title} ]*\n`; // Negrito no título do bloco
            
            const songs = block.querySelectorAll('.song-item');
            songs.forEach(song => {
                const index = song.querySelector('.song-index').innerText;
                const name = song.querySelector('.song-name').innerText;
                const key = song.querySelector('.song-key').innerText;
                // Formato: 01. Nome da Música (TOM)
                content += `${index}. ${name} *(${key})*\n`;
            });
            content += "\n";
        }
    });

    if (!hasVisible) return alert("Nenhum repertório visível para compartilhar.");

    // Codifica o texto para URL e abre o WhatsApp
    const url = `https://wa.me/?text=${encodeURIComponent(content)}`;
    window.open(url, '_blank');
}

function copyRepertoireToClipboard() {
    let content = (document.getElementById('band-name-display').innerText || 'REPERTÓRIO') + "\n";
    content += (document.getElementById('band-subtitle-display').innerText || '') + "\n\n";

    const blocks = document.querySelectorAll('.block-container');
    let hasVisible = false;

    blocks.forEach(block => {
        if (block.style.display !== 'none') {
            hasVisible = true;
            const title = block.querySelector('.block-title').innerText;
            content += `[ ${title} ]\n`;
            
            const songs = block.querySelectorAll('.song-item');
            songs.forEach(song => {
                const index = song.querySelector('.song-index').innerText;
                const name = song.querySelector('.song-name').innerText;
                const key = song.querySelector('.song-key').innerText;
                content += `${index} - ${name} (${key})\n`;
            });
            content += "\n";
        }
    });

    if (!hasVisible) return alert("Nenhum repertório visível para copiar.");

    navigator.clipboard.writeText(content).then(() => {
        alert("Repertório copiado para a área de transferência!");
    }).catch(err => {
        console.error('Erro ao copiar: ', err);
        alert("Erro ao copiar para a área de transferência.");
    });
}

function toggleStageMode() {
    document.body.classList.toggle('presentation-mode');
    const btn = document.getElementById('btn-stage-mode');
    if (document.body.classList.contains('presentation-mode')) {
        btn.textContent = 'SAIR DO PALCO';
    } else {
        btn.textContent = 'MODO PALCO';
        stopAutoScroll(); // Para o scroll ao sair do modo palco
        document.getElementById('btn-scroll-toggle').textContent = '▶';
    }
}

// AUTOSCROLL LOGIC
let scrollInterval;
let isScrolling = false;
let scrollSpeed = 1.0;
let scrollAccumulator = 0;

function toggleAutoScroll() {
    const btn = document.getElementById('btn-scroll-toggle');
    if (isScrolling) {
        stopAutoScroll();
        btn.textContent = '▶';
    } else {
        startAutoScroll();
        btn.textContent = '⏸';
    }
}

function startAutoScroll() {
    if (isScrolling) return;
    isScrolling = true;
    scrollAccumulator = 0;
    
    function scrollStep() {
        if (!isScrolling) return;
        
        scrollAccumulator += scrollSpeed * 0.05; // Acumula o valor fracionado (Mais lento para ajuste fino)
        if (Math.abs(scrollAccumulator) >= 1) {
            const pixels = Math.trunc(scrollAccumulator);
            window.scrollBy(0, pixels);
            scrollAccumulator -= pixels;

            // Verifica se chegou ao fim da página (descendo) ou topo (subindo)
            if (scrollSpeed > 0 && (window.innerHeight + Math.ceil(window.scrollY)) >= document.documentElement.scrollHeight) {
                stopAutoScroll();
                const btn = document.getElementById('btn-scroll-toggle');
                if(btn) btn.textContent = '▶';
                return;
            } else if (scrollSpeed < 0 && window.scrollY <= 0) {
                stopAutoScroll();
                const btn = document.getElementById('btn-scroll-toggle');
                if(btn) btn.textContent = '▶';
                return;
            }
        }
        scrollInterval = requestAnimationFrame(scrollStep);
    }
    scrollInterval = requestAnimationFrame(scrollStep);
}

function stopAutoScroll() {
    isScrolling = false;
    cancelAnimationFrame(scrollInterval);
}

function updateScrollSpeed() {
    const input = document.getElementById('scroll-speed');
    const label = document.getElementById('speed-label');
    scrollSpeed = parseFloat(input.value);
    label.textContent = `VEL: ${scrollSpeed.toFixed(1)}`;
    localStorage.setItem(SCROLL_SPEED_KEY, scrollSpeed);
}

function loadScrollSpeed() {
    const saved = localStorage.getItem(SCROLL_SPEED_KEY);
    if (saved !== null) {
        scrollSpeed = parseFloat(saved);
        const input = document.getElementById('scroll-speed');
        const label = document.getElementById('speed-label');
        if (input) input.value = scrollSpeed;
        if (label) label.textContent = `VEL: ${scrollSpeed.toFixed(1)}`;
    }
}

function adjustSpeed(amount) {
    const input = document.getElementById('scroll-speed');
    let newValue = parseFloat(input.value) + amount;
    const min = parseFloat(input.min);
    const max = parseFloat(input.max);
    
    if (newValue < min) newValue = min;
    if (newValue > max) newValue = max;
    
    input.value = newValue;
    updateScrollSpeed();
    showSpeedToast(newValue);
}

let toastTimeout;
function showSpeedToast(value) {
    const toast = document.getElementById('speed-toast');
    if (toast) {
        toast.textContent = `VEL: ${value.toFixed(1)}`;
        toast.classList.add('show');
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 800);
    }
}

function togglePanic() {
    const body = document.body;
    if (body.classList.contains('panic-active')) {
        body.classList.remove('panic-active');
    } else {
        stopAutoScroll();
        const btn = document.getElementById('btn-scroll-toggle');
        if(btn) btn.textContent = '▶';
        body.classList.add('panic-active');
    }
}

// THEME LOGIC
function loadTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'default';
    const selector = document.getElementById('theme-selector');
    if(selector) selector.value = savedTheme;
    applyTheme(savedTheme);
}

function changeTheme(theme) {
    applyTheme(theme);
    localStorage.setItem(THEME_KEY, theme);
}

function applyTheme(theme) {
    document.body.classList.remove('theme-blue', 'theme-light', 'theme-yellow', 'theme-white', 'theme-red', 'theme-black', 'theme-custom');
    
    // Limpa estilos inline de temas anteriores
    document.body.style.removeProperty('--primary');
    document.body.style.removeProperty('--secondary');
    document.body.style.removeProperty('--grid-color');

    const picker = document.getElementById('custom-color-picker');
    if (picker) picker.style.display = (theme === 'custom') ? 'inline-block' : 'none';

    if (theme === 'custom') {
        document.body.classList.add('theme-custom');
        const color = localStorage.getItem(CUSTOM_COLOR_KEY) || '#00ff00';
        if (picker) picker.value = color;
        
        document.body.style.setProperty('--primary', color);
        document.body.style.setProperty('--secondary', '#ffffff'); // Contraste padrão
        
        const rgb = hexToRgb(color);
        if (rgb) {
            document.body.style.setProperty('--grid-color', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.05)`);
        }
    } else if (theme !== 'default') {
        document.body.classList.add(theme);
    }
}

function updateCustomColor(color) {
    localStorage.setItem(CUSTOM_COLOR_KEY, color);
    applyTheme('custom');
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// SETLIST MANAGEMENT LOGIC
function initSystem() {
    // Migração de dados antigos para o novo sistema
    if (!localStorage.getItem(META_KEY)) {
        const oldData = localStorage.getItem(STORAGE_KEY);
        let initialData = defaultData;
        try {
            if (oldData) initialData = JSON.parse(oldData);
        } catch (e) {
            console.error("Erro na migração de dados:", e);
        }
        
        const meta = [{ id: 'default', name: 'REPERTÓRIO PRINCIPAL' }];
        localStorage.setItem(META_KEY, JSON.stringify(meta));
        localStorage.setItem(CURRENT_ID_KEY, 'default');
        localStorage.setItem(DATA_PREFIX + 'default', JSON.stringify(initialData));
    }
    
    currentSetlistId = localStorage.getItem(CURRENT_ID_KEY) || 'default';
    loadSetlistData();
    renderSetlistSelector();
}

function loadSetlistData() {
    const raw = localStorage.getItem(DATA_PREFIX + currentSetlistId);
    try {
        setlistData = raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.error("Erro ao carregar dados do setlist:", e);
        setlistData = [];
    }
    renderSetlist();
}

function saveData() {
    try {
        localStorage.setItem(DATA_PREFIX + currentSetlistId, JSON.stringify(setlistData));
    } catch (e) {
        console.error("Erro ao salvar dados:", e);
        alert("Erro ao salvar! Verifique se o armazenamento do navegador está cheio.");
    }
}

function renderSetlistSelector() {
    const meta = JSON.parse(localStorage.getItem(META_KEY) || '[]');
    const selector = document.getElementById('setlist-selector');
    selector.innerHTML = '';
    
    meta.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = item.name;
        if (item.id === currentSetlistId) option.selected = true;
        selector.appendChild(option);
    });
}

function switchSetlist(id) {
    currentSetlistId = id;
    localStorage.setItem(CURRENT_ID_KEY, id);
    loadSetlistData();
    historyStack = [];
    redoStack = [];
}

function createNewSetlist() {
    const name = prompt("Nome do novo repertório:");
    if (name) {
        const id = 'setlist_' + Date.now();
        const meta = JSON.parse(localStorage.getItem(META_KEY) || '[]');
        meta.push({ id, name });
        localStorage.setItem(META_KEY, JSON.stringify(meta));
        localStorage.setItem(DATA_PREFIX + id, '[]'); // Inicia vazio
        
        renderSetlistSelector();
        switchSetlist(id);
    }
}

function deleteCurrentSetlist() {
    const meta = JSON.parse(localStorage.getItem(META_KEY) || '[]');
    if (meta.length <= 1) return alert("Você não pode excluir o único repertório existente.");
    
    if (confirm("Tem certeza que deseja excluir o repertório atual? Esta ação não pode ser desfeita.")) {
        localStorage.removeItem(DATA_PREFIX + currentSetlistId);
        
        const newMeta = meta.filter(item => item.id !== currentSetlistId);
        localStorage.setItem(META_KEY, JSON.stringify(newMeta));
        
        switchSetlist(newMeta[0].id);
        renderSetlistSelector();
    }
}

// CONFIGURATION LOGIC
function loadConfig() {
    const saved = localStorage.getItem(CONFIG_KEY);
    const config = saved ? JSON.parse(saved) : { 
        name: 'MENDES & MATEUS', 
        subtitle: '>> MODO: PASSAGEM DE SOM // STATUS: ONLINE',
        marquee: '',
        panicMessage: 'PAUSA TÉCNICA',
        footerText: '/// MENDES & MATEUS REPERTÓRIO ///',
        marqueeSpeed: 20,
        resumeScroll: false
    };
    
    const nameDisplay = document.getElementById('band-name-display');
    const subDisplay = document.getElementById('band-subtitle-display');
    const marqueeDisplay = document.getElementById('marquee-text-display');
    const panicDisplay = document.getElementById('panic-overlay');
    const footerDisplay = document.getElementById('footer-text-display');
    const marqueeContent = document.querySelector('.marquee-content');
    
    // Aplica estilo especial ao "&" se existir
    if(nameDisplay) {
        nameDisplay.innerHTML = config.name.replace(/&/g, '<span>&</span>');
        nameDisplay.setAttribute('data-text', config.name);
    }
    if(subDisplay) subDisplay.textContent = config.subtitle;
    if(marqueeDisplay) marqueeDisplay.textContent = config.marquee || '';
    if(panicDisplay) panicDisplay.textContent = config.panicMessage || 'PAUSA TÉCNICA';
    if(footerDisplay) footerDisplay.textContent = config.footerText || '/// MENDES & MATEUS REPERTÓRIO ///';
    if(marqueeContent) {
        marqueeContent.style.animationDuration = (config.marqueeSpeed || 20) + 's';
    }
}

function openConfigModal() {
    const modal = document.getElementById('config-modal');
    const nameInput = document.getElementById('config-band-name');
    const subInput = document.getElementById('config-band-subtitle');
    const marqueeInput = document.getElementById('config-marquee-text');
    const panicInput = document.getElementById('config-panic-message');
    const footerInput = document.getElementById('config-footer-text');
    const marqueeSpeedInput = document.getElementById('config-marquee-speed');
    const resumeScrollInput = document.getElementById('config-resume-scroll');
    
    // Pega o texto atual (sem HTML) para preencher o input
    const currentName = document.getElementById('band-name-display').innerText;
    const currentSub = document.getElementById('band-subtitle-display').innerText;
    // Usa textContent para garantir leitura mesmo se elemento estiver oculto
    const currentMarquee = document.getElementById('marquee-text-display').textContent;
    const currentPanic = document.getElementById('panic-overlay').textContent;
    const currentFooter = document.getElementById('footer-text-display').textContent;
    
    const savedConfig = JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}');
    
    nameInput.value = currentName;
    subInput.value = currentSub;
    marqueeInput.value = currentMarquee;
    panicInput.value = currentPanic;
    footerInput.value = currentFooter;
    marqueeSpeedInput.value = savedConfig.marqueeSpeed || 20;
    if(resumeScrollInput) resumeScrollInput.checked = savedConfig.resumeScroll || false;
    
    modal.style.display = 'flex';
}

function closeConfigModal() {
    document.getElementById('config-modal').style.display = 'none';
}

function saveConfig() {
    const name = document.getElementById('config-band-name').value;
    const subtitle = document.getElementById('config-band-subtitle').value;
    const marquee = document.getElementById('config-marquee-text').value;
    const panicMessage = document.getElementById('config-panic-message').value;
    const footerText = document.getElementById('config-footer-text').value;
    const marqueeSpeed = document.getElementById('config-marquee-speed').value;
    const resumeScroll = document.getElementById('config-resume-scroll').checked;
    
    const config = { name, subtitle, marquee, panicMessage, footerText, marqueeSpeed, resumeScroll };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    
    loadConfig();
    closeConfigModal();
}

// Executar
initSystem();
loadTheme();
loadConfig();
loadScrollSpeed();

// TIMER LOGIC
let timerSeconds = 0;
let timerInterval = null;

function formatTime(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

function updateTimerDisplay() {
    const display = document.getElementById('timer-display');
    if(display) display.textContent = formatTime(timerSeconds);
}

function saveTimerState() {
    const state = {
        seconds: timerSeconds,
        isRunning: !!timerInterval,
        timestamp: Date.now()
    };
    try {
        localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        // Falha silenciosa para o timer para não interromper o fluxo
    }
}

function loadTimerState() {
    const saved = localStorage.getItem(TIMER_STORAGE_KEY);
    if (saved) {
        try {
            const state = JSON.parse(saved);
            timerSeconds = state.seconds || 0;
            
            if (state.isRunning) {
                const elapsed = Math.floor((Date.now() - state.timestamp) / 1000);
                timerSeconds += elapsed > 0 ? elapsed : 0;
                updateTimerDisplay();
                toggleTimer(); // Retomar contagem
            } else {
                updateTimerDisplay();
            }
        } catch (e) {
            console.error("Erro ao carregar timer:", e);
        }
    }
}

function toggleTimer() {
    const btn = document.getElementById('btn-timer-toggle');
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        btn.textContent = '▶';
        saveTimerState();
    } else {
        timerInterval = setInterval(() => {
            timerSeconds++;
            updateTimerDisplay();
            saveTimerState();
        }, 1000);
        btn.textContent = '⏸';
        saveTimerState();
    }
}

function resetTimer() {
    if(timerInterval) toggleTimer(); // Pausa se estiver rodando
    timerSeconds = 0;
    updateTimerDisplay();
    localStorage.removeItem(TIMER_STORAGE_KEY);
}

// QUICK SETLIST LOGIC
function toggleSelectionMode() {
    isSelectionMode = !isSelectionMode;
    const btn = document.getElementById('btn-quick-select');
    const bar = document.getElementById('selection-bar');
    
    if (isSelectionMode) {
        btn.textContent = 'CANCELAR SELEÇÃO';
        btn.style.borderColor = 'red';
        btn.style.color = 'red';
        bar.style.display = 'flex';
    } else {
        btn.textContent = 'SETLIST RÁPIDO';
        btn.style.borderColor = '';
        btn.style.color = '';
        bar.style.display = 'none';
    }
    renderSetlist();
}

function updateSelectionCount() {
    const count = document.querySelectorAll('.song-checkbox:checked').length;
    document.getElementById('selection-count').textContent = `${count} MÚSICAS SELECIONADAS`;
}

function finishSelection() {
    const checkboxes = document.querySelectorAll('.song-checkbox:checked');
    if (checkboxes.length === 0) return alert("Selecione pelo menos uma música.");

    const selectedSongs = Array.from(checkboxes).map(cb => JSON.parse(cb.dataset.songData));
    
    const date = new Date();
    const dateStr = `${date.getDate()}/${date.getMonth()+1}`;
    const name = prompt("Nome do Setlist Rápido:", `Show ${dateStr}`);
    
    if (name) {
        const id = 'setlist_' + Date.now();
        const meta = JSON.parse(localStorage.getItem(META_KEY) || '[]');
        
        // Cria novo setlist com um único bloco contendo as músicas selecionadas
        const newSetlistData = [{
            id: "SHOW",
            rhythm: "SEQUÊNCIA",
            songs: selectedSongs
        }];

        meta.push({ id, name });
        localStorage.setItem(META_KEY, JSON.stringify(meta));
        localStorage.setItem(DATA_PREFIX + id, JSON.stringify(newSetlistData));
        
        toggleSelectionMode(); // Sai do modo de seleção
        renderSetlistSelector();
        switchSetlist(id); // Vai para o novo setlist
    }
}

// Carregar estado do timer
loadTimerState();

// KEYBOARD SHORTCUTS
document.addEventListener('keydown', (e) => {
    // Ignora se estiver interagindo com inputs
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

    if (e.code === 'Space') {
        e.preventDefault(); // Previne rolagem padrão
        toggleVisibleBlock();
    }
    
    // Undo/Redo Shortcuts
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
    }
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') {
        e.preventDefault();
        redo();
    }

    // Atalhos para Modo Palco (Velocidade)
    if (document.body.classList.contains('presentation-mode')) {
        if (e.code === 'Escape') {
            e.preventDefault();
            toggleStageMode();
        } else if (e.code === 'ArrowUp') {
            e.preventDefault();
            adjustSpeed(0.1);
        } else if (e.code === 'ArrowDown') {
            e.preventDefault();
            adjustSpeed(-0.1);
        }
    }
});

function toggleVisibleBlock() {
    const blocks = document.querySelectorAll('.block-container');
    const header = document.querySelector('header');
    const headerHeight = header ? header.getBoundingClientRect().height : 0;
    
    let activeBlock = null;
    let minDistance = Infinity;

    blocks.forEach(block => {
        const rect = block.getBoundingClientRect();
        // Encontra o bloco cujo topo está mais próximo da parte inferior do cabeçalho
        const distance = Math.abs(rect.top - headerHeight);
        
        if (distance < minDistance) {
            minDistance = distance;
            activeBlock = block;
        }
    });

    if (activeBlock) {
        const btn = activeBlock.querySelector('.btn-toggle');
        if (btn) {
            activeBlock.classList.toggle('collapsed');
            btn.textContent = activeBlock.classList.contains('collapsed') ? '+' : '-';
            
            // Se expandir, ajusta o scroll para garantir visibilidade do título
            if (!activeBlock.classList.contains('collapsed')) {
                const y = activeBlock.getBoundingClientRect().top + window.scrollY - headerHeight - 10;
                window.scrollTo({ top: y, behavior: 'smooth' });
            }
        }
    }
}

function logout() {
    if (confirm("Deseja realmente sair do sistema?")) {
        localStorage.removeItem('isAuthenticated');
        window.location.href = 'login.html';
    }
}

function backupSystemData() {
    const backup = {};
    // Itera sobre todas as chaves do LocalStorage
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        // Filtra apenas as chaves do sistema (começam com 'repertorio_')
        if (key.startsWith('repertorio_')) {
            backup[key] = localStorage.getItem(key);
        }
    }

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const date = new Date().toISOString().slice(0, 10); // Formato YYYY-MM-DD
    link.download = `backup_system_vaquejada_${date}.json`;
    link.click();
}

function triggerRestore() {
    document.getElementById('restore-input').click();
}

function restoreBackup(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const backup = JSON.parse(e.target.result);
            
            if (confirm("ATENÇÃO: Isso substituirá TODOS os dados atuais pelo backup selecionado. Essa ação é irreversível. Deseja continuar?")) {
                // 1. Limpa dados atuais do sistema (apenas chaves que começam com o prefixo do app)
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('repertorio_')) {
                        localStorage.removeItem(key);
                    }
                });

                // 2. Restaura dados do backup
                Object.keys(backup).forEach(key => {
                    localStorage.setItem(key, backup[key]);
                });

                alert("Sistema restaurado com sucesso! A página será recarregada.");
                window.location.reload();
            }
        } catch (err) {
            alert("Erro ao ler arquivo de backup: O arquivo pode estar corrompido ou inválido.\nDetalhes: " + err.message);
        }
    };
    reader.readAsText(file);
    input.value = ''; // Reseta o input para permitir selecionar o mesmo arquivo novamente se necessário
}

function openImportModal() {
    closeConfigModal(); // Fecha o menu de config se estiver aberto
    document.getElementById('import-modal').style.display = 'flex';
    document.getElementById('import-text-area').value = '';
    document.getElementById('import-file-input').value = '';
}

function closeImportModal() {
    document.getElementById('import-modal').style.display = 'none';
}

function handleFileImport(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('import-text-area').value = e.target.result;
    };
    reader.readAsText(file);
}

function processImport(replace = false) {
    const text = document.getElementById('import-text-area').value;
    if (!text.trim()) return alert("A área de texto está vazia.");

    const newBlocks = parseImportedText(text);
    
    if (newBlocks.length === 0) return alert("Não foi possível identificar músicas no texto.");

    const msg = replace 
        ? `ATENÇÃO: Isso apagará todo o repertório atual e substituirá pelos ${newBlocks.length} novos blocos. Deseja continuar?`
        : `Foram identificados ${newBlocks.length} blocos. Deseja adicionar ao repertório atual?`;

    if (confirm(msg)) {
        pushHistory();
        if (replace) {
            setlistData = newBlocks;
        } else {
            setlistData = setlistData.concat(newBlocks);
        }
        saveData();
        renderSetlist();
        closeImportModal();
        alert("Importação concluída com sucesso!");
    }
}

function parseImportedText(text) {
    const lines = text.split(/\r?\n/);
    const blocks = [];
    let currentBlock = { id: `IMP-${Date.now().toString().slice(-4)}`, rhythm: "IMPORTADO", songs: [] };
    
    const finalizeBlock = (blk) => {
        if (blk.songs.length > 0) {
            if (blk.rhythm === "IMPORTADO") {
                const guessed = guessRhythm(blk.songs);
                if (guessed) blk.rhythm = guessed + " (AUTO)";
            }
            blocks.push(blk);
        }
    };

    lines.forEach(line => {
        line = line.trim();
        if (!line) {
            // Linha vazia pode indicar fim de bloco se o anterior tiver músicas
            if (currentBlock.songs.length > 0) {
                finalizeBlock(currentBlock);
                currentBlock = { id: `IMP-${Date.now().toString().slice(-4)}`, rhythm: "IMPORTADO", songs: [] };
            }
            return;
        }

        // Tenta detectar se é um cabeçalho de bloco (ex: [FORRÓ] ou BLOCO X)
        if (line.startsWith('[') || line.toUpperCase().startsWith('BLOCO') || (line === line.toUpperCase() && !line.includes('-') && line.length < 30)) {
            if (currentBlock.songs.length > 0) {
                finalizeBlock(currentBlock);
            }
            currentBlock = { id: "NOVO", rhythm: line.replace(/[\[\]]/g, ''), songs: [] };
            return;
        }

        // Processa música e tom
        // Padrões comuns: "Música - Tom", "Música (Tom)", "Música"
        let title = line;
        let key = "-";

        // Tenta extrair tom no final (ex: Sol, G, Cm)
        const keyRegex = /[\-\(]\s*([A-G][#b]?m?|[DdRmMfFsSlL][óéíá]?[#b]?m?)\s*[\)]?$/i;
        const match = line.match(keyRegex);

        if (match) {
            key = match[1].toUpperCase();
            title = line.replace(match[0], '').trim();
        }

        currentBlock.songs.push({ title: title, key: key });
    });

    // Adiciona o último bloco se tiver músicas
    if (currentBlock.songs.length > 0) {
        finalizeBlock(currentBlock);
    }

    return blocks;
}

function guessRhythm(songs) {
    const keywords = {
        "VAQUEJADA": ["VAQUEIRO", "GADO", "BOI", "CAVALO", "SELA", "PERNEIRA", "GIBÃO", "VAQUEJADA", "CORRIDA", "MANDACARU"],
        "FORRÓ": ["FORRÓ", "SANFONA", "BAIÃO", "XOTE", "ARRASTA", "FOGUEIRA", "SÃO JOÃO", "NORDESTE"],
        "PISEIRO": ["PISEIRO", "PAREDÃO", "TARCISIO", "BIU", "ZÉ VAQUEIRO", "VITOR FERNANDES", "JOÃO GOMES"],
        "ROMÂNTICO": ["AMOR", "CORAÇÃO", "PAIXÃO", "SAUDADE", "TE AMO", "VIDA", "LOVE"],
        "VANERÃO": ["VANERÃO", "VANERA", "RIO GRANDE", "GAÚCHO"]
    };

    const scores = {};

    songs.forEach(song => {
        const title = song.title.toUpperCase();
        for (const [rhythm, words] of Object.entries(keywords)) {
            words.forEach(word => {
                if (title.includes(word)) {
                    scores[rhythm] = (scores[rhythm] || 0) + 1;
                }
            });
        }
    });

    let bestRhythm = null;
    let maxScore = 0;

    for (const [rhythm, score] of Object.entries(scores)) {
        if (score > maxScore) {
            maxScore = score;
            bestRhythm = rhythm;
        }
    }

    return bestRhythm;
}

function toggleMobileMenu() {
    const controls = document.querySelector('.header-controls');
    const btn = document.getElementById('btn-menu-toggle');
    controls.classList.toggle('active');
    btn.textContent = controls.classList.contains('active') ? '✕' : '☰';
}

// =========================================
// LÓGICA DE CONTROLE REMOTO (PEERJS)
// =========================================

let peer = null;
let conn = null;

function initRemoteSystem() {
    const urlParams = new URLSearchParams(window.location.search);
    const remoteId = urlParams.get('remote');

    if (remoteId) {
        // MODO CLIENTE (CELULAR)
        document.getElementById('remote-interface').style.display = 'flex';
        document.querySelector('header').style.display = 'none';
        document.querySelector('.container').style.display = 'none';
        document.querySelector('footer').style.display = 'none';
        
        peer = new Peer();
        peer.on('open', (id) => {
            conn = peer.connect(remoteId);
            conn.on('open', () => {
                document.getElementById('remote-feedback').textContent = "CONECTADO AO PALCO";
                document.getElementById('remote-feedback').style.color = "#0f0";
            });
            conn.on('error', (err) => alert("Erro na conexão: " + err));
        });
    }
}

function openRemoteConnectModal() {
    closeConfigModal();
    const modal = document.getElementById('remote-modal');
    const qrContainer = document.getElementById('qrcode');
    const status = document.getElementById('remote-status');
    
    modal.style.display = 'flex';
    qrContainer.innerHTML = '';
    status.textContent = "GERANDO ID...";

    if (!peer) {
        peer = new Peer();
        peer.on('open', (id) => {
            const url = `${window.location.href.split('?')[0]}?remote=${id}`;
            new QRCode(qrContainer, {
                text: url,
                width: 200,
                height: 200
            });
            status.textContent = "PRONTO PARA CONEXÃO";
        });

        peer.on('connection', (c) => {
            conn = c;
            status.textContent = "CELULAR CONECTADO!";
            status.style.color = "#0f0";
            setupReceiver();
        });
    } else {
        // Se já existe peer, apenas regenera o QR com o ID atual
        const url = `${window.location.href.split('?')[0]}?remote=${peer.id}`;
        new QRCode(qrContainer, { text: url, width: 200, height: 200 });
        status.textContent = "AGUARDANDO...";
    }
}

function setupReceiver() {
    conn.on('data', (data) => {
        console.log("Comando recebido:", data);
        switch(data.action) {
            case 'scroll_toggle': toggleAutoScroll(); break;
            case 'panic': togglePanic(); break;
            case 'speed_up': adjustSpeed(0.1); break;
            case 'speed_down': adjustSpeed(-0.1); break;
            case 'stage_mode': toggleStageMode(); break;
            case 'next_block': scrollBlock(1); break;
            case 'prev_block': scrollBlock(-1); break;
            case 'blackout': changeTheme('theme-black'); break;
            case 'message': showRemoteMessage(data.text); break;
            case 'reset_timer': resetTimer(); break;
        }
    });
}

function sendRemote(action, payload = null) {
    if (conn && conn.open) {
        conn.send({ action: action, text: payload });
        // Feedback visual de clique
        navigator.vibrate(50); 
    } else {
        alert("Não conectado ao palco.");
    }
}

function sendRemoteMessage() {
    const input = document.getElementById('remote-msg-input');
    const text = input.value.trim();
    if (text) {
        sendRemote('message', text);
        input.value = '';
    }
}

let messageTimeout;
function showRemoteMessage(text) {
    const el = document.getElementById('remote-message-overlay');
    el.textContent = text;
    el.style.display = 'block';
    
    clearTimeout(messageTimeout);
    messageTimeout = setTimeout(() => {
        el.style.display = 'none';
    }, 5000); // Exibe por 5 segundos
}

function scrollBlock(direction) {
    // Simples scroll de página por enquanto
    window.scrollBy({
        top: direction * window.innerHeight * 0.8,
        behavior: 'smooth'
    });
}

// Inicializa verificação remota
initRemoteSystem();