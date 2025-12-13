import React, { useEffect, useState, useMemo, useRef } from 'react';
import { fetchSurveys, submitSurvey } from '../services/api.ts';
import { changeAdminPin } from '../services/auth.ts';
import { SurveySubmission } from '../types.ts';
import { SURVEY_DATA } from '../constants.ts';
import { 
  LogOut, LayoutDashboard, Table as TableIcon, Loader2, Database, Calendar, Filter, 
  FileSpreadsheet, PlusCircle, Eye, X, Search, Printer, Upload, ArrowUp, Settings, 
  ChevronLeft, ChevronRight, MessageSquare, Quote, Bell, PieChart as PieChartIcon, 
  BarChart3, List, Percent, Hash, Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jalaali from 'jalaali-js';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList,
  PieChart, Pie, Legend
} from 'recharts';

// Add type definition for html2pdf
declare global {
  interface Window {
    html2pdf: any;
  }
}

interface AdminDashboardProps {
  onLogout: () => void;
  isMasterSession?: boolean;
}

const COLORS = ['#0d9488', '#0f766e', '#f97316', '#ef4444', '#84cc16', '#3b82f6'];
const SCALE_ORDER = ["ضعیف", "متوسط", "خوب", "عالی"];
const ITEMS_PER_PAGE = 20;

type FilterType = 'all' | 'today' | 'week' | 'month' | '3months' | '6months' | 'year' | 'custom';
type DataMode = 'count' | 'percent';
type ChartType = 'bar' | 'pie' | 'table';

const FILTER_OPTIONS: { label: string; value: FilterType }[] = [
  { label: 'همه زمان‌ها', value: 'all' },
  { label: 'امروز', value: 'today' },
  { label: 'هفته گذشته', value: 'week' },
  { label: 'یک ماه گذشته', value: 'month' },
  { label: '۳ ماه گذشته', value: '3months' },
  { label: '۶ ماه گذشته', value: '6months' },
  { label: 'یک سال گذشته', value: 'year' },
  { label: 'بازه زمانی دلخواه', value: 'custom' },
];

const toPersianDigits = (n: string | number): string => {
  if (n === undefined || n === null) return '';
  const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return n.toString().replace(/\d/g, (x) => farsiDigits[parseInt(x)]);
};

const SHAMSI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];

const YEARS = [1402, 1403, 1404, 1405];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, isMasterSession }) => {
  const [surveys, setSurveys] = useState<SurveySubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'charts' | 'table' | 'comments'>('charts');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Notification State
  const [newSurveyCount, setNewSurveyCount] = useState(0);
  const prevSurveyCountRef = useRef(0);
  
  // Global Chart Settings
  const [dataMode, setDataMode] = useState<DataMode>('count');
  const [globalChartType, setGlobalChartType] = useState<ChartType>('bar');

  // Filter State
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  
  // Dropdown Filter States
  const [startYear, setStartYear] = useState<number>(1402);
  const [startMonth, setStartMonth] = useState<number>(1);
  const [startDay, setStartDay] = useState<number>(1);

  const [endYear, setEndYear] = useState<number>(1403);
  const [endMonth, setEndMonth] = useState<number>(12);
  const [endDay, setEndDay] = useState<number>(29);

  // Modal States
  const [selectedSurvey, setSelectedSurvey] = useState<SurveySubmission | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [newSurveyAnswers, setNewSurveyAnswers] = useState<Record<string, string | number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

  useEffect(() => {
    loadData();
    if ('Notification' in window) {
      Notification.requestPermission();
    }
  }, []);

  // Polling for Notifications
  useEffect(() => {
    const interval = setInterval(async () => {
      const data = await fetchSurveys();
      if (data.length > prevSurveyCountRef.current && prevSurveyCountRef.current > 0) {
        const diff = data.length - prevSurveyCountRef.current;
        setNewSurveyCount(prev => prev + diff);
        
        if (document.visibilityState === 'hidden' && Notification.permission === 'granted') {
           new Notification('نظر جدید ثبت شد', {
             body: `${toPersianDigits(diff)} نظر جدید در سیستم ثبت شده است.`,
             icon: '/favicon.ico'
           });
        }
      }
      prevSurveyCountRef.current = data.length;
      setSurveys(data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    }, 30000); 

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
        if (contentRef.current) {
            setShowScrollTop(contentRef.current.scrollTop > 300);
        }
    };
    const div = contentRef.current;
    if (div) div.addEventListener('scroll', handleScroll);
    return () => { if (div) div.removeEventListener('scroll', handleScroll); };
  }, [loading]);

  const scrollToTop = () => {
    if (contentRef.current) {
        contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const loadData = async () => {
    setLoading(true);
    const data = await fetchSurveys();
    prevSurveyCountRef.current = data.length;
    setSurveys(data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    setLoading(false);
  };

  const shamsiToDate = (y: number, m: number, d: number, endOfDay = false) => {
    try {
      const g = jalaali.toGregorian(y, m, d);
      const date = new Date(g.gy, g.gm - 1, g.gd);
      if (endOfDay) {
        date.setHours(23, 59, 59, 999);
      } else {
        date.setHours(0, 0, 0, 0);
      }
      return date.getTime();
    } catch (e) {
      return null;
    }
  };

  const filteredSurveys = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    return surveys.filter(s => {
      const sDate = new Date(s.timestamp).getTime();
      let matchesDate = true;

      switch (filterType) {
        case 'today':
          matchesDate = sDate >= todayStart;
          break;
        case 'week':
          matchesDate = sDate >= (todayStart - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          matchesDate = sDate >= (todayStart - 30 * 24 * 60 * 60 * 1000);
          break;
        case '3months':
          matchesDate = sDate >= (todayStart - 90 * 24 * 60 * 60 * 1000);
          break;
        case '6months':
          matchesDate = sDate >= (todayStart - 180 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          matchesDate = sDate >= (todayStart - 365 * 24 * 60 * 60 * 1000);
          break;
        case 'custom':
           const start = shamsiToDate(startYear, startMonth, startDay);
           const end = shamsiToDate(endYear, endMonth, endDay, true);
           if (start && end) {
             matchesDate = sDate >= start && sDate <= end;
           }
           break;
        case 'all':
        default:
          matchesDate = true;
          break;
      }

      let matchesSearch = true;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const allValues = Object.values(s.answers).join(' ').toLowerCase();
        matchesSearch = allValues.includes(term);
      }

      return matchesDate && matchesSearch;
    });
  }, [surveys, filterType, startYear, startMonth, startDay, endYear, endMonth, endDay, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, searchTerm, startYear, startMonth, startDay, endYear, endMonth, endDay, activeTab]);

  const commentData = useMemo(() => {
    if (activeTab === 'comments') {
      return filteredSurveys.filter(s => s.answers['q10'] && String(s.answers['q10']).trim().length > 0);
    }
    return filteredSurveys;
  }, [filteredSurveys, activeTab]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return (activeTab === 'comments' ? commentData : filteredSurveys).slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredSurveys, commentData, currentPage, activeTab]);

  const totalPages = Math.ceil((activeTab === 'comments' ? commentData.length : filteredSurveys.length) / ITEMS_PER_PAGE);

  const getAnswer = (submission: SurveySubmission, questionId: string) => {
    const val = submission.answers[questionId];
    return val !== undefined ? val : '-';
  };

  const formatJalali = (dateString: string) => {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString('fa-IR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const processChartData = (questionId: string, options: string[]) => {
    const counts: Record<string, number> = {};
    options.forEach(opt => counts[opt] = 0);
    
    let total = 0;
    filteredSurveys.forEach(s => {
      const ans = s.answers[questionId];
      if (ans && typeof ans === 'string' && counts[ans] !== undefined) {
        counts[ans]++;
        total++;
      }
    });
    
    return options.map(opt => ({ 
      name: opt, 
      count: counts[opt],
      percent: total > 0 ? parseFloat(((counts[opt] / total) * 100).toFixed(1)) : 0
    }));
  };

  const allQuestions = SURVEY_DATA.sections.flatMap(s => s.questions);

  const handleExportExcel = () => {
    const dataToExport = filteredSurveys.map((s, idx) => {
      const row: any = { 
          'ردیف': idx + 1,
          'تاریخ و ساعت': formatJalali(s.timestamp) 
      };
      allQuestions.forEach(q => { row[q.text] = getAnswer(s, q.id); });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "NazarSanji");
    XLSX.writeFile(wb, `Omid_Survey_Export_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.xlsx`);
  };

  const handleImportClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);
      
      let importCount = 0;
      for (const row of data as any[]) {
        const answers: Record<string, string | number> = {};
        allQuestions.forEach(q => {
          if (row[q.text]) {
            answers[q.id] = row[q.text];
          }
        });
        if (Object.keys(answers).length > 0) {
            await submitSurvey(answers);
            importCount++;
        }
      }
      alert(`${importCount} رکورد با موفقیت بازگردانی شد.`);
      loadData();
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handlePrint = () => {
    window.print();
  };

  // Improved PDF Download using html2pdf with Layout Fixes
  const handleDownloadPdf = () => {
    if (!contentRef.current) return;
    
    setIsPdfGenerating(true);
    
    const element = contentRef.current;
    
    // Save current styles to restore later
    const originalOverflow = element.style.overflow;
    const originalHeight = element.style.height;
    
    // Expand element to fit content for capture (removes scroll)
    element.style.overflow = 'visible';
    element.style.height = 'auto';

    // Find and clone the header
    const printHeader = document.querySelector('.print-header-hidden') as HTMLElement;
    let headerClone: HTMLElement | null = null;

    if (printHeader) {
        headerClone = printHeader.cloneNode(true) as HTMLElement;
        headerClone.style.display = 'flex';
        headerClone.style.marginBottom = '20px';
        headerClone.classList.remove('hidden'); // Ensure it's visible in the clone
        // Prepend header to the content element temporarily
        element.insertBefore(headerClone, element.firstChild);
    }

    const opt = {
      margin: [10, 10, 10, 10], // top, left, bottom, right in mm
      filename: `Omid_Report_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    if (window.html2pdf) {
        window.html2pdf().set(opt).from(element).save()
        .then(() => {
            // Cleanup on success
            if (headerClone && element.contains(headerClone)) {
                element.removeChild(headerClone);
            }
            element.style.overflow = originalOverflow;
            element.style.height = originalHeight;
            setIsPdfGenerating(false);
        })
        .catch((err: any) => {
             console.error('PDF Generation Error:', err);
             // Cleanup on error
             if (headerClone && element.contains(headerClone)) {
                element.removeChild(headerClone);
            }
             element.style.overflow = originalOverflow;
             element.style.height = originalHeight;
             setIsPdfGenerating(false);
             alert('خطا در تولید PDF');
        });
    } else {
        alert('کتابخانه PDF بارگذاری نشده است. لطفا از دکمه چاپ استفاده کنید.');
        if (headerClone && element.contains(headerClone)) {
            element.removeChild(headerClone);
        }
        element.style.overflow = originalOverflow;
        element.style.height = originalHeight;
        setIsPdfGenerating(false);
    }
  };

  const handleManualSubmit = async () => {
    try {
      await submitSurvey(newSurveyAnswers);
      setIsAddModalOpen(false);
      setNewSurveyAnswers({});
      await loadData();
      alert('نظر جدید ثبت شد.');
    } catch (error) {
      alert('خطا در ثبت.');
    }
  };
  
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if(newPin.length < 4) {
      alert('رمز عبور باید حداقل ۴ رقم باشد.');
      return;
    }
    changeAdminPin(newPin);
    alert('رمز عبور با موفقیت تغییر کرد.');
    setIsSettingsOpen(false);
    setNewPin('');
  };

  const updateNewSurveyAnswer = (qid: string, val: string) => {
    setNewSurveyAnswers(prev => ({ ...prev, [qid]: val }));
  };

  const handleNotificationClick = () => {
    setNewSurveyCount(0);
    setFilterType('today');
    setActiveTab('table');
  };

  // Generate Print Header Text
  const getFilterText = () => {
    const option = FILTER_OPTIONS.find(o => o.value === filterType);
    if (filterType === 'custom') {
       return `از ${toPersianDigits(startYear)}/${toPersianDigits(startMonth)}/${toPersianDigits(startDay)} تا ${toPersianDigits(endYear)}/${toPersianDigits(endMonth)}/${toPersianDigits(endDay)}`;
    }
    return option?.label || 'همه زمان‌ها';
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <Loader2 className="animate-spin text-teal-600" size={40} />
      </div>
    );
  }

  return (
    <div className="flex-grow bg-slate-100 p-2 sm:p-6 overflow-hidden flex flex-col h-screen font-vazir relative">
      
      {/* Hidden Print Header (Visible for Print/PDF) */}
      <div className="hidden print:flex flex-col mb-8 border-b-2 border-teal-600 pb-4 print-header-hidden">
        <div className="flex justify-between items-center mb-4">
           <div className="flex items-center gap-4">
              {SURVEY_DATA.header.logoUrl && (
                  <img src={SURVEY_DATA.header.logoUrl} className="h-20 w-auto" alt="Logo" />
              )}
              <div>
                  <h1 className="text-2xl font-bold text-slate-900">{SURVEY_DATA.header.title}</h1>
                  <p className="text-sm text-slate-500 mt-1">سامانه جامع گزارش‌گیری نظرسنجی</p>
              </div>
           </div>
           <div className="text-left">
               <div className="text-sm text-slate-500">تاریخ گزارش:</div>
               <div className="font-bold text-lg dir-ltr">{new Date().toLocaleDateString('fa-IR')}</div>
           </div>
        </div>
        <div className="bg-slate-100 p-3 rounded-lg flex justify-between items-center border border-slate-200">
            <span className="font-bold text-slate-700">فیلتر اعمال شده: <span className="text-teal-700">{getFilterText()}</span></span>
            <span className="font-bold text-slate-700">تعداد کل رکوردها: <span className="text-teal-700">{toPersianDigits(filteredSurveys.length)}</span></span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden print:shadow-none print:border-none print:h-auto print:overflow-visible">
        
        {/* Toolbar - No Print */}
        <div className="p-4 border-b border-slate-100 flex flex-col gap-4 bg-white sticky top-0 z-20 shadow-sm no-print">
          {/* Top Row */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
             {/* Right Side (Title & Gear) */}
             <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="bg-teal-100 p-2 rounded-lg text-teal-700">
                <Database size={24} />
              </div>
              <div className="flex items-center gap-2">
                <div>
                    <h2 className="font-bold text-slate-800 text-lg">داشبورد مدیریتی</h2>
                    <span className="text-xs text-slate-500 font-mono">
                    {toPersianDigits(filteredSurveys.length)} رکورد
                    </span>
                </div>
                
                <button onClick={() => setIsSettingsOpen(true)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors mr-1" title="تنظیمات">
                    <Settings size={20} />
                </button>
                <button onClick={() => setIsAddModalOpen(true)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors mr-1" title="ثبت دستی">
                    <PlusCircle size={20} />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 justify-end w-full md:w-auto">
              <button onClick={handleNotificationClick} className="relative p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors mr-2" title="اعلان‌ها">
                <Bell size={20} />
                {newSurveyCount > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-pulse">
                    {newSurveyCount > 9 ? '+9' : toPersianDigits(newSurveyCount)}
                  </span>
                )}
              </button>

              <div className="h-8 w-px bg-slate-200 mx-1 hidden md:block"></div>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx, .xls" />
              <button onClick={handleImportClick} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg text-sm transition-colors"><Upload size={18} /><span className="hidden sm:inline">بازگردانی</span></button>
              <button onClick={handleExportExcel} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"><FileSpreadsheet size={18} /><span className="hidden sm:inline">اکسل</span></button>
              
              {/* PDF Button */}
              <button 
                onClick={handleDownloadPdf} 
                disabled={isPdfGenerating}
                className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                 {isPdfGenerating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                 <span className="hidden sm:inline">دانلود PDF</span>
              </button>
              
              <button onClick={handlePrint} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-3 py-2 rounded-lg text-sm transition-colors"><Printer size={18} /><span className="hidden sm:inline">چاپ</span></button>
              <button onClick={onLogout} className="flex items-center gap-2 text-slate-500 hover:text-red-600 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors text-sm"><LogOut size={18} /></button>
            </div>
          </div>

          {/* Bottom Row: Filters & Global Controls */}
          <div className="flex flex-col xl:flex-row justify-between items-center gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
             
             {/* Left: Search & Filter */}
             <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto items-center">
                 <div className="w-full md:w-64 relative">
                    <input type="text" placeholder="جستجو در نظرات..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-3 pr-10 py-2 rounded-lg border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none text-sm transition-all bg-white" />
                    <Search className="absolute right-3 top-2.5 text-slate-400" size={16} />
                 </div>
                 <select value={filterType} onChange={(e) => setFilterType(e.target.value as FilterType)} className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block p-2 outline-none w-full md:w-auto">
                    {FILTER_OPTIONS.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                 </select>
                 {filterType === 'custom' && (
                     <div className="flex items-center gap-1 animate-fade-in bg-white rounded-lg border border-slate-300 p-1">
                        <span className="text-xs px-2">بازه انتخابی</span>
                     </div>
                 )}
             </div>

             {/* Right: Global Display Controls */}
             <div className="flex flex-wrap items-center justify-end gap-3 w-full xl:w-auto">
                {activeTab === 'charts' && (
                    <div className="flex bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                        <div className="flex ml-2 border-l border-slate-100 pl-2">
                             <button onClick={() => setGlobalChartType('bar')} className={`p-1.5 rounded-md mx-0.5 transition-colors ${globalChartType === 'bar' ? 'bg-teal-100 text-teal-700' : 'text-slate-400 hover:bg-slate-50'}`} title="نمودار میله‌ای"><BarChart3 size={18} /></button>
                             <button onClick={() => setGlobalChartType('pie')} className={`p-1.5 rounded-md mx-0.5 transition-colors ${globalChartType === 'pie' ? 'bg-teal-100 text-teal-700' : 'text-slate-400 hover:bg-slate-50'}`} title="نمودار دایره‌ای"><PieChartIcon size={18} /></button>
                             <button onClick={() => setGlobalChartType('table')} className={`p-1.5 rounded-md mx-0.5 transition-colors ${globalChartType === 'table' ? 'bg-teal-100 text-teal-700' : 'text-slate-400 hover:bg-slate-50'}`} title="جدول فراوانی"><List size={18} /></button>
                        </div>
                        <div className="flex">
                            <button onClick={() => setDataMode('count')} className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-bold transition-colors ${dataMode === 'count' ? 'bg-teal-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                                <Hash size={14} /> تعداد
                            </button>
                            <button onClick={() => setDataMode('percent')} className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-bold transition-colors ${dataMode === 'percent' ? 'bg-teal-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                                <Percent size={14} /> درصد
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm whitespace-nowrap">
                    <button onClick={() => setActiveTab('charts')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'charts' ? 'bg-teal-50 text-teal-700 shadow-sm ring-1 ring-teal-200' : 'text-slate-500 hover:text-slate-700'}`}><LayoutDashboard size={16} /> نمودار</button>
                    <button onClick={() => setActiveTab('table')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'table' ? 'bg-teal-50 text-teal-700 shadow-sm ring-1 ring-teal-200' : 'text-slate-500 hover:text-slate-700'}`}><TableIcon size={16} /> جدول</button>
                    <button onClick={() => setActiveTab('comments')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'comments' ? 'bg-teal-50 text-teal-700 shadow-sm ring-1 ring-teal-200' : 'text-slate-500 hover:text-slate-700'}`}><MessageSquare size={16} /> نظرات</button>
                </div>
             </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-grow overflow-y-auto p-6 bg-slate-50 print:bg-white print:p-0 print:overflow-visible" ref={contentRef} id="dashboard-content">
           {/* Note: This div ID helps html2pdf locate content if ref fails */}
           
          {paginatedData.length === 0 && activeTab !== 'charts' && filteredSurveys.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Database size={64} className="mb-4 opacity-20" />
              <p className="text-lg">در این بازه زمانی یا با این جستجو داده‌ای یافت نشد.</p>
            </div>
          ) : activeTab === 'charts' ? (
            <div className="space-y-8 pb-20 print:pb-0">
              {SURVEY_DATA.sections.map((section) => (
                <div key={section.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 print:shadow-none print:border-none break-inside-avoid">
                  <h3 className="text-lg font-bold text-teal-800 mb-6 border-b pb-3 border-slate-100 flex items-center gap-2 print:text-black print:border-black">
                    <span className="w-2 h-6 bg-teal-500 rounded-full print:bg-black"></span>
                    {section.title}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:block print:gap-4">
                    {section.questions.filter(q => q.type !== 'textarea').map((q) => {
                      const options = q.type === 'scale' ? SCALE_ORDER : (q.options || []);
                      const data = processChartData(q.id, options);
                      const currentType = globalChartType;

                      return (
                        <div key={q.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 hover:shadow-md transition-shadow relative print:bg-white print:border print:border-slate-300 print:mb-6 print:break-inside-avoid">
                          
                          <h4 className="text-sm font-bold text-slate-700 mb-6 h-12 overflow-hidden leading-relaxed pr-1 print:h-auto print:mb-2 print:text-black">
                            {q.text}
                          </h4>
                          
                          <div className="h-64 w-full" dir="ltr">
                            {currentType === 'bar' && (
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                  <XAxis dataKey="name" tick={{fontFamily: 'Vazirmatn', fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} dy={10} />
                                  <YAxis allowDecimals={false} tickFormatter={toPersianDigits} tick={{fontFamily: 'Vazirmatn', fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                                  <Tooltip formatter={(value: number) => [dataMode === 'count' ? toPersianDigits(value) : `%${toPersianDigits(value)}`, dataMode === 'count' ? 'تعداد' : 'درصد']} cursor={{fill: '#f1f5f9'}} contentStyle={{ direction: 'rtl', fontFamily: 'Vazirmatn', borderRadius: '12px' }} />
                                  <Bar dataKey={dataMode === 'count' ? "count" : "percent"} radius={[8, 8, 0, 0]} barSize={40}>
                                    <LabelList dataKey={dataMode === 'count' ? "count" : "percent"} position="top" formatter={(val: number) => dataMode === 'count' ? toPersianDigits(val) : `%${toPersianDigits(val)}`} style={{ fontFamily: 'Vazirmatn', fill: '#64748b', fontSize: '12px', fontWeight: 'bold' }} />
                                    {data.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            )}

                            {currentType === 'pie' && (
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} fill="#8884d8" paddingAngle={2} dataKey={dataMode === 'count' ? "count" : "percent"} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                                    {data.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                  </Pie>
                                  <Tooltip formatter={(val) => toPersianDigits(Number(val))} />
                                  <Legend />
                                </PieChart>
                              </ResponsiveContainer>
                            )}

                            {currentType === 'table' && (
                               <div className="h-full overflow-y-auto pt-2" dir="rtl">
                                  <table className="w-full text-sm text-right border-collapse">
                                    <thead>
                                      <tr className="border-b border-slate-200 text-slate-500">
                                        <th className="pb-2">گزینه</th>
                                        <th className="pb-2 text-center">تعداد</th>
                                        <th className="pb-2 text-center">درصد</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {data.map((row, idx) => (
                                        <tr key={idx}>
                                          <td className="py-2 font-medium text-slate-700 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full print:border print:border-slate-400" style={{backgroundColor: COLORS[idx % COLORS.length], WebkitPrintColorAdjust: 'exact'}}></span>
                                            {row.name}
                                          </td>
                                          <td className="py-2 text-center text-slate-600 font-mono">{toPersianDigits(row.count)}</td>
                                          <td className="py-2 text-center text-slate-600 font-mono">٪{toPersianDigits(row.percent)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : activeTab === 'comments' ? (
            <div className="space-y-4 print-only pb-20 print:pb-0">
               {paginatedData.map((sub, idx) => (
                  <div key={sub.id || idx} onClick={() => setSelectedSurvey(sub)} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all cursor-pointer group break-inside-avoid print:border-slate-300 print:mb-4">
                     <div className="flex items-start gap-4">
                        <div className="bg-teal-50 group-hover:bg-teal-100 transition-colors p-3 rounded-full text-teal-600 hidden sm:block print:hidden">
                           <Quote size={24} />
                        </div>
                        <div className="flex-1">
                           <p className="text-slate-700 text-lg leading-relaxed font-medium mb-4 group-hover:text-teal-900 transition-colors">
                              "{sub.answers['q10']}"
                           </p>
                           <div className="flex flex-wrap gap-4 text-sm text-slate-400 items-center border-t border-slate-50 pt-4">
                              <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded text-slate-500">
                                 <Calendar size={14} />
                                 {formatJalali(sub.timestamp)}
                              </span>
                              {sub.answers['q1'] && <span className="font-bold text-slate-500">{sub.answers['q1']}</span>}
                           </div>
                        </div>
                     </div>
                  </div>
               ))}
            </div>
          ) : (
            /* Table View */
            <div className="flex flex-col h-full print:h-auto">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-grow print-only print:overflow-visible print:border-none print:shadow-none">
                <div className="overflow-x-auto h-full print:overflow-visible">
                  <table className="w-full text-right text-sm">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-10 print:static print:bg-slate-100 print:text-black">
                      <tr>
                        <th className="p-4 w-12 text-center no-print">#</th>
                        <th className="p-4 w-12 text-center no-print">مشاهده</th>
                        <th className="p-5 whitespace-nowrap min-w-[150px]">تاریخ و ساعت</th>
                        {allQuestions.slice(0, 5).map(q => (
                          <th key={q.id} className="p-5 whitespace-nowrap min-w-[200px]">
                            {q.text.length > 20 ? q.text.substring(0, 20) + '...' : q.text}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                      {(activeTab === 'table' ? (window.matchMedia('print').matches ? filteredSurveys : paginatedData) : paginatedData).map((sub, idx) => (
                        <tr key={idx} className="hover:bg-teal-50/50 transition-colors group cursor-pointer break-inside-avoid" onClick={() => setSelectedSurvey(sub)}>
                          <td className="p-4 text-center text-slate-400 font-mono text-xs no-print">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                          <td className="p-4 text-center no-print"><button className="text-teal-600 hover:bg-teal-100 p-2 rounded-full transition-colors"><Eye size={20} /></button></td>
                          <td className="p-4 text-slate-600 font-mono text-left" dir="ltr">{formatJalali(sub.timestamp)}</td>
                          {allQuestions.slice(0, 5).map(q => (<td key={q.id} className="p-4 text-slate-800">{getAnswer(sub, q.id)}</td>))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {activeTab !== 'charts' && totalPages > 1 && (
            <div className="flex items-center justify-between bg-white border-t border-slate-200 p-4 sticky bottom-0 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] no-print">
                <div className="text-sm text-slate-500">
                    نمایش {(currentPage - 1) * ITEMS_PER_PAGE + 1} تا {Math.min(currentPage * ITEMS_PER_PAGE, (activeTab === 'comments' ? commentData.length : filteredSurveys.length))} از {(activeTab === 'comments' ? commentData.length : filteredSurveys.length)} رکورد
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronRight size={20} /></button>
                    <span className="text-sm font-mono bg-slate-100 px-3 py-1 rounded-md">{toPersianDigits(currentPage)} / {toPersianDigits(totalPages)}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronLeft size={20} /></button>
                </div>
            </div>
        )}
      </div>

      {showScrollTop && (
        <button onClick={scrollToTop} className="fixed bottom-6 left-6 bg-teal-600 hover:bg-teal-700 text-white p-3 rounded-full shadow-lg transition-all animate-bounce z-40 no-print" title="بازگشت به بالا"><ArrowUp size={24} /></button>
      )}

      {/* Details Modal */}
      {selectedSurvey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in no-print">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Eye className="text-teal-600" /> جزئیات پرونده نظرسنجی</h3>
              <button onClick={() => setSelectedSurvey(null)} className="text-slate-400 hover:text-red-500 transition-colors"><X size={24} /></button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="bg-teal-50 p-4 rounded-xl mb-6 flex justify-between items-center">
                 <span className="text-slate-500 font-bold">زمان ثبت:</span>
                 <span className="font-mono text-lg text-teal-800" dir="ltr">{formatJalali(selectedSurvey.timestamp)}</span>
              </div>
              <div className="space-y-6">
                {SURVEY_DATA.sections.map(section => (
                  <div key={section.id}>
                    <h4 className="font-bold text-teal-700 mb-3 border-b border-slate-100 pb-1">{section.title}</h4>
                    <div className="grid grid-cols-1 gap-3">
                      {section.questions.map(q => (
                        <div key={q.id} className="flex justify-between items-start bg-slate-50 p-3 rounded-lg">
                           <span className="text-sm text-slate-600 w-2/3 pl-2">{q.text}</span>
                           <span className="font-bold text-slate-800">{getAnswer(selectedSurvey, q.id)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button onClick={() => setSelectedSurvey(null)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-2 rounded-lg font-bold">بستن</button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in no-print">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Settings className="text-slate-600" size={20} /> تنظیمات</h3>
                    <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-red-500"><X size={24} /></button>
                </div>
                <div className="p-6">
                    <form onSubmit={handleChangePassword}>
                        <div className="mb-4">
                            <label className="block text-slate-700 text-sm font-bold mb-2">تغییر رمز عبور مدیر</label>
                            <input type="text" value={newPin} onChange={(e) => setNewPin(e.target.value)} placeholder="رمز عبور جدید (۴ تا ۶ رقم)" className="w-full border p-3 rounded-lg text-center tracking-widest font-mono" maxLength={6} />
                            {isMasterSession && <p className="text-xs text-orange-500 mt-2">شما با رمز مادر وارد شده‌اید.</p>}
                        </div>
                        <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-lg">ذخیره تغییرات</button>
                    </form>
                </div>
            </div>
        </div>
      )}

      {/* Add Manual Entry Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in no-print">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><PlusCircle className="text-teal-600" /> ثبت دستی نظر جدید</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors"><X size={24} /></button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="space-y-8">
                {SURVEY_DATA.sections.map(section => (
                  <div key={section.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <h4 className="font-bold text-teal-800 mb-4">{section.title}</h4>
                    <div className="space-y-4">
                      {section.questions.map(q => (
                        <div key={q.id} className="flex flex-col gap-2">
                          <label className="text-sm font-bold text-slate-700">{q.text}</label>
                          {q.type === 'textarea' ? (
                            <textarea className="border rounded-lg p-2 w-full" onChange={e => updateNewSurveyAnswer(q.id, e.target.value)} />
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {(q.type === 'scale' ? SCALE_ORDER : q.options || []).map(opt => (
                                <button key={opt} onClick={() => updateNewSurveyAnswer(q.id, opt)} className={`px-3 py-1 rounded-md text-sm border transition-colors ${newSurveyAnswers[q.id] === opt ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'}`}>{opt}</button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setIsAddModalOpen(false)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-2 rounded-lg font-bold">انصراف</button>
              <button onClick={handleManualSubmit} className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-lg font-bold">ثبت در سیستم</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};