import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  const DB_FILE = path.join(__dirname, 'server', 'db.json');

  app.use(cors());
  app.use(bodyParser.json());

  // Initialize DB if not exists
  if (!fs.existsSync(DB_FILE)) {
    if (!fs.existsSync(path.join(__dirname, 'server'))) {
      fs.mkdirSync(path.join(__dirname, 'server'));
    }
    fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
  }

  // Helper to read DB
  const readDB = () => {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      return [];
    }
  };

  // Helper to write DB
  const writeDB = (data: any) => {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  };

  // --- DATA SEEDING LOGIC ---
  const seedDatabase = () => {
    const currentData = readDB();
    if (currentData.length >= 290) {
      console.log('Database already populated.');
      return;
    }

    console.log('Seeding database with 300 entries for the last 3 months...');
    
    const genderOptions = ["مرد", "زن"];
    const typeOptions = ["بیمار", "همراه"];
    
    const newEntries = [];
    
    for (let i = 0; i < 300; i++) {
      const answers: any = {};
      
      answers['q1'] = Math.random() > 0.5 ? typeOptions[0] : typeOptions[1];
      answers['q2'] = Math.random() > 0.5 ? genderOptions[0] : genderOptions[1];
      answers['q3'] = Math.random() > 0.1 ? "بله" : "خیر";

      const getPositiveScale = () => {
        const r = Math.random();
        if (r < 0.05) return "ضعیف";
        if (r < 0.15) return "متوسط";
        if (r < 0.40) return "خوب";
        return "عالی";
      };

      const scaleIds = [
        'q4_1', 'q4_2',
        'q5_1', 'q5_2', 'q5_3',
        'q6_1', 'q6_2', 'q6_3', 'q6_4',
        'q7_1', 'q7_2', 'q7_3',
        'q8_1', 'q8_2', 'q8_3', 'q8_4',
        'q9_1', 'q9_2', 'q9_3', 'q9_4'
      ];

      scaleIds.forEach(id => {
        answers[id] = getPositiveScale();
      });

      if (Math.random() > 0.7) {
        const comments = [
          "از خدمات شما راضی بودم، با تشکر.",
          "برخورد پرسنل عالی بود.",
          "کمی معطلی در پذیرش داشتیم اما در کل خوب بود.",
          "غذای بیمارستان می‌تواند بهتر شود.",
          "تشکر ویژه از بخش پرستاری.",
          "نظافت اتاق‌ها بسیار خوب بود."
        ];
        answers['q10'] = comments[Math.floor(Math.random() * comments.length)];
      }

      const threeMonthsInMillis = 90 * 24 * 60 * 60 * 1000;
      const randomTime = Date.now() - Math.floor(Math.random() * threeMonthsInMillis);

      newEntries.push({
        id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
        timestamp: new Date(randomTime).toISOString(),
        answers
      });
    }

    const finalData = [...currentData, ...newEntries];
    finalData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    writeDB(finalData);
    console.log(`Seeding complete. Total records: ${finalData.length}`);
  };

  seedDatabase();

  // API routes
  app.get('/api/surveys', (req: express.Request, res: express.Response) => {
    const data = readDB();
    res.json(data);
  });

  app.post('/api/surveys', (req: express.Request, res: express.Response) => {
    const { answers } = req.body;
    
    if (!answers) {
      return res.status(400).json({ error: 'Missing answers' });
    }

    const surveys = readDB();
    const newSurvey = {
      id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5),
      timestamp: req.body.timestamp || new Date().toISOString(),
      answers
    };

    surveys.push(newSurvey);
    writeDB(surveys);

    res.status(201).json(newSurvey);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req: express.Request, res: express.Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
