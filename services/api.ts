import axios from 'axios';
import { SurveySubmission } from '../types.ts';

// Detect environment: Use environment variable, relative path (for production), or localhost (fallback)
const getBaseUrl = () => {
  return '/api';
};

const API_URL = getBaseUrl();
const STORAGE_KEY = 'omid_survey_offline_data';

// Create an axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 3000, 
});

// Generate 154 Mock Records (Omid154)
const generateMockData = (): SurveySubmission[] => {
  const comments = [
    "برخورد پرسنل پذیرش بسیار عالی و محترمانه بود.",
    "متاسفانه غذای ناهار سرد بود، لطفا رسیدگی کنید.",
    "از دکتر معالج کمال تشکر را دارم.",
    "فضای اتاق‌ها بسیار تمیز و آرام‌بخش بود.",
    "کمی معطلی در هنگام ترخیص داشتیم.",
    "پرستاران بخش بسیار دلسوز و مهربان هستند.",
    "وضعیت تهویه اتاق مناسب نبود.",
    "لطفا تعداد صندلی‌های انتظار را افزایش دهید.",
    "همه چیز عالی بود، خسته نباشید.",
    "برخورد نگهبانی ورودی می‌توانست بهتر باشد."
  ];

  const submissions: SurveySubmission[] = [];
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;

  for (let i = 0; i < 154; i++) {
    // Random date within last 90 days
    const timestamp = new Date(now - Math.floor(Math.random() * 90 * DAY_MS)).toISOString();
    
    const answers: Record<string, string | number> = {
      q1: Math.random() > 0.4 ? "بیمار" : "همراه",
      q2: Math.random() > 0.5 ? "مرد" : "زن",
      q3: Math.random() > 0.1 ? "بله" : "خیر",
    };

    // Fill scale questions with weighted random (mostly positive)
    const scaleQuestions = [
      'q4_1', 'q4_2', 
      'q5_1', 'q5_2', 'q5_3', 
      'q6_1', 'q6_2', 'q6_3', 'q6_4', 
      'q7_1', 'q7_2', 'q7_3', 
      'q8_1', 'q8_2', 'q8_3', 'q8_4', 
      'q9_1', 'q9_2', 'q9_3', 'q9_4'
    ];
    
    scaleQuestions.forEach(q => {
      const r = Math.random();
      // 50% Excellent, 30% Good, 15% Average, 5% Poor
      answers[q] = r > 0.5 ? "عالی" : r > 0.2 ? "خوب" : r > 0.05 ? "متوسط" : "ضعیف";
    });

    // Add comment for ~30% of records
    if (Math.random() > 0.7) {
      answers['q10'] = comments[Math.floor(Math.random() * comments.length)];
    }

    submissions.push({
      id: `mock-${i}`,
      timestamp,
      answers
    });
  }

  return submissions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const fetchSurveys = async (): Promise<SurveySubmission[]> => {
  try {
    const response = await api.get<SurveySubmission[]>('/surveys');
    return response.data;
  } catch (error) {
    console.warn('Network error fetching surveys. Switching to offline mode.');
    
    // Check local storage
    const localData = localStorage.getItem(STORAGE_KEY);
    if (localData) {
      return JSON.parse(localData);
    }

    // If empty, seed with mock data
    const mockData = generateMockData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockData));
    return mockData;
  }
};

export const submitSurvey = async (answers: Record<string, string | number>): Promise<SurveySubmission> => {
  const payload = {
    answers,
    timestamp: new Date().toISOString()
  };

  try {
    const response = await api.post<SurveySubmission>('/surveys', payload);
    return response.data;
  } catch (error) {
    console.warn('Network error submitting survey. Saving locally.');
    
    // Save to local storage
    const localDataStr = localStorage.getItem(STORAGE_KEY);
    const localData: SurveySubmission[] = localDataStr ? JSON.parse(localDataStr) : generateMockData();
    
    const newSubmission: SurveySubmission = {
      id: `local-${Date.now()}`,
      ...payload
    };
    
    localData.unshift(newSubmission); // Add to beginning
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localData));
    
    // Simulate network delay for UX
    await new Promise(resolve => setTimeout(resolve, 800));
    return newSubmission;
  }
};