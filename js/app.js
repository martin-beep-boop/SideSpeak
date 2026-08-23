document.addEventListener('DOMContentLoaded', () => {

    const SUPABASE_URL = 'https://rqukjzrvuiglzogfvlyo.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_Gew9IZGDBe1auui9YpkC6g_jzce27c4';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const faceShapes = [
        { id: 'circle', label: 'Circle' },
        { id: 'squircle', label: 'Squircle' },
        { id: 'softSquare', label: 'Soft Sq' },
        { id: 'wide', label: 'Wide' },
        { id: 'tall', label: 'Tall' },
        { id: 'hexagon', label: 'Hexagon' },
        { id: 'bean', label: 'Bean' },
        { id: 'pebble', label: 'Pebble' },
        { id: 'blob', label: 'Blob' }
    ];

    const eyeStyles = [
        { id: 'pupils', label: 'Pupils' },
        { id: 'bigPupils', label: 'Big P.' },
        { id: 'sparkle', label: 'Sparkle' },
        { id: 'small', label: 'Small' },
        { id: 'uneven', label: 'Uneven' },
        { id: 'tallPupils', label: 'Tall P.' },
        { id: 'lookSide', label: 'Side' },
        { id: 'lookDown', label: 'Down' },
        { id: 'lookUp', label: 'Up' },
        { id: 'happy', label: 'Happy' },
        { id: 'closed', label: 'Closed' },
        { id: 'wink', label: 'Wink' },
        { id: 'squint', label: 'Squint' },
        { id: 'sleepy', label: 'Sleepy' },
        { id: 'calm', label: 'Calm' },
        { id: 'angry', label: 'Angry' }
    ];

    const mouthStyles = [
        { id: 'smile', label: 'Smile' },
        { id: 'wide', label: 'Wide' },
        { id: 'bigSmile', label: 'Big S.' },
        { id: 'smileOpen', label: 'Open S.' },
        { id: 'grin', label: 'Grin' },
        { id: 'cat', label: 'Cat' },
        { id: 'smirk', label: 'Smirk' },
        { id: 'open', label: 'Open' },
        { id: 'gasp', label: 'Gasp' },
        { id: 'line', label: 'Line' },
        { id: 'frown', label: 'Frown' },
        { id: 'wavy', label: 'Wavy' },
        { id: 'tongue', label: 'Tongue' },
        { id: 'laugh', label: 'Laugh' },
        { id: 'teeth', label: 'Teeth' }
    ];

    const bgColorsList = ['0369a1', '2563eb', '7c3aed', 'db2777', '059669', 'd97706', '475569'];
    const faceColorsList = ['7dd3fc', 'a5b4fc', 'c4b5fd', 'f0abfc', 'fda4af', 'fca5a5', 'fdba74', 'fcd34d', 'bef264', '6ee7b9', '5eead4', 'e2e8f0'];

    let userRole = "";
    let currentStudentId = "";
    let currentStudentName = "";
    let selectedAvatar = "";
    let pendingRemovalId = null;
    let currentWord = null;
    let currentTier = "";
    let currentStars = "";
    let currentBaseline = 50;
    let currentBonusMax = 100;
    let currentLivePoints = 150;
    let timerInterval = null;
    let timeLeft = 120;
    let lastProcessedStateStatus = "";

    let selectedFace = 'squircle';
    let selectedEyes = 'pupils';
    let selectedMouth = 'smile';
    let selectedBgColor = '0369a1';
    let selectedFaceColor = '7dd3fc';

    function getDiceBearUrl(seed, face = selectedFace, eyes = selectedEyes, mouth = selectedMouth, backgroundColor = selectedBgColor, faceColor = selectedFaceColor) {
        return `https://api.dicebear.com/10.x/moods/svg?seed=${encodeURIComponent(seed)}&faceVariant[]=${face}&eyesVariant[]=${eyes}&mouthVariant[]=${mouth}&backgroundColor[]=${backgroundColor}&faceColor[]=${faceColor}`;
    }

    function switchScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
        
        const tutorDash = document.getElementById('tutor-dashboard-screen');
        const sidebar = document.getElementById('right-sidebar-wrapper');
        if (sidebar) {
            if (tutorDash && tutorDash.classList.contains('active')) {
                sidebar.classList.remove('hidden');
            } else {
                sidebar.classList.add('hidden');
            }
        }
    }
    window.switchScreen = switchScreen;

    async function getStudentsStore() {
        try {
            const { data, error } = await supabase.from('students').select('*');
            if (error) throw error;
            const store = {};
            if (data) {
                data.forEach(item => {
                    store[item.id] = {
                        name: item.name,
                        identifier: item.identifier,
                        id: item.id,
                        avatar: item.avatar,
                        level: item.level || 'A1',
                        completedWords: item.completed_words || []
                    };
                });
            }
            return store;
        } catch (err) {
            console.error('Error fetching students from Supabase:', err);
            return {};
        }
    }

    async function saveStudentsStore(store) {
        try {
            const records = Object.values(store).map(student => ({
                id: student.id,
                name: student.name,
                identifier: student.identifier,
                avatar: student.avatar,
                level: student.level,
                completed_words: student.completedWords
            }));

            const { error } = await supabase.from('students').upsert(records);
            if (error) throw error;
            renderAllStudentsLists();
        } catch (err) {
            console.error('Error saving students to Supabase:', err);
        }
    }

    async function renderAllStudentsLists() {
        await renderStudentList();
        await renderRightSidebarStudentList();
    }

    function selectPortalRole(role) {
        userRole = role;
        if (role === 'tutor') {
            switchScreen('tutor-dashboard-screen');
            renderAllStudentsLists();
            initTutorSession();
        } else if (role === 'student') {
            document.getElementById('student-manual-login-box').style.display = 'block';
        }
    }
    window.selectPortalRole = selectPortalRole;

    async function loginManualStudent() {
        const input = document.getElementById('manual-student-name').value.trim();
        if (!input) {
            alert('Please enter your name.');
            return;
        }
        currentStudentName = input;
        
        let hasChosenBefore = localStorage.getItem('circumlocution_avatar_chosen_' + currentStudentName);
        selectedAvatar = localStorage.getItem('circumlocution_avatar_' + currentStudentName) || getDiceBearUrl(currentStudentName);
        
        document.getElementById('welcome-student-name').innerText = currentStudentName;
        document.getElementById('lobby-avatar-display').src = selectedAvatar;
        document.getElementById('header-avatar-display').src = selectedAvatar;
        document.getElementById('current-player-display').innerText = currentStudentName;

        if (!hasChosenBefore) {
            updateDiceBearPreview();
            switchScreen('student-avatar-screen');
        } else {
            switchScreen('student-direct-login');
        }
    }
    window.loginManualStudent = loginManualStudent;

    async function createNewStudent() {
        const nameInput = document.getElementById('new-student-name').value.trim();
        const identifierInput = document.getElementById('new-student-identifier').value.trim();
        
        if (!nameInput) {
            alert('Please enter a student display name.');
            return;
        }
        if (!identifierInput) {
            alert('Please enter a unique tutor identifier.');
            return;
        }

        const randomString = Math.random().toString(36).substring(2, 9);
        const uniqueId = encodeURIComponent(nameInput) + '_' + randomString;
        
        const store = await getStudentsStore();
        const persistedAvatar = localStorage.getItem('circumlocution_avatar_' + nameInput) || getDiceBearUrl(nameInput);
        
        store[uniqueId] = { 
            name: nameInput, 
            identifier: identifierInput, 
            id: uniqueId, 
            avatar: persistedAvatar,
            level: 'A1',
            completedWords: []
        };
        
        await saveStudentsStore(store);

        document.getElementById('new-student-name').value = '';
        document.getElementById('new-student-identifier').value = '';
    }
    window.createNewStudent = createNewStudent;

    async function renderStudentList() {
        const container = document.getElementById('tutor-students-container');
        if (!container) return;
        container.innerHTML = '';
        const store = await getStudentsStore();
        const keys = Object.keys(store);

        if (keys.length === 0) {
            container.innerHTML = '<p style="color: #64748b; font-style: italic; text-align: center; margin: 10px 0;">No students created yet.</p>';
            return;
        }

        keys.forEach(id => {
            const student = store[id];
            const currentPersistedAvatar = localStorage.getItem('circumlocution_avatar_' + student.name) || student.avatar || getDiceBearUrl(student.name);
            student.avatar = currentPersistedAvatar;
            const currentLevel = student.level || 'A1';

            const div = document.createElement('div');
            div.className = 'student-list-item';
            
            const link = `${window.location.origin}${window.location.pathname}?id=${student.id}`;
            
            div.innerHTML = `
                <div class="student-info-group">
                    <img src="${currentPersistedAvatar}" class="avatar-preview">
                    <div>
                        <strong style="color: #f8fafc; font-size: 17px;">${student.name}</strong><br>
                        <small style="color: #94a3b8; font-size: 14px;">ID: ${student.identifier}</small>
                    </div>
                </div>
                <div class="student-actions-group" style="align-items: center;">
                    <select class="student-level-select" onchange="updateStudentLevel('${student.id}', this.value)" style="padding: 8px; border-radius: 10px; background: rgba(15, 23, 42, 0.8); color: #fff; border: 1px solid rgba(255,255,255,0.2);">
                        <option value="A1" ${currentLevel === 'A1' ? 'selected' : ''}>A1</option>
                        <option value="A2" ${currentLevel === 'A2' ? 'selected' : ''}>A2</option>
                        <option value="B1" ${currentLevel === 'B1' ? 'selected' : ''}>B1</option>
                        <option value="B2" ${currentLevel === 'B2' ? 'selected' : ''}>B2</option>
                        <option value="C1" ${currentLevel === 'C1' ? 'selected' : ''}>C1</option>
                        <option value="C2" ${currentLevel === 'C2' ? 'selected' : ''}>C2</option>
                    </select>
                    <button onclick="copyStudentLink('${link}')">Copy Link</button>
                    <button onclick="openRemoveModal('${student.id}', '${student.name}')" style="background: linear-gradient(135deg, #475569, #334155);">Remove</button>
                </div>
            `;
            container.appendChild(div);
        });
    }

    async function renderRightSidebarStudentList() {
        const container = document.getElementById('right-sidebar-students-list');
        if (!container) return;
        
        if (container.contains(document.activeElement) && document.activeElement.tagName === 'SELECT') {
            return;
        }

        container.innerHTML = '';
        const store = await getStudentsStore();
        const keys = Object.keys(store);

        if (keys.length === 0) {
            container.innerHTML = '<p style="color: #64748b; font-style: italic; text-align: center; margin: 12px 0; font-size: 15px;">No students added yet.</p>';
            return;
        }

        keys.forEach(id => {
            const student = store[id];
            const currentPersistedAvatar = localStorage.getItem('circumlocution_avatar_' + student.name) || student.avatar || getDiceBearUrl(student.name);
            student.avatar = currentPersistedAvatar;
            const currentLevel = student.level || 'A1';

            const div = document.createElement('div');
            div.style.cssText = 'background: rgba(15, 23, 42, 0.65); border: 1px solid rgba(255, 255, 255, 0.1); padding: 12px; border-radius: 14px; display: flex; flex-direction: column; gap: 10px;';
            
            const link = `${window.location.origin}${window.location.pathname}?id=${student.id}`;
            
            div.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; overflow: hidden;">
                    <img src="${currentPersistedAvatar}" style="width: 38px; height: 38px; border-radius: 50%; border: 2px solid #6366f1; object-fit: cover; background: #0f172a; flex-shrink: 0;">
                    <div style="overflow: hidden;">
                        <strong style="color: #f8fafc; font-size: 14px; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${student.name}</strong>
                        <small style="color: #94a3b8; font-size: 12px; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">ID: ${student.identifier}</small>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 6px; width: 100%;">
                    <select class="student-level-select" onchange="updateStudentLevel('${student.id}', this.value)" style="padding: 6px; border-radius: 8px; background: rgba(15, 23, 42, 0.8); color: #fff; border: 1px solid rgba(255,255,255,0.2); font-size: 12px;">
                        <option value="A1" ${currentLevel === 'A1' ? 'selected' : ''}>A1</option>
                        <option value="A2" ${currentLevel === 'A2' ? 'selected' : ''}>A2</option>
                        <option value="B1" ${currentLevel === 'B1' ? 'selected' : ''}>B1</option>
                        <option value="B2" ${currentLevel === 'B2' ? 'selected' : ''}>B2</option>
                        <option value="C1" ${currentLevel === 'C1' ? 'selected' : ''}>C1</option>
                        <option value="C2" ${currentLevel === 'C2' ? 'selected' : ''}>C2</option>
                    </select>
                    <button onclick="copyStudentLink('${link}')" style="flex: 1; padding: 6px 8px; font-size: 12px;">Copy</button>
                    <button onclick="openRemoveModal('${student.id}', '${student.name}')" style="flex: 1; padding: 6px 8px; font-size: 12px; background: linear-gradient(135deg, #475569, #334155);">Remove</button>
                </div>
            `;
            container.appendChild(div);
        });
    }

    function openRemoveModal(id, name) {
        pendingRemovalId = id;
        document.getElementById('modal-student-prompt').innerText = `Are you sure you want to remove ${name}? This action cannot be undone.`;
        document.getElementById('remove-modal-overlay').style.display = 'flex';
    }
    window.openRemoveModal = openRemoveModal;

    function closeRemoveModal() {
        pendingRemovalId = null;
        document.getElementById('remove-modal-overlay').style.display = 'none';
    }
    window.closeRemoveModal = closeRemoveModal;

    async function executeRemoveStudent() {
        if (!pendingRemovalId) return;
        try {
            const { error } = await supabase.from('students').delete().eq('id', pendingRemovalId);
            if (error) throw error;
            closeRemoveModal();
            renderAllStudentsLists();
        } catch (err) {
            console.error('Error removing student from Supabase:', err);
        }
    }
    window.executeRemoveStudent = executeRemoveStudent;

    function copyStudentLink(link) {
        navigator.clipboard.writeText(link).then(() => {
            alert('Student unique link copied to clipboard!');
        });
    }
    window.copyStudentLink = copyStudentLink;

    function openPopup(type) {
        const overlay = document.getElementById('customizer-popup-overlay');
        const titleEl = document.getElementById('popup-title');
        const contentArea = document.getElementById('popup-content-area');
        contentArea.innerHTML = '';

        const seed = currentStudentName || 'default_student';

        if (type === 'face') {
            titleEl.innerText = 'Choose Face Shape';
            const grid = document.createElement('div');
            grid.className = 'visual-selector-grid';
            faceShapes.forEach(item => {
                const tile = document.createElement('div');
                tile.className = `selector-tile ${item.id === selectedFace ? 'selected' : ''}`;
                tile.onclick = () => {
                    selectedFace = item.id;
                    updateDiceBearPreview();
                    openPopup('face');
                };
                const previewUrl = getDiceBearUrl(seed, item.id, selectedEyes, selectedMouth, selectedBgColor, selectedFaceColor);
                tile.innerHTML = `<img src="${previewUrl}" class="tile-preview-img"><span class="tile-label">${item.label}</span>`;
                grid.appendChild(tile);
            });
            contentArea.appendChild(grid);
        } else if (type === 'eyes') {
            titleEl.innerText = 'Choose Eyes Style';
            const grid = document.createElement('div');
            grid.className = 'visual-selector-grid';
            eyeStyles.forEach(item => {
                const tile = document.createElement('div');
                tile.className = `selector-tile ${item.id === selectedEyes ? 'selected' : ''}`;
                tile.onclick = () => {
                    selectedEyes = item.id;
                    updateDiceBearPreview();
                    openPopup('eyes');
                };
                const previewUrl = getDiceBearUrl(seed, selectedFace, item.id, selectedMouth, selectedBgColor, selectedFaceColor);
                tile.innerHTML = `<img src="${previewUrl}" class="tile-preview-img"><span class="tile-label">${item.label}</span>`;
                grid.appendChild(tile);
            });
            contentArea.appendChild(grid);
        } else if (type === 'mouth') {
            titleEl.innerText = 'Choose Mouth Style';
            const grid = document.createElement('div');
            grid.className = 'visual-selector-grid';
            mouthStyles.forEach(item => {
                const tile = document.createElement('div');
                tile.className = `selector-tile ${item.id === selectedMouth ? 'selected' : ''}`;
                tile.onclick = () => {
                    selectedMouth = item.id;
                    updateDiceBearPreview();
                    openPopup('mouth');
                };
                const previewUrl = getDiceBearUrl(seed, selectedFace, selectedEyes, item.id, selectedBgColor, selectedFaceColor);
                tile.innerHTML = `<img src="${previewUrl}" class="tile-preview-img"><span class="tile-label">${item.label}</span>`;
                grid.appendChild(tile);
            });
            contentArea.appendChild(grid);
        } else if (type === 'bg-color') {
            titleEl.innerText = 'Choose Background Color';
            const palette = document.createElement('div');
            palette.className = 'color-palette';
            bgColorsList.forEach(hex => {
                const swatch = document.createElement('div');
                swatch.className = `color-swatch ${hex === selectedBgColor ? 'selected' : ''}`;
                swatch.style.backgroundColor = `#${hex}`;
                swatch.onclick = () => {
                    selectedBgColor = hex;
                    updateDiceBearPreview();
                    openPopup('bg-color');
                };
                palette.appendChild(swatch);
            });
            contentArea.appendChild(palette);
        } else if (type === 'face-color') {
            titleEl.innerText = 'Choose Face Skin Color';
            const palette = document.createElement('div');
            palette.className = 'color-palette';
            faceColorsList.forEach(hex => {
                const swatch = document.createElement('div');
                swatch.className = `color-swatch ${hex === selectedFaceColor ? 'selected' : ''}`;
                swatch.style.backgroundColor = `#${hex}`;
                swatch.onclick = () => {
                    selectedFaceColor = hex;
                    updateDiceBearPreview();
                    openPopup('face-color');
                };
                palette.appendChild(swatch);
            });
            contentArea.appendChild(palette);
        }

        overlay.style.display = 'flex';
    }
    window.openPopup = openPopup;

    function closePopup() {
        document.getElementById('customizer-popup-overlay').style.display = 'none';
    }
    window.closePopup = closePopup;

    function updateDiceBearPreview() {
        const seed = currentStudentName || 'default_student';
        const url = getDiceBearUrl(seed, selectedFace, selectedEyes, selectedMouth, selectedBgColor, selectedFaceColor);
        const previewEl = document.getElementById('dicebear-preview');
        if (previewEl) previewEl.src = url;
    }

    function randomizeAvatar() {
        selectedFace = faceShapes[Math.floor(Math.random() * faceShapes.length)].id;
        selectedEyes = eyeStyles[Math.floor(Math.random() * eyeStyles.length)].id;
        selectedMouth = mouthStyles[Math.floor(Math.random() * mouthStyles.length)].id;
        selectedBgColor = bgColorsList[Math.floor(Math.random() * bgColorsList.length)];
        selectedFaceColor = faceColorsList[Math.floor(Math.random() * faceColorsList.length)];
        updateDiceBearPreview();
    }
    window.randomizeAvatar = randomizeAvatar;

    async function saveDiceBearAvatarAndProceed() {
        selectedAvatar = getDiceBearUrl(currentStudentName, selectedFace, selectedEyes, selectedMouth, selectedBgColor, selectedFaceColor);

        if (currentStudentName) {
            localStorage.setItem('circumlocution_avatar_' + currentStudentName, selectedAvatar);
            localStorage.setItem('circumlocution_avatar_chosen_' + currentStudentName, 'true');
        }
        const store = await getStudentsStore();
        if (currentStudentId && store[currentStudentId]) {
            store[currentStudentId].avatar = selectedAvatar;
            await saveStudentsStore(store);
        } else {
            const foundId = Object.keys(store).find(k => store[k].name === currentStudentName);
            if (foundId) {
                currentStudentId = foundId;
                store[foundId].avatar = selectedAvatar;
                await saveStudentsStore(store);
            } else {
                await renderRightSidebarStudentList();
            }
        }
        
        document.getElementById('welcome-student-name').innerText = currentStudentName;
        document.getElementById('lobby-avatar-display').src = selectedAvatar;
        document.getElementById('header-avatar-display').src = selectedAvatar;
        document.getElementById('current-player-display').innerText = currentStudentName;
        
        switchScreen('student-direct-login');
    }
    window.saveDiceBearAvatarAndProceed = saveDiceBearAvatarAndProceed;

    function openAvatarChanger() {
        const savedUrl = localStorage.getItem('circumlocution_avatar_' + currentStudentName);
        if (savedUrl) {
            selectedAvatar = savedUrl;
            
            try {
                const urlObj = new URL(savedUrl);
                const params = urlObj.searchParams;
                
                const face = params.get('faceVariant[]');
                const eyes = params.get('eyesVariant[]');
                const mouth = params.get('mouthVariant[]');
                const bg = params.get('backgroundColor[]');
                const skin = params.get('faceColor[]');
                
                if (face) selectedFace = face;
                if (eyes) selectedEyes = eyes;
                if (mouth) selectedMouth = mouth;
                if (bg) selectedBgColor = bg;
                if (skin) selectedFaceColor = skin;
            } catch (e) {
                console.error('Error parsing saved avatar URL:', e);
            }
        }
        updateDiceBearPreview();
        switchScreen('student-avatar-screen');
    }
    window.openAvatarChanger = openAvatarChanger;

    async function getHighScoreStore() {
        try {
            const { data, error } = await supabase.from('highscores').select('*');
            if (error) throw error;
            const store = {};
            if (data) {
                data.forEach(item => {
                    store[item.student_key] = { highestScore: item.highest_score };
                });
            }
            return store;
        } catch (err) {
            console.error('Error fetching high scores from Supabase:', err);
            return {};
        }
    }

    async function getPersonalBest() {
        const store = await getHighScoreStore();
        const lookupKey = currentStudentId || currentStudentName;
        return (store[lookupKey] && store[lookupKey].highestScore) ? store[lookupKey].highestScore : 0;
    }

    async function saveHighScore(score) {
        const store = await getHighScoreStore();
        const lookupKey = currentStudentId || currentStudentName;
        if (!store[lookupKey]) {
            store[lookupKey] = { highestScore: 0 };
        }
        
        let isNewRecord = false;
        if (score > store[lookupKey].highestScore) {
            store[lookupKey].highestScore = score;
            isNewRecord = true;
            
            try {
                await supabase.from('highscores').upsert({
                    student_key: lookupKey,
                    highest_score: score
                });
            } catch (err) {
                console.error('Error saving high score to Supabase:', err);
            }
        }
        return isNewRecord;
    }

    function triggerParticleBurst() {
        const box = document.getElementById('particle-box');
        if (!box) return;
        box.innerHTML = '';
        for (let i = 0; i < 28; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            const angle = Math.random() * Math.PI * 2;
            const distance = 60 + Math.random() * 120;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance;
            p.style.setProperty('--tx', `${tx}px`);
            p.style.setProperty('--ty', `${ty}px`);
            p.style.left = '50%';
            p.style.top = '45%';
            box.appendChild(p);
        }
        setTimeout(() => { box.innerHTML = ''; }, 1300);
    }

    async function enterStudentGame() {
        document.getElementById('current-player-display').innerText = currentStudentName;
        document.getElementById('header-avatar-display').src = selectedAvatar;
        await loadWordChoices();
    }
    window.enterStudentGame = enterStudentGame;

    async function getCurrentStudentObject() {
        const store = await getStudentsStore();
        if (currentStudentId && store[currentStudentId]) {
            return store[currentStudentId];
        }
        return Object.values(store).find(s => s.name === currentStudentName);
    }

    async function markWordAsCompleted(wordText) {
        const store = await getStudentsStore();
        let studentObj = await getCurrentStudentObject();
        if (studentObj) {
            if (!studentObj.completedWords) {
                studentObj.completedWords = [];
            }
            if (!studentObj.completedWords.includes(wordText)) {
                studentObj.completedWords.push(wordText);
            }
            store[studentObj.id] = studentObj;
            await saveStudentsStore(store);
        }
    }

    async function getRandomWordByLevel(studentLevel = 'A1') {
        const veryEasyWords = wordDatabase.filter(w => w.tier.toLowerCase() === 'very easy');
        const easyWords = wordDatabase.filter(w => w.tier.toLowerCase() === 'easy');
        const mediumWords = wordDatabase.filter(w => w.tier.toLowerCase() === 'medium');
        const hardWords = wordDatabase.filter(w => w.tier.toLowerCase() === 'hard');
        const expertWords = wordDatabase.filter(w => w.tier.toLowerCase() === 'expert');

        const studentObj = await getCurrentStudentObject();
        const completed = studentObj && studentObj.completedWords ? studentObj.completedWords : [];

        let pool = [];
        
        switch (studentLevel) {
            case 'A1':
                pool = [...getRandomSubset(veryEasyWords, 70), ...getRandomSubset(easyWords, 30)];
                break;
            case 'A2':
                pool = [...getRandomSubset(veryEasyWords, 30), ...getRandomSubset(easyWords, 50), ...getRandomSubset(mediumWords, 20)];
                break;
            case 'B1':
                pool = [...getRandomSubset(easyWords, 30), ...getRandomSubset(mediumWords, 50), ...getRandomSubset(hardWords, 20)];
                break;
            case 'B2':
                pool = [...getRandomSubset(mediumWords, 40), ...getRandomSubset(hardWords, 40), ...getRandomSubset(expertWords, 20)];
                break;
            case 'C1':
                pool = [...getRandomSubset(hardWords, 60), ...getRandomSubset(expertWords, 40)];
                break;
            case 'C2':
                pool = [...getRandomSubset(hardWords, 30), ...getRandomSubset(expertWords, 70)];
                break;
            default:
                pool = [...wordDatabase];
        }

        let filteredPool = pool.filter(w => !completed.includes(w.word));

        if (filteredPool.length === 0) {
            filteredPool = wordDatabase.filter(w => !completed.includes(w.word));
        }

        if (filteredPool.length === 0) {
            filteredPool = [...wordDatabase];
        }

        return filteredPool[Math.floor(Math.random() * filteredPool.length)];
    }

    function getRandomSubset(arr, weight) {
        const count = Math.max(1, Math.round((arr.length * weight) / 100));
        const shuffled = [...arr].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    async function updateStudentLevel(studentId, newLevel) {
        const store = await getStudentsStore();
        if (store[studentId]) {
            store[studentId].level = newLevel;
            await saveStudentsStore(store);
        } else {
            const foundKey = Object.keys(store).find(k => k === studentId || store[k].name === studentId);
            if (foundKey) {
                store[foundKey].level = newLevel;
                await saveStudentsStore(store);
            }
        }
    }
    window.updateStudentLevel = updateStudentLevel;

    async function loadWordChoices() {
        document.getElementById('personal-best-display').innerText = await getPersonalBest();
        
        const container = document.getElementById('word-choices-container');
        container.innerHTML = '';
        
        const studentObj = await getCurrentStudentObject();
        const studentLevel = studentObj ? (studentObj.level || 'A1') : 'A1';

        const choices = [];
        while (choices.length < 3) {
            const candidate = await getRandomWordByLevel(studentLevel);
            if (!choices.some(c => c.word === candidate.word)) {
                choices.push(candidate);
            }
        }

        choices.forEach(item => {
            const btn = document.createElement('button');
            const tierLower = item.tier.toLowerCase().replace(/\s+/g, '-');
            const totalMax = item.baseline + 100;
            btn.className = `word-choice-btn diff-${tierLower}`;
            btn.innerHTML = `
                <div class="card-star-badge">${item.stars}</div>
                <strong style="font-size: 24px; font-weight: 800;">${item.word}</strong> 
                <span style="font-weight: 700; font-size: 15px; opacity: 0.95; margin-top: 8px;">Max: ${totalMax} pts</span>
            `;
            btn.onclick = () => selectWord(item);
            container.appendChild(btn);
        });

        switchScreen('student-selection-screen');
        localStorage.setItem('circumlocution_gamestate', JSON.stringify({ status: 'selecting', word: null }));
    }
    window.loadWordChoices = loadWordChoices;

    function runGeoGuessrCountdown(wordText) {
        const overlay = document.getElementById('geoguessr-countdown-screen');
        const wordBanner = document.getElementById('countdown-word-display');
        const numDisplay = document.getElementById('geoguessr-num-display');
        
        wordBanner.innerText = `Target: ${wordText}`;
        overlay.classList.add('active');
        
        let count = 3;
        numDisplay.innerText = count;
        playCountdownBeep(false);

        const countdownInterval = setInterval(() => {
            count--;
            if (count > 0) {
                numDisplay.innerText = count;
                playCountdownBeep(false);
            } else if (count === 0) {
                numDisplay.innerText = "GO!";
                playCountdownBeep(true);
            } else {
                clearInterval(countdownInterval);
                overlay.classList.remove('active');
                
                localStorage.setItem('circumlocution_gamestate', JSON.stringify({
                    status: 'playing',
                    word: currentWord,
                    tier: currentTier,
                    stars: currentStars,
                    baseline: currentBaseline,
                    bonusMax: currentBonusMax,
                    points: currentLivePoints,
                    timeLeft: 120
                }));

                startActiveRound();
            }
        }, 900);
    }

    function selectWord(item) {
        currentWord = item.word;
        currentTier = item.tier;
        currentStars = item.stars;
        currentBaseline = item.baseline;
        currentBonusMax = 100;
        currentLivePoints = currentBaseline + currentBonusMax;

        localStorage.setItem('circumlocution_gamestate', JSON.stringify({
            status: 'selecting', 
            word: currentWord,
            tier: currentTier,
            stars: currentStars,
            baseline: currentBaseline,
            bonusMax: currentBonusMax,
            points: currentLivePoints,
            timeLeft: 120
        }));

        runGeoGuessrCountdown(currentWord);
    }

    function startActiveRound() {
        document.getElementById('game-word-target').innerText = currentWord;
        
        const badgeDiv = document.getElementById('student-active-badge');
        badgeDiv.innerHTML = `<span class="badge badge-${currentTier.toLowerCase().replace(/\s+/g, '-')}">${currentStars} ${currentTier} Level</span>`;

        timeLeft = 120;
        document.getElementById('timer-display').innerText = timeLeft + 's';
        const timeBarFill = document.getElementById('time-bar-fill');
        timeBarFill.style.transition = 'none';
        timeBarFill.style.width = '100%';

        setTimeout(() => {
            timeBarFill.style.transition = 'width 1s linear';
        }, 50);

        switchScreen('student-game-screen');

        timerInterval = setInterval(() => {
            timeLeft--;
            document.getElementById('timer-display').innerText = timeLeft + 's';
            
            const percentRemaining = (timeLeft / 120) * 100;
            timeBarFill.style.width = `${percentRemaining}%`;

            let state = JSON.parse(localStorage.getItem('circumlocution_gamestate') || '{}');
            if (state.status !== 'playing') {
                clearInterval(timerInterval);
                return;
            }

            let currentBonus = Math.max(0, Math.floor(currentBonusMax * (Math.log(1 + timeLeft) / Math.log(121))));
            currentLivePoints = currentBaseline + currentBonus;

            state.points = currentLivePoints;
            state.timeLeft = timeLeft;
            localStorage.setItem('circumlocution_gamestate', JSON.stringify(state));

            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                endRound(false);
            }
        }, 1000);
    }

    async function endRound(success) {
        clearInterval(timerInterval);
        
        const summaryText = document.getElementById('summary-result-text');
        const headerScoreEl = document.getElementById('final-earned-score-header');
        const celebrationSlot = document.getElementById('summary-celebration-slot');
        const mainCardBox = document.getElementById('main-container-box');
        
        const legendBasePts = document.getElementById('legend-base-pts');
        const legendBonusPts = document.getElementById('legend-bonus-pts');
        const barSegmentBaseline = document.getElementById('bar-segment-baseline');
        const barSegmentBonus = document.getElementById('bar-segment-bonus');

        let finalBaselineEarned = success ? currentBaseline : 0;
        let finalBonusEarned = success ? Math.max(0, currentLivePoints - currentBaseline) : 0;
        let totalEarned = finalBaselineEarned + finalBonusEarned;

        headerScoreEl.innerText = `${totalEarned} pts`;
        legendBasePts.innerText = `${finalBaselineEarned} pts`;
        legendBonusPts.innerText = `+${finalBonusEarned} pts`;

        barSegmentBaseline.style.width = '0%';
        barSegmentBonus.style.width = '0%';
        celebrationSlot.innerHTML = '';
        mainCardBox.classList.remove('personal-best-card-effect');

        switchScreen('student-summary-screen');

        if (success) {
            summaryText.innerText = `Great job! Your tutor successfully guessed the word.`;
            summaryText.style.color = '#34d399';
            
            await markWordAsCompleted(currentWord);
            const isRecord = await saveHighScore(totalEarned);
            const personalBestVal = await getPersonalBest();
            
            let currentState = JSON.parse(localStorage.getItem('circumlocution_gamestate') || '{}');
            currentState.status = 'summary';
            currentState.success = true;
            currentState.earned = totalEarned;
            currentState.baselineEarned = finalBaselineEarned;
            currentState.bonusEarned = finalBonusEarned;
            currentState.tier = currentTier;
            currentState.isNewRecord = isRecord;
            localStorage.setItem('circumlocution_gamestate', JSON.stringify(currentState));

            if (isRecord) {
                mainCardBox.classList.add('personal-best-card-effect');
                triggerParticleBurst();
                openHighScoreModal(totalEarned);
                
                celebrationSlot.innerHTML = `
                    <div class="celebration-banner">
                        <div class="trophy-icon">&#127942;</div>
                        <div>
                            <strong style="color: #fbbf24; display: block; font-size: 17px;">New Personal Best Record Unlocked!</strong>
                            <span style="font-size: 14px; color: #fde68a;">You crushed your previous high score!</span>
                        </div>
                    </div>
                `;
            } else {
                celebrationSlot.innerHTML = `
                    <div style="font-size: 15px; color: #94a3b8; margin: 16px 0 20px 0; font-weight: 700;">
                        Personal Best Record: <span style="color: #fbbf24; font-size: 18px;">${personalBestVal} pts</span>
                    </div>
                `;
            }
        } else {
            summaryText.innerText = `Round ended without a correct guess or time ran out.`;
            summaryText.style.color = '#f43f5e';
            const personalBestVal = await getPersonalBest();
            celebrationSlot.innerHTML = `
                <div style="font-size: 15px; color: #94a3b8; margin: 16px 0 20px 0; font-weight: 700;">
                    Personal Best Record: <span style="color: #fbbf24; font-size: 18px;">${personalBestVal} pts</span>
                </div>
            `;
        }

        setTimeout(() => {
            const totalMaxScale = 300; 
            const baselinePct = Math.max(0, Math.min(100, (finalBaselineEarned / totalMaxScale) * 100));
            const bonusPct = Math.max(0, Math.min(100, (finalBonusEarned / totalMaxScale) * 100));
            barSegmentBaseline.style.width = `${baselinePct}%`;
            barSegmentBonus.style.width = `${bonusPct}%`;
        }, 150);
    }

    function initTutorSession() {
    renderAllStudentsLists(); // Load once upon session start

    setInterval(() => {
        if (userRole !== 'tutor') return;
        const stateJSON = localStorage.getItem('circumlocution_gamestate');
        const state = stateJSON ? JSON.parse(stateJSON) : {};
        
        const statusTextEl = document.getElementById('tutor-status-text');
        const activeControlsEl = document.getElementById('tutor-active-game-controls');
        const summaryControlsEl = document.getElementById('tutor-summary-controls');
        const recordBanner = document.getElementById('tutor-record-banner');

        if (!statusTextEl) return;

        if (state.status === 'playing') {
            statusTextEl.style.display = 'none';
            activeControlsEl.style.display = 'block';
            summaryControlsEl.style.display = 'none';
            
            document.getElementById('tutor-score-display').innerText = `Current Score Value: ${state.points} (Time: ${state.timeLeft}s)`;
            
            currentLivePoints = state.points;
            currentBaseline = state.baseline || 50;
            currentWord = state.word;
            currentTier = state.tier;
            currentStars = state.stars || '';

            const badgeDiv = document.getElementById('tutor-badge');
            badgeDiv.innerHTML = `<span class="badge badge-${(state.tier || 'very easy').toLowerCase().replace(/\s+/g, '-')}">${currentStars} ${state.tier || 'Very Easy'} Level</span>`;
        } else if (state.status === 'selecting') {
            statusTextEl.style.display = 'block';
            
            if (state.word) {
                statusTextEl.innerHTML = `Student selected a word: <strong style="color: #f8fafc; font-size: 20px;">${state.word}</strong><br><small style="color: #94a3b8;">Get ready! Round starting...</small>`;
            } else {
                statusTextEl.innerText = 'Student is choosing a word...';
            }
            
            activeControlsEl.style.display = 'none';
            summaryControlsEl.style.display = 'none';
        } else if (state.status === 'summary') {
            statusTextEl.style.display = 'block';
            statusTextEl.innerText = state.success ? `Round Won! Earned ${state.earned} pts` : `Round Ended / Passed`;
            
            activeControlsEl.style.display = 'none';
            summaryControlsEl.style.display = 'block';
            
            if (state.isNewRecord) {
                recordBanner.style.display = 'block';
            } else {
                recordBanner.style.display = 'none';
            }
        } else {
            statusTextEl.style.display = 'block';
            statusTextEl.innerText = 'No student has arrived yet.';
            activeControlsEl.style.display = 'none';
            summaryControlsEl.style.display = 'none';
        }
    }, 500);
}

    function tutorApplyPenalty() {
        let state = JSON.parse(localStorage.getItem('circumlocution_gamestate') || '{}');
        if (state.status === 'playing') {
            state.points = Math.max(0, state.points - 10);
            currentLivePoints = state.points;
            localStorage.setItem('circumlocution_gamestate', JSON.stringify(state));
        }
    }
    window.tutorApplyPenalty = tutorApplyPenalty;

    async function tutorEndRound(success) {
        const state = JSON.parse(localStorage.getItem('circumlocution_gamestate') || '{}');
        if (state.status === 'playing') {
            const finalBaseline = success ? (state.baseline || 50) : 0;
            const finalBonus = success ? Math.max(0, state.points - (state.baseline || 50)) : 0;
            const finalEarned = finalBaseline + finalBonus;
            
            let isRecord = false;
            if (success) {
                await markWordAsCompleted(state.word);
                isRecord = await saveHighScore(finalEarned);
            }

            const newState = {
                status: 'summary',
                success: success,
                earned: finalEarned,
                baselineEarned: finalBaseline,
                bonusEarned: finalBonus,
                tier: state.tier,
                isNewRecord: isRecord
            };

            localStorage.setItem('circumlocution_gamestate', JSON.stringify(newState));
            if (userRole === 'student') {
                currentLivePoints = state.points;
                currentBaseline = state.baseline || 50;
                currentTier = state.tier;
                await endRound(success);
            }
        }
    }
    window.tutorEndRound = tutorEndRound;

    renderRightSidebarStudentList();

    const params = new URLSearchParams(window.location.search);
    const studentIdParam = params.get('id');

    if (studentIdParam) {
        userRole = 'student';
        getStudentsStore().then(store => {
            if (store[studentIdParam]) {
                currentStudentId = studentIdParam;
                currentStudentName = store[studentIdParam].name;
                
                let hasChosenBefore = localStorage.getItem('circumlocution_avatar_chosen_' + currentStudentName);
                selectedAvatar = localStorage.getItem('circumlocution_avatar_' + currentStudentName) || store[studentIdParam].avatar || getDiceBearUrl(currentStudentName);
                
                document.getElementById('welcome-student-name').innerText = currentStudentName;
                document.getElementById('lobby-avatar-display').src = selectedAvatar;
                document.getElementById('header-avatar-display').src = selectedAvatar;
                document.getElementById('current-player-display').innerText = currentStudentName;

                if (!hasChosenBefore) {
                    updateDiceBearPreview();
                    switchScreen('student-avatar-screen');
                } else {
                    switchScreen('student-direct-login');
                }
            } else {
                alert('Student profile not found via this link.');
            }
        });
    }

    setInterval(() => {
        if (userRole === 'student') {
            const state = JSON.parse(localStorage.getItem('circumlocution_gamestate') || '{}');
            const gameScreen = document.getElementById('student-game-screen');
            
            if (state.status !== lastProcessedStateStatus) {
                lastProcessedStateStatus = state.status;
                
                if (state.status === 'summary' && gameScreen && !gameScreen.classList.contains('active')) {
                    clearInterval(timerInterval);
                    currentBaseline = state.baselineEarned || 50;
                    currentTier = state.tier || 'Very Easy';
                    const earned = state.success ? state.earned : 0;
                    
                    const headerScoreEl = document.getElementById('final-earned-score-header');
                    const celebrationSlot = document.getElementById('summary-celebration-slot');
                    const mainCardBox = document.getElementById('main-container-box');
                    
                    headerScoreEl.innerText = `${earned} pts`;
                    
                    const legendBasePts = document.getElementById('legend-base-pts');
                    const legendBonusPts = document.getElementById('legend-bonus-pts');
                    const barSegmentBaseline = document.getElementById('bar-segment-baseline');
                    const barSegmentBonus = document.getElementById('bar-segment-bonus');

                    legendBasePts.innerText = `${state.baselineEarned || 0} pts`;
                    legendBonusPts.innerText = `+${state.bonusEarned || 0} pts`;

                    barSegmentBaseline.style.width = '0%';
                    barSegmentBonus.style.width = '0%';
                    celebrationSlot.innerHTML = '';
                    mainCardBox.classList.remove('personal-best-card-effect');

                    const summaryText = document.getElementById('summary-result-text');

                    if (state.success) {
                        summaryText.innerText = `Great job! Your tutor successfully guessed the word.`;
                        summaryText.style.color = '#34d399';
                        saveHighScore(earned).then(async isRecord => {
                            const personalBestVal = await getPersonalBest();
                            if (isRecord) {
                                mainCardBox.classList.add('personal-best-card-effect');
                                triggerParticleBurst();
                                openHighScoreModal(earned);
                                celebrationSlot.innerHTML = `
                                    <div class="celebration-banner">
                                        <div class="trophy-icon">&#127942;</div>
                                        <div>
                                            <strong style="color: #fbbf24; display: block; font-size: 17px;">New Personal Best Record Unlocked!</strong>
                                            <span style="font-size: 14px; color: #fde68a;">You crushed your previous high score!</span>
                                        </div>
                                    </div>
                                `;
                            } else {
                                celebrationSlot.innerHTML = `
                                    <div style="font-size: 15px; color: #94a3b8; margin: 16px 0 20px 0; font-weight: 700;">
                                        Personal Best Record: <span style="color: #fbbf24; font-size: 18px;">${personalBestVal} pts</span>
                                    </div>
                                `;
                            }
                        });
                    } else {
                        summaryText.innerText = `Round ended without a correct guess or time ran out.`;
                        summaryText.style.color = '#f43f5e';
                        getPersonalBest().then(personalBestVal => {
                            celebrationSlot.innerHTML = `
                                <div style="font-size: 15px; color: #94a3b8; margin: 16px 0 20px 0; font-weight: 700;">
                                    Personal Best Record: <span style="color: #fbbf24; font-size: 18px;">${personalBestVal} pts</span>
                                </div>
                            `;
                        });
                    }
                    switchScreen('student-summary-screen');

                    setTimeout(() => {
                        const totalMaxScale = 300;
                        const baselinePct = Math.max(0, Math.min(100, ((state.baselineEarned || 0) / totalMaxScale) * 100));
                        const bonusPct = Math.max(0, Math.min(100, ((state.bonusEarned || 0) / totalMaxScale) * 100));
                        barSegmentBaseline.style.width = `${baselinePct}%`;
                        barSegmentBonus.style.width = `${bonusPct}%`;
                    }, 150);
                }
            }

            if (state.status === 'playing' && gameScreen && gameScreen.classList.contains('active')) {
                currentLivePoints = state.points;
            }
        }
    }, 300);
});

document.getElementById('tutor-login-btn').addEventListener('click', () => {
    const passwordInput = document.getElementById('tutor-password-input').value;
    const correctPassword = 'Codice2127!';

    if (passwordInput === correctPassword) {
        document.getElementById('login-error-msg').style.display = 'none';
        selectPortalRole('tutor'); 
    } else {
        document.getElementById('login-error-msg').style.display = 'block';
    }
});

function playCountdownBeep(isFinal = false) {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(isFinal ? 880 : 440, audioCtx.currentTime); 
        
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
    }
}

function openHighScoreModal(score) {
    const overlay = document.getElementById('high-score-modal-overlay');
    const scoreDisplay = document.getElementById('modal-new-score-display');
    if (scoreDisplay) scoreDisplay.innerText = score;
    if (overlay) {
        overlay.style.display = 'flex';
        triggerModalParticleBurst();
    }
}
window.openHighScoreModal = openHighScoreModal;

function closeHighScoreModal() {
    const overlay = document.getElementById('high-score-modal-overlay');
    if (overlay) overlay.style.display = 'none';
}
window.closeHighScoreModal = closeHighScoreModal;

function triggerModalParticleBurst() {
    const box = document.getElementById('modal-particle-box');
    if (!box) return;
    box.innerHTML = '';
    
    const particleColors = ['#fbbf24', '#34d399', '#38bdf8', '#f43f5e', '#a855f7', '#ec4899'];
    
    for (let i = 0; i < 55; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        
        p.style.backgroundColor = particleColors[Math.floor(Math.random() * particleColors.length)];
        
        const angle = Math.random() * Math.PI * 2;
        const distance = 90 + Math.random() * 160;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;
        
        p.style.setProperty('--tx', `${tx}px`);
        p.style.setProperty('--ty', `${ty}px`);
        p.style.left = '50%';
        p.style.top = '35%';
        
        box.appendChild(p);
    }
    setTimeout(() => { box.innerHTML = ''; }, 1400);
}