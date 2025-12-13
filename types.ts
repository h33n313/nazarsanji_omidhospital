export type QuestionType = 'radio' | 'scale' | 'textarea';

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options?: string[]; // For radio and scale
  placeholder?: string; // For textarea
}

export interface Section {
  id: number;
  title: string;
  questions: Question[];
}

export interface SurveyData {
  header: {
    title: string;
    logoText: string;
    intro: string;
    logoUrl?: string;
  };
  sections: Section[];
}

export interface SurveySubmission {
  id?: string;
  timestamp: string;
  answers: Record<string, string | number>;
}