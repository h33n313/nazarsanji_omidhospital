import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SURVEY_DATA } from '../constants.ts';
import { submitSurvey } from '../services/api.ts';
import { 
  ChevronLeft, ChevronRight, CheckCircle2, Loader2, 
  Smile, Meh, Frown, Star, User, CircleUser, ThumbsUp, ThumbsDown, XCircle
} from 'lucide-react';

// Helper for Persian digits
const toPersianDigits = (n: number | string) => {
  const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return n.toString().replace(/\d/g, x => farsiDigits[parseInt(x)]);
};

export const SurveyWizard: React.FC = () => {
  const navigate = useNavigate();
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const currentSection = SURVEY_DATA.sections[currentSectionIndex];
  const totalSections = SURVEY_DATA.sections.length;
  const progress = ((currentSectionIndex + 1) / totalSections) * 100;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentSectionIndex]);

  const handleOptionChange = (questionId: string, value: string | number) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleNext = () => {
    if (currentSectionIndex < totalSections - 1) {
      setCurrentSectionIndex(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrev = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await submitSurvey(answers);
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 4000);
    } catch (error) {
      alert('خطا در ثبت اطلاعات. لطفا مجددا تلاش کنید.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to get icon for scale
  const getScaleIcon = (option: string) => {
    switch (option) {
      case 'عالی': return <Star className="text-yellow-500 fill-yellow-500" size={32} />;
      case 'خوب': return <Smile className="text-green-500" size={32} />;
      case 'متوسط': return <Meh className="text-orange-400" size={32} />;
      case 'ضعیف': return <Frown className="text-red-500" size={32} />;
      default: return null;
    }
  };

  // Helper to get icon for gender
  const getGenderIcon = (option: string) => {
    if (option === 'مرد') return <User size={40} className="text-blue-500" />;
    if (option === 'زن') return <User size={40} className="text-pink-500" />;
    return <CircleUser size={40} />;
  };

  // Helper to get icon for Yes/No
  const getBooleanIcon = (option: string) => {
    if (option === 'بله') return <CheckCircle2 size={36} className="text-green-600" />;
    if (option === 'خیر') return <XCircle size={36} className="text-red-500" />;
    return null;
  };

  if (isSuccess) {
    return (
      <div className="flex-grow flex items-center justify-center p-6 bg-slate-50">
        <div className="text-center animate-fade-in-up bg-white p-12 rounded-3xl shadow-xl max-w-lg w-full">
          <div className="inline-flex items-center justify-center w-28 h-28 bg-green-100 text-green-600 rounded-full mb-8">
            <CheckCircle2 size={64} />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-4">با تشکر از شما</h2>
          <p className="text-slate-500 text-xl">نظر شما با موفقیت ثبت شد.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 pb-32">
      {/* Progress Bar */}
      <div className="mb-10">
        <div className="flex justify-between text-sm font-medium text-slate-500 mb-3 px-1">
          <span>شروع</span>
          <span>صفحه {toPersianDigits(currentSectionIndex + 1)} از {toPersianDigits(totalSections)}</span>
          <span>پایان</span>
        </div>
        <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden dir-ltr shadow-inner">
          <div 
            className="bg-teal-500 h-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(20,184,166,0.5)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Section Content */}
      <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-6 sm:p-10 mb-8 animate-fade-in">
        <h3 className="text-2xl font-extrabold text-teal-900 mb-8 pb-4 border-b-2 border-slate-100 flex items-center gap-3">
          <span className="bg-teal-100 text-teal-700 w-8 h-8 rounded-full flex items-center justify-center text-sm">{toPersianDigits(currentSection.id)}</span>
          {currentSection.title}
        </h3>

        <div className="space-y-12">
          {currentSection.questions.map((q) => (
            <div key={q.id} className="space-y-5">
              <label className="block text-slate-800 font-bold text-xl leading-relaxed">
                {q.text}
              </label>

              {/* Input Types */}
              <div className="pt-2">
                {/* Special Logic for Scale/Rating */}
                {q.type === 'scale' && q.options && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {q.options.map((opt, idx) => (
                      <label key={opt} className="cursor-pointer group">
                        <input
                          type="radio"
                          name={q.id}
                          value={opt}
                          checked={answers[q.id] === opt}
                          onChange={(e) => handleOptionChange(q.id, e.target.value)}
                          className="peer sr-only"
                        />
                        <div className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-slate-100 bg-slate-50 transition-all duration-200 peer-checked:border-teal-500 peer-checked:bg-teal-50 peer-checked:shadow-md hover:bg-white hover:border-teal-200 hover:shadow-lg h-full">
                          <div className="mb-3 transform group-hover:scale-110 transition-transform duration-200">
                             {getScaleIcon(opt)}
                          </div>
                          <span className="text-lg font-bold text-slate-700 peer-checked:text-teal-800">{opt}</span>
                          <span className="text-sm text-slate-400 mt-1 font-mono">({toPersianDigits(idx + 1)})</span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {/* Logic for Radio Buttons (Gender, Yes/No, Type) */}
                {q.type === 'radio' && q.options && (
                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-4">
                    {q.options.map((opt) => {
                      const isGender = opt === 'مرد' || opt === 'زن';
                      const isBool = opt === 'بله' || opt === 'خیر';
                      
                      return (
                        <label key={opt} className="cursor-pointer group flex-1 sm:flex-none">
                          <input
                            type="radio"
                            name={q.id}
                            value={opt}
                            checked={answers[q.id] === opt}
                            onChange={(e) => handleOptionChange(q.id, e.target.value)}
                            className="peer sr-only"
                          />
                          <div className={`
                            flex items-center justify-center gap-3 p-4 rounded-xl border-2 border-slate-200 
                            transition-all duration-200 peer-checked:border-teal-500 peer-checked:bg-teal-50 
                            peer-checked:text-teal-800 hover:border-teal-300 hover:shadow-md h-full
                            ${isGender || isBool ? 'flex-col sm:flex-row py-6' : ''}
                          `}>
                            {isGender && getGenderIcon(opt)}
                            {isBool && getBooleanIcon(opt)}
                            
                            <span className="text-lg font-bold">{opt}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}

                {q.type === 'textarea' && (
                  <textarea
                    rows={5}
                    placeholder={q.placeholder}
                    value={(answers[q.id] as string) || ''}
                    onChange={(e) => handleOptionChange(q.id, e.target.value)}
                    className="w-full p-5 rounded-2xl border-2 border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all resize-none bg-slate-50 focus:bg-white text-lg placeholder:text-slate-400"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200 p-4 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] z-40">
        <div className="max-w-4xl mx-auto flex justify-between gap-4">
          <button
            onClick={handlePrev}
            disabled={currentSectionIndex === 0 || isSubmitting}
            className={`flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-lg transition-colors ${
              currentSectionIndex === 0 
                ? 'text-slate-300 cursor-not-allowed' 
                : 'text-slate-600 hover:bg-slate-100 active:bg-slate-200'
            }`}
          >
            <ChevronRight size={24} />
            مرحله قبل
          </button>

          <button
            onClick={handleNext}
            disabled={isSubmitting}
            className="flex-1 sm:flex-none sm:min-w-[200px] flex items-center justify-center gap-3 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white px-8 py-4 rounded-xl font-bold text-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" size={24} />
            ) : currentSectionIndex === totalSections - 1 ? (
              'ثبت نهایی نظر'
            ) : (
              <>
                مرحله بعد
                <ChevronLeft size={24} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};