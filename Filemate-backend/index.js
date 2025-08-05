const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Storage setup
const storageDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, storageDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// In-memory map for file groups by code
const fileGroups = {};

// Upload endpoint
app.post('/api/upload', upload.array('files'), (req, res) => {
    const code = uuidv4().slice(0, 4).toUpperCase();
    const files = req.files.map(file => ({
        filename: file.filename,
        originalname: file.originalname,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype
    }));

    fileGroups[code] = {
        files,
        expiry: Date.now() + 24 * 60 * 60 * 1000 // 24 hours expiry
    };

    res.json({ code });
});

// Download metadata endpoint
app.get('/api/info/:code', (req, res) => {
    const code = req.params.code.toUpperCase();
    const group = fileGroups[code];
    if (!group) {
        return res.status(404).json({ error: 'Code not found' });
    }
    if (Date.now() > group.expiry) {
        delete fileGroups[code];
        return res.status(410).json({ error: 'Files expired' });
    }
    res.json({ files: group.files.map(f => ({ originalname: f.originalname, size: f.size, mimetype: f.mimetype })) });
});

// Download file endpoint
app.get('/api/download/:code/:filename', (req, res) => {
    const code = req.params.code.toUpperCase();
    const filename = req.params.filename;
    const group = fileGroups[code];
    if (!group) {
        return res.status(404).json({ error: 'Code not found' });
    }
    if (Date.now() > group.expiry) {
        delete fileGroups[code];
        return res.status(410).json({ error: 'Files expired' });
    }
    const file = group.files.find(f => f.filename === filename);
    if (!file) {
        return res.status(404).json({ error: 'File not found' });
    }
    res.download(file.path, file.originalname);
});

// Cleanup expired files every hour
setInterval(() => {
    const now = Date.now();
    for (const code in fileGroups) {
        if (fileGroups[code].expiry < now) {
            fileGroups[code].files.forEach(f => {
                fs.unlink(f.path, err => {
                    if (err) console.error('Error deleting file:', err);
                });
            });
            delete fileGroups[code];
        }
    }
}, 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`✅ Filemate backend is running on port ${PORT}`);
});


app.get('/', (req, res) => {
  res.send('✅ Filemate backend is running');
});

app.use(cors({
  origin: '*', // For development. Later replace with Vercel domain for safety.
}));
