document.addEventListener('DOMContentLoaded', () => {
    // DOM 元素获取
    const semesterSelector = document.getElementById('semester-selector');
    const startDatePicker = document.getElementById('start-date-picker');
    const currentWeekDisplay = document.getElementById('current-week-display');
    const timetableGrid = document.getElementById('timetable-grid');
    const memoLeftPreview = document.getElementById('memo-left-preview');
    const memoRightPreview = document.getElementById('memo-right-preview');

    let currentCourses = [];
    let timetableRequest;
    const aqiColors = ["#009966", "#FFDE33", "#FF9933", "#CC0033", "#660099", "#7E0023"];
    const semesterFilePattern = /^[a-z\d_-][a-z\d_.-]*\.json$/i;

    // --- 初始化和数据加载 ---
    async function initializeApp() {
        loadMemo('left.md', memoLeftPreview);
        loadMemo('right.md', memoRightPreview);
        await loadConfig();
        loadSettings(); // 加载保存的学期和日期
        renderGrid();

        // 添加事件监听
        semesterSelector.addEventListener('change', handleSemesterChange);
        startDatePicker.addEventListener('change', handleDateChange);
        updateCurrentWeek();
        setInterval(updateCurrentWeek, 60000); // 每分钟更新一次周数
        await loadTimetable();
    }

    async function fetchData(fileName, signal) {
        const response = await fetch(`data/${fileName}`, { redirect: 'error', signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response;
    }

    async function loadConfig() {
        try {
            const response = await fetchData('config.json');
            const config = await response.json();
            if (!Array.isArray(config?.semesters)) throw new TypeError('semesters must be an array');

            for (const semester of config.semesters) {
                if (typeof semester?.name !== 'string' || typeof semester.file !== 'string'
                    || !semesterFilePattern.test(semester.file)) continue;

                const option = document.createElement('option');
                option.value = semester.file;
                option.textContent = semester.name;
                semesterSelector.appendChild(option);
            }
        } catch (error) {
            console.error('无法加载配置文件 data/config.json:', error);
        }
    }

    async function loadTimetable() {
        timetableRequest?.abort();
        currentCourses = [];
        renderCourses(getCurrentWeek());

        const timetableFile = semesterSelector.value;
        if (!semesterFilePattern.test(timetableFile)) return;
        timetableRequest = new AbortController();
        const { signal } = timetableRequest;
        try {
            const response = await fetchData(timetableFile, signal);
            const courses = await response.json();
            if (signal.aborted) return;
            if (!Array.isArray(courses)) throw new TypeError('timetable must be an array');
            currentCourses = courses.filter(isValidCourse);
            renderCourses(getCurrentWeek());
        } catch (error) {
            if (!signal.aborted) console.error(`无法加载课表文件 data/${timetableFile}:`, error);
        }
    }

    function isValidCourse(course) {
        if (typeof course?.courseName !== 'string'
            || (course.location != null && typeof course.location !== 'string')) return false;

        const { dayOfWeek, startWeek, endWeek, session } = course;
        return Number.isInteger(dayOfWeek) && dayOfWeek >= 1 && dayOfWeek <= 7
            && Number.isInteger(startWeek) && Number.isInteger(endWeek)
            && startWeek >= 1 && endWeek >= startWeek
            && Number.isInteger(session?.start) && Number.isInteger(session.end)
            && session.start >= 1 && session.end <= 12 && session.end >= session.start;
    }

    // --- 周数计算与显示 ---
    function updateCurrentWeek() {
        const week = getCurrentWeek();
        currentWeekDisplay.textContent = week ? `当前是第 ${week} 周` : '请设置起始日期';
        renderCourses(week);
    }

    function localCalendarDay(date) {
        return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    }

    function getCurrentWeek() {
        const startDay = startDatePicker.valueAsNumber;
        if (!Number.isFinite(startDay)) return null;
        const weekLength = 7 * 24 * 60 * 60 * 1000;
        return Math.floor((localCalendarDay(new Date()) - startDay) / weekLength) + 1;
    }

    // --- 课表渲染 ---
    function renderGrid() {
        timetableGrid.replaceChildren();
        const headers = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
        headers.forEach(h => {
            const cell = document.createElement('div');
            cell.className = 'grid-header';
            cell.textContent = h;
            timetableGrid.appendChild(cell);
        });

        for (let i = 1; i <= 12; i++) {
            const timeCell = document.createElement('div');
            timeCell.className = 'time-slot';
            timeCell.textContent = `第 ${i} 节`;
            timetableGrid.appendChild(timeCell);
            for (let j = 1; j <= 7; j++) {
                const courseCell = document.createElement('div');
                courseCell.className = 'course-cell';
                courseCell.dataset.day = j;
                courseCell.dataset.session = i;
                timetableGrid.appendChild(courseCell);
            }
        }
    }

    function renderCourses(week) {
        timetableGrid.querySelectorAll('.course-item').forEach(item => item.remove());
        if (!week) return;
        const coursesToShow = currentCourses.filter(c => week >= c.startWeek && week <= c.endWeek);

        coursesToShow.forEach(course => {
            const start = course.session.start;
            const end = course.session.end;
            const duration = end - start + 1;
            const cell = timetableGrid.querySelector(`.course-cell[data-day='${course.dayOfWeek}'][data-session='${start}']`);
            if (cell) {
                const item = document.createElement('div');
                item.className = 'course-item';
                const colorIndex = course.courseName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % aqiColors.length;
                item.style.backgroundColor = aqiColors[colorIndex];
                item.style.height = `calc(${duration * 100}% + ${duration - 1}px)`;
                const name = document.createElement('strong');
                name.textContent = course.courseName;
                const location = document.createElement('span');
                location.textContent = `@ ${course.location || ''}`;
                item.append(name, location);
                cell.appendChild(item);
            }
        });
    }
    
    // --- 备忘录加载 ---
    const memoTags = new Set([
        'a', 'b', 'blockquote', 'br', 'code', 'del', 'div', 'em', 'h1', 'h2', 'h3',
        'h4', 'h5', 'h6', 'hr', 'i', 'img', 'input', 'li', 'ol', 'p', 'pre', 's',
        'span', 'strong', 'table', 'tbody', 'td', 'th', 'thead', 'tr', 'ul'
    ]);

    function setMemoUrl(element, attribute, value) {
        if (!value) return;
        const protocols = attribute === 'href' ? ['http:', 'https:', 'mailto:', 'tel:'] : ['http:', 'https:'];
        try {
            const url = new URL(value, document.baseURI);
            if (protocols.includes(url.protocol)) element.setAttribute(attribute, url.href);
        } catch {
            // Ignore malformed URLs.
        }
    }

    function appendMemoContent(source, target) {
        for (const node of source.childNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
                target.append(document.createTextNode(node.data));
                continue;
            }

            const tag = node.localName;
            if (node.namespaceURI !== 'http://www.w3.org/1999/xhtml' || !memoTags.has(tag)) continue;
            if (tag === 'input' && node.type !== 'checkbox') continue;

            const element = document.createElement(tag);
            if (node.hasAttribute('title')) element.title = node.title;
            if (tag === 'a') setMemoUrl(element, 'href', node.getAttribute('href'));
            if (tag === 'img') {
                element.alt = node.alt;
                setMemoUrl(element, 'src', node.getAttribute('src'));
            }
            if (tag === 'input') {
                element.type = 'checkbox';
                element.disabled = true;
                element.checked = node.checked;
            }
            if (tag === 'ol') element.start = node.start;
            if (tag === 'td' || tag === 'th') element.align = node.align;

            appendMemoContent(node, element);
            target.append(element);
        }
    }

    async function loadMemo(fileName, previewElement) {
        try {
            const response = await fetchData(fileName);
            const markdownText = await response.text();
            // Parse in an inert template, then rebuild only allowed elements and attributes.
            const template = document.createElement('template');
            template.innerHTML = marked.parse(markdownText);
            const content = document.createDocumentFragment();
            appendMemoContent(template.content, content);
            previewElement.replaceChildren(content);
        } catch (error) {
            console.error(`加载 ${fileName} 失败:`, error);
            const message = document.createElement('p');
            message.className = 'memo-error';
            message.textContent = `加载 ${fileName} 失败。`;
            previewElement.replaceChildren(message);
        }
    }

    // --- 事件处理与设置保存 ---
    async function handleSemesterChange() {
        saveSettings();
        await loadTimetable();
    }
    
    function handleDateChange() {
        saveSettings();
        updateCurrentWeek();
    }

    function saveSettings() {
        try {
            localStorage.setItem('selectedSemester', semesterSelector.value);
            localStorage.setItem('startDate', startDatePicker.value);
        } catch (error) {
            console.warn('无法保存课表设置:', error);
        }
    }

    function loadSettings() {
        try {
            const savedSemester = localStorage.getItem('selectedSemester');
            const savedDate = localStorage.getItem('startDate');
            if (Array.from(semesterSelector.options).some(option => option.value === savedSemester)) {
                semesterSelector.value = savedSemester;
            }
            if (savedDate) startDatePicker.value = savedDate;
        } catch (error) {
            console.warn('无法读取课表设置:', error);
        }
        if (!startDatePicker.value) {
            const today = new Date();
            const dayOfWeek = today.getDay();
            const distance = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
            today.setDate(today.getDate() + distance);
            startDatePicker.valueAsNumber = localCalendarDay(today);
            saveSettings();
        }
    }
    
    initializeApp();
});
