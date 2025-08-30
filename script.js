document.addEventListener('DOMContentLoaded', () => {
    // DOM Element References
    const fileInput = document.getElementById('fileInput');
    const saveButton = document.getElementById('saveButton');
    const subtitleContainer = document.getElementById('subtitle-container');
    const shiftHoursInput = document.getElementById('shiftHours');
    const shiftMinutesInput = document.getElementById('shiftMinutes');
    const shiftSecondsInput = document.getElementById('shiftSeconds');
    const shiftMillisecondsInput = document.getElementById('shiftMilliseconds');
    const shiftForwardButton = document.getElementById('shiftForwardButton');
    const shiftBackwardButton = document.getElementById('shiftBackwardButton');

    let subtitles = [];
    let originalFileName = 'edited.srt';

    // Event Listeners
    fileInput.addEventListener('change', handleFileSelect);
    saveButton.addEventListener('click', saveSrtFile);
    shiftForwardButton.addEventListener('click', () => applyShift(false));
    shiftBackwardButton.addEventListener('click', () => applyShift(true));

    /**
     * Handles the file selection event.
     * @param {Event} event - The file input change event.
     */
    function handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file || !file.name.endsWith('.srt')) {
            alert('Please select a valid .srt file.');
            return;
        }

        originalFileName = file.name.replace('.srt', '_edited.srt');
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            subtitles = parseSrt(content);
            renderSubtitles();
            saveButton.disabled = false;
        };
        reader.readAsText(file);
    }

    /**
     * Converts an SRT time string (HH:MM:SS,ms) to milliseconds.
     * @param {string} timeStr - The time string.
     * @returns {number} - Total time in milliseconds.
     */
    function timeToMilliseconds(timeStr) {
        const [hms, ms] = timeStr.split(',');
        const [h, m, s] = hms.split(':').map(Number);
        return h * 3600000 + m * 60000 + s * 1000 + Number(ms);
    }

    /**
     * Converts milliseconds to an SRT time string (HH:MM:SS,ms).
     * @param {number} ms - Total time in milliseconds.
     * @returns {string} - The formatted time string.
     */
    function millisecondsToTime(ms) {
        if (ms < 0) ms = 0; // Prevent negative timestamps
        const hours = Math.floor(ms / 3600000);
        ms %= 3600000;
        const minutes = Math.floor(ms / 60000);
        ms %= 60000;
        const seconds = Math.floor(ms / 1000);
        const milliseconds = ms % 1000;

        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
    }

    /**
     * Parses the content of an SRT file into an array of subtitle objects.
     * @param {string} data - The SRT file content.
     * @returns {Array<Object>} - An array of subtitle objects.
     */
    function parseSrt(data) {
        const subs = [];
        // Use a regex to be more robust against different line endings
        const blocks = data.trim().split(/\r?\n\s*\r?\n/);
        blocks.forEach(block => {
            const lines = block.split(/\r?\n/);
            if (lines.length >= 3) {
                const index = parseInt(lines[0], 10);
                const [startTime, endTime] = lines[1].split(' --> ');
                const text = lines.slice(2).join('\n');
                if (!isNaN(index) && startTime && endTime) {
                    subs.push({ index, startTime, endTime, text, selected: false });
                }
            }
        });
        return subs;
    }

    /**
     * Renders the subtitles in the subtitle container.
     */
    function renderSubtitles() {
        subtitleContainer.innerHTML = '';
        subtitles.forEach((sub, i) => {
            const item = document.createElement('div');
            item.className = 'subtitle-item';
            if (sub.selected) {
                item.classList.add('selected');
            }

            item.innerHTML = `
                <input type="checkbox" data-index="${i}" ${sub.selected ? 'checked' : ''}>
                <div class="subtitle-info">
                    <div class="subtitle-time">${sub.startTime} --> ${sub.endTime}</div>
                    <div class="subtitle-text">${sub.text.replace(/\n/g, '<br>')}</div>
                </div>
            `;
            
            const checkbox = item.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', (e) => {
                subtitles[i].selected = e.target.checked;
                item.classList.toggle('selected', e.target.checked);
            });
            
            subtitleContainer.appendChild(item);
        });
    }

    /**
     * Applies the time shift to the selected or all subtitles.
     * @param {boolean} isBackward - True to shift backward, false to shift forward.
     */
    function applyShift(isBackward) {
        const h = parseInt(shiftHoursInput.value) || 0;
        const m = parseInt(shiftMinutesInput.value) || 0;
        const s = parseInt(shiftSecondsInput.value) || 0;
        const ms = parseInt(shiftMillisecondsInput.value) || 0;

        let totalShift = h * 3600000 + m * 60000 + s * 1000 + ms;
        if (totalShift === 0) {
            alert("Please enter a time value to shift.");
            return;
        }

        if (isBackward) {
            totalShift *= -1;
        }

        const selectedSubtitles = subtitles.filter(sub => sub.selected);
        // If some subtitles are selected, apply shift only to them. Otherwise, apply to all.
        const targetSubtitles = selectedSubtitles.length > 0 ? selectedSubtitles : subtitles;

        targetSubtitles.forEach(sub => {
            const newStartTime = timeToMilliseconds(sub.startTime) + totalShift;
            const newEndTime = timeToMilliseconds(sub.endTime) + totalShift;
            sub.startTime = millisecondsToTime(newStartTime);
            sub.endTime = millisecondsToTime(newEndTime);
        });

        renderSubtitles();
    }

    /**
     * Generates the SRT content from the subtitle array.
     * @returns {string} - The formatted SRT content.
     */
    function generateSrtContent() {
        return subtitles.map(sub => {
            return `${sub.index}\n${sub.startTime} --> ${sub.endTime}\n${sub.text}`;
        }).join('\n\n') + '\n\n'; // Add trailing newlines for compatibility
    }

    /**
     * Triggers the download of the modified SRT file.
     */
    function saveSrtFile() {
        const srtContent = generateSrtContent();
        const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = originalFileName;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
});
