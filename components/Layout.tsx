import React from 'react';
import { SURVEY_DATA } from '../constants.ts';
import { HeartPulse } from 'lucide-react';
import { Link } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const toPersianDigits = (n: number) => {
  const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return n.toString().replace(/\d/g, x => farsiDigits[parseInt(x)]);
};

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50 border-b border-teal-100">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-4 hover:opacity-90 transition-opacity">
            {SURVEY_DATA.header.logoUrl ? (
              <div className="bg-white rounded-lg p-1 shadow-sm border border-slate-100">
                <img 
                  src={SURVEY_DATA.header.logoUrl} 
                  alt={SURVEY_DATA.header.title} 
                  className="h-10 w-auto object-contain"
                />
              </div>
            ) : (
              <div className="bg-teal-600 p-2 rounded-lg text-white">
                <HeartPulse size={28} />
              </div>
            )}
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-teal-900">{SURVEY_DATA.header.title}</h1>
              {/* <span className="text-xs text-teal-600 tracking-wider font-sans uppercase">{SURVEY_DATA.header.logoText}</span> */}
            </div>
          </Link>
          <div className="text-sm font-medium text-slate-500 hidden sm:block">
            سامانه جامع نظرسنجی بیماران
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-slate-100 py-6 text-center text-sm text-slate-500 border-t border-slate-200">
        <div className="max-w-3xl mx-auto px-4">
          <p>© {toPersianDigits(new Date().getFullYear())} {SURVEY_DATA.header.logoText}. تمامی حقوق محفوظ است.</p>
          <Link to="/admin" className="text-slate-400 hover:text-teal-600 mt-2 inline-block transition-colors text-xs font-medium">
            ورود به پنل مدیریت
          </Link>
        </div>
      </footer>
    </div>
  );
};