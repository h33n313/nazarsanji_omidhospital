import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SURVEY_DATA } from '../constants.ts';
import { ClipboardList, ArrowLeft } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex-grow flex items-center justify-center p-4 sm:p-6 bg-slate-50">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-white pt-12 pb-6 text-center relative">
          
          {SURVEY_DATA.header.logoUrl ? (
             <div className="mb-6 flex justify-center relative z-10">
               <div className="p-4">
                 <img 
                   src={SURVEY_DATA.header.logoUrl} 
                   alt={SURVEY_DATA.header.title} 
                   className="h-40 w-auto object-contain drop-shadow-sm transform hover:scale-105 transition-transform duration-500"
                 />
               </div>
             </div>
          ) : (
            <div className="inline-flex items-center justify-center w-32 h-32 bg-teal-100 text-teal-600 rounded-full mb-6 relative z-10">
              <ClipboardList size={64} />
            </div>
          )}
          
          <h2 className="text-3xl sm:text-4xl font-extrabold text-teal-900 mb-2 relative z-10 tracking-tight">خوش آمدید</h2>
          <p className="text-slate-500 text-lg relative z-10 font-medium">سامانه ثبت نظرات {SURVEY_DATA.header.logoText}</p>
        </div>
        
        <div className="px-8 pb-12 pt-4">
          <div className="bg-slate-50 p-6 rounded-2xl mb-8 border border-slate-100">
            <p className="text-lg leading-8 text-slate-700 text-justify font-medium">
              {SURVEY_DATA.header.intro}
            </p>
          </div>
          
          <button
            onClick={() => navigate('/survey')}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white text-2xl font-bold py-5 px-8 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-4 group"
          >
            <span>شروع نظرسنجی</span>
            <ArrowLeft className="group-hover:-translate-x-2 transition-transform" size={28} />
          </button>
        </div>
      </div>
    </div>
  );
};