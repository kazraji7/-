import React, { useState } from 'react';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { Loader2, Copy, CheckCircle2, Sparkles, BookA, X, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const DIFFICULTIES = [
  { id: 'سهل جداً ومباشر', label: 'سهل' },
  { id: 'متوسط', label: 'متوسط' },
  { id: 'صعب ويحتاج لتفكير', label: 'صعب' },
  { id: 'لغز شعري أو مجازي', label: 'لغز' },
];

const COUNTS = [1, 3, 5, 10];

export default function App() {
  const [word, setWord] = useState('');
  const [count, setCount] = useState(3);
  const [difficulty, setDifficulty] = useState('متوسط');
  const [clues, setClues] = useState<string[]>([]);
  const [synonyms, setSynonyms] = useState<string[]>([]);
  const [antonyms, setAntonyms] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const generateClues = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!word.trim()) return;

    setIsLoading(true);
    setError('');
    setClues([]);
    setSynonyms([]);
    setAntonyms([]);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'undefined') {
        setError('مفتاح API مفقود. يرجى إضافة GEMINI_API_KEY في إعدادات البيئة (Environment Variables) في Netlify وإعادة بناء المشروع (Trigger Deploy).');
        setIsLoading(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `أعطني ${count} تلميحات كلمات متقاطعة لكلمة "${word}". الصعوبة: ${difficulty}. لا تذكر الكلمة. الإجابة الوحيدة هي الكلمة. أعطني أيضاً مرادفات وأضداد.`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              clues: { type: Type.ARRAY, items: { type: Type.STRING } },
              synonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
              antonyms: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["clues", "synonyms", "antonyms"]
          },
        },
      });

      const resultText = response.text;
      if (resultText) {
        const parsed = JSON.parse(resultText);
        setClues(parsed.clues || []);
        setSynonyms(parsed.synonyms || []);
        setAntonyms(parsed.antonyms || []);
      } else {
        setError('لم يتم إرجاع أي نتيجة. حاول مرة أخرى.');
      }
    } catch (err: any) {
      console.error(err);
      let errorMessage = 'حدث خطأ أثناء إنشاء التلميحات. يرجى المحاولة مرة أخرى.';
      
      if (err.message) {
        if (err.message.includes('API_KEY_INVALID')) {
          errorMessage = 'مفتاح API غير صالح. يرجى التأكد من صحة المفتاح في إعدادات Netlify.';
        } else if (err.message.includes('QUOTA_EXCEEDED')) {
          errorMessage = 'تم تجاوز حصة الاستخدام (Quota). يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.';
        } else if (err.message.includes('location not supported')) {
          errorMessage = 'خدمة Gemini غير متوفرة في منطقتك الحالية حالياً.';
        } else {
          errorMessage = `خطأ: ${err.message}`;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const clearAll = () => {
    setWord('');
    setClues([]);
    setSynonyms([]);
    setAntonyms([]);
    setError('');
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f5f5] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 pt-12 pb-8 px-4 mb-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-50 text-indigo-600 rounded-2xl mb-4 shadow-sm border border-indigo-100">
            <BookA className="w-8 h-8" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-3">
            صانع تلميحات <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-500">الكلمات المتقاطعة</span>
          </h1>
          <p className="text-base text-slate-500 max-w-lg mx-auto">
            أدخل كلمة وسيقوم الذكاء الاصطناعي بتوليد تلميحات، مرادفات، وأضداد بسرعة فائقة.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Card */}
        <div className="bg-white rounded-[24px] shadow-sm border border-slate-200 overflow-hidden mb-8 p-6 sm:p-8">
          <form onSubmit={generateClues} className="space-y-8">
            {/* Word Input */}
            <div className="relative">
              <input
                type="text"
                id="word"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                placeholder="أدخل الكلمة هنا (مثال: بحر، شمس...)"
                className="w-full px-6 py-5 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-2xl font-bold text-center bg-slate-50 focus:bg-white placeholder:text-slate-400 placeholder:font-normal"
                required
              />
              {word && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Count Selector */}
              <div className="space-y-3">
                <label className="block text-sm font-bold text-slate-700">عدد التلميحات</label>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  {COUNTS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCount(c)}
                      className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${count === c ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty Selector */}
              <div className="space-y-3">
                <label className="block text-sm font-bold text-slate-700">مستوى الصعوبة</label>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDifficulty(d.id)}
                      className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${difficulty === d.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !word.trim()}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-4 rounded-xl font-bold text-lg transition-all focus:ring-4 focus:ring-slate-900/20 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  جاري التوليد بسرعة...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  توليد التلميحات
                </>
              )}
            </button>
          </form>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-8"
            >
              <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200 flex items-center gap-3">
                <span className="font-medium">{error}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-32 bg-slate-200 rounded-[24px]"></div>
              <div className="h-32 bg-slate-200 rounded-[24px]"></div>
            </div>
            <div className="h-8 w-48 bg-slate-200 rounded-lg mb-4"></div>
            {[...Array(count)].map((_, i) => (
              <div key={i} className="h-20 bg-slate-200 rounded-[20px]"></div>
            ))}
          </div>
        )}

        {/* Results */}
        <AnimatePresence mode="wait">
          {!isLoading && clues.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Synonyms & Antonyms */}
              {(synonyms.length > 0 || antonyms.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {synonyms.length > 0 && (
                    <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm">
                      <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        مرادفات
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {synonyms.map((syn, i) => (
                          <span key={i} className="bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-100">
                            {syn}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {antonyms.length > 0 && (
                    <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm">
                      <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                        أضداد
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {antonyms.map((ant, i) => (
                          <span key={i} className="bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-100">
                            {ant}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Clues */}
              <div>
                <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-4 px-2">التلميحات المقترحة</h3>
                <div className="grid gap-3">
                  {clues.map((clue, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-white p-5 rounded-[20px] shadow-sm border border-slate-200 flex items-center gap-4 group hover:border-indigo-300 transition-all"
                    >
                      <div className="flex-shrink-0 w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center font-bold text-lg border border-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-colors">
                        {index + 1}
                      </div>
                      <p className="flex-grow text-lg text-slate-800 font-medium leading-snug">
                        {clue}
                      </p>
                      <button
                        onClick={() => copyToClipboard(clue, index)}
                        className="flex-shrink-0 p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors focus:outline-none"
                        title="نسخ التلميح"
                      >
                        {copiedIndex === index ? (
                          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                        ) : (
                          <Copy className="w-6 h-6" />
                        )}
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

