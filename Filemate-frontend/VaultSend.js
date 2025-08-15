class FileTransferApp {
    constructor() {
        this.files = [];
        this.currentTab = 'send';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.showTab('send');
    }

    setupEventListeners() {
        // File input
        const fileInput = document.getElementById('fileInput');
        const uploadArea = document.getElementById('uploadArea');

        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        uploadArea.addEventListener('click', () => fileInput.click());

        // Upload button
        document.getElementById('uploadBtn').addEventListener('click', () => this.uploadFiles());

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.closest('.tab-btn').dataset.tab;
                this.showTab(tab);
            });
        });

        // Copy button
        document.getElementById('copyBtn').addEventListener('click', () => this.copyShareCode());

        // Download button
        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadFiles());
        document.getElementById('downloadAllBtn').addEventListener('click', () => this.downloadAllFiles());

        // Download code input
        document.getElementById('downloadCode').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.downloadFiles();
        });
    }

    setupDragAndDrop() {
        const uploadArea = document.getElementById('uploadArea');

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            this.handleFiles(e.dataTransfer.files);
        });
    }

    handleFileSelect(e) {
        this.handleFiles(e.target.files);
    }

    handleFiles(fileList) {
        const files = Array.from(fileList);
        files.forEach(file => {
            if (!this.files.find(f => f.name === file.name && f.size === file.size)) {
                this.files.push(file);
            }
        });
        this.displayFiles();
    }

    displayFiles() {
        const fileList = document.getElementById('fileList');
        const fileItems = document.getElementById('fileItems');

        if (this.files.length === 0) {
            fileList.style.display = 'none';
            return;
        }

        fileList.style.display = 'block';
        fileItems.innerHTML = '';

        this.files.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';

            const fileExtension = file.name.split('.').pop().toLowerCase();
            const fileIcon = this.getFileIcon(fileExtension);

            fileItem.innerHTML = `
                <div class="file-info">
                    <i class="fas ${fileIcon} file-icon ${fileExtension}"></i>
                    <div class="file-details">
                        <h4>${file.name}</h4>
                        <p>${this.formatFileSize(file.size)}</p>
                    </div>
                </div>
                <button class="file-remove" onclick="app.removeFile(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;

            fileItems.appendChild(fileItem);
        });
    }

    getFileIcon(extension) {
        const iconMap = {
            'pdf': 'fa-file-pdf',
            'doc': 'fa-file-word',
            'docx': 'fa-file-word',
            'jpg': 'fa-file-image',
            'jpeg': 'fa-file-image',
            'png': 'fa-file-image',
            'gif': 'fa-file-image',
            'zip': 'fa-file-archive',
            'rar': 'fa-file-archive',
            'mp4': 'fa-file-video',
            'avi': 'fa-file-video',
            'mp3': 'fa-file-audio',
            'txt': 'fa-file-alt',
            'default': 'fa-file'
        };
        return iconMap[extension] || iconMap.default;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    removeFile(index) {
        this.files.splice(index, 1);
        this.displayFiles();
    }

    async uploadFiles() {
        if (this.files.length === 0) return;

        this.showSection('progressSection');

        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');

        const formData = new FormData();
        this.files.forEach(file => {
            formData.append('files', file);
        });

        try {
            const response = await fetch('https://filemate.onrender.com/api/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            // Show progress as 100% immediately (no real progress tracking here)
            progressFill.style.width = '100%';
            progressText.textContent = '100%';

            const data = await response.json();
            const code = data.code;

            document.getElementById('shareCode').textContent = code;
            this.generateQRCode(code);
            this.showSection('shareSection');

            // Update download code input max length to 4
            document.getElementById('downloadCode').maxLength = 4;

            // Clear files after upload
            this.files = [];
            this.displayFiles();

        } catch (error) {
            alert('Upload failed: ' + error.message);
            this.showSection('uploadSection');
        }
    }

    generateShareCode() {
        // This function is no longer used but kept for compatibility
    }

    generateQRCode(code) {
        const qrCodeContainer = document.getElementById('qrCode');

        // Clear any existing QR code
        qrCodeContainer.innerHTML = '';

        // Create actual QR code
        const qrCode = new QRCode(qrCodeContainer, {
            text: `https://filemate.vercel.app/download/${code}`,
            width: 150,
            height: 150,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

        // Add click handler for QR code
        qrCodeContainer.style.cursor = 'pointer';
        qrCodeContainer.title = 'Click to download';
    }

    storeFiles(code) {
        const fileData = {
            files: this.files.map(file => ({
                name: file.name,
                size: file.size,
                type: file.type,
                data: null // In real app, this would be base64 data
            })),
            expiry: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        };

        // Store in localStorage (for demo)
        localStorage.setItem(`files_${code}`, JSON.stringify(fileData));
    }

    copyShareCode() {
        const code = document.getElementById('shareCode').textContent;
        navigator.clipboard.writeText(code).then(() => {
            const btn = document.getElementById('copyBtn');
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
                btn.innerHTML = originalHTML;
            }, 2000);
        });
    }

    showTab(tab) {
        this.currentTab = tab;

        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        // Show appropriate section
        if (tab === 'send') {
            this.showSection('uploadSection');
        } else {
            this.showSection('downloadSection');
        }
    }

    showSection(sectionId) {
        const sections = ['uploadSection', 'progressSection', 'shareSection', 'downloadSection', 'receivedSection'];
        sections.forEach(id => {
            document.getElementById(id).style.display = id === sectionId ? 'block' : 'none';
        });

        if (sectionId === 'uploadSection') {
            document.getElementById('uploadSection').classList.add('fade-in');
        }
    }

    async downloadFiles() {
        const code = document.getElementById('downloadCode').value.toUpperCase();

        // Adjusted for 4-digit code
        if (code.length !== 4) {
            alert('Please enter a valid 4-digit code');
            return;
        }

        try {
            const response = await fetch(`https://filemate.onrender.com/api/download/${code}`);
            if (!response.ok) {
                throw new Error('Invalid code or files have expired');
            }

            const data = await response.json();
            this.displayReceivedFiles(data.files, code);
            this.showSection('receivedSection');
        } catch (error) {
            alert(error.message);
        }
    }

    // ✅ Move this OUTSIDE of downloadFiles()
    displayReceivedFiles(files, code) {
        const receivedFiles = document.getElementById('receivedFiles');
        receivedFiles.innerHTML = '';

        files.forEach(file => {
            const fileExtension = file.originalname.split('.').pop().toLowerCase();
            const fileIcon = this.getFileIcon(fileExtension);

            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';

            fileItem.innerHTML = `
            <div class="file-info">
                <i class="fas ${fileIcon} file-icon ${fileExtension}"></i>
                <div class="file-details">
                    <h4>${file.originalname}</h4>
                    <p>${this.formatFileSize(file.size)}</p>
                </div>
            </div>
            <button class="btn-primary" onclick="app.downloadSingleFile('${code}', '${file.filename}', '${file.originalname}')">
                <i class="fas fa-download"></i>
            </button>
        `;

            receivedFiles.appendChild(fileItem);
        });
    }

    downloadSingleFile(code, filename, originalname) {
        const url = `https://filemate.onrender.com/api/download/${code}/${filename}`;
        const link = document.createElement('a');
        link.href = url;
        link.download = originalname;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }


    downloadAllFiles() {
        // In a real app, this would download all files as a zip
        alert('Downloading all files...');
    }
}

// Add drag-over class for styling
const style = document.createElement('style');
style.textContent = `
    .drag-over {
        border-color: #764ba2 !important;
        background: #f0f2ff !important;
        transform: scale(1.02);
    }
    .qr-code-container {
        text-align: center;
        margin: 20px 0;
    }
    #qrCode {
        display: inline-block;
        margin: 10px auto;
    }
    .qr-instruction {
        font-size: 0.9rem;
        color: #666;
        margin-top: 10px;
    }
`;
document.head.appendChild(style);

window.app = new FileTransferApp();
