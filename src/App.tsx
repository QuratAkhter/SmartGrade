import React, { useState } from 'react';
import { FileText, Upload, Download, CheckCircle, BarChart3, MessageSquare, Settings, Info, HelpCircle, Sparkles, Brain, Target, Award, Zap, Eye } from 'lucide-react';
import axios from "axios";
import Papa from "papaparse";

const API_URL = "http://localhost:5000/evaluate"; // Change if needed

type EvaluationMode = 'single' | 'bulk';

interface SingleResult {
  totalScore: number;
  semanticScore: number;
  keywordScore: number;
  grammarScore: number;
  feedback: string;
}

interface BulkResult {
  studentId: string;
  answer: string;
  semanticScore: number;
  keywordScore: number;
  grammarScore: number;
  finalScore: number;
}

function App() {
  const [mode, setMode] = useState<EvaluationMode>('single');
  const [question, setQuestion] = useState('');
  const [studentAnswer, setStudentAnswer] = useState('');
  const [referenceAnswer, setReferenceAnswer] = useState('');
  const [marksOutOf, setMarksOutOf] = useState(10);
  const [bulkQuestion, setBulkQuestion] = useState('');
  const [bulkReferenceAnswer, setBulkReferenceAnswer] = useState('');
  const [bulkMarksOutOf, setBulkMarksOutOf] = useState(10);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [singleResult, setSingleResult] = useState<SingleResult | null>(null);
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);


const handleSingleEvaluation = async () => {
  if (!referenceAnswer.trim() || !studentAnswer.trim()) {
    alert("Reference and student answer required");
    return;
  }

  setIsEvaluating(true);
  try {
    const res = await axios.post(API_URL, {
      answer: referenceAnswer,
      response: studentAnswer,          // single response
    });
    const { semantic_score, keyword_score, grammar_score, predicted_score: totalScore } = res.data;
    setSingleResult({
      semanticScore: semantic_score * 100,
      keywordScore: keyword_score * 100,
      grammarScore: grammar_score * 100,
      totalScore: Math.round(totalScore * marksOutOf * 100) / 100,
      feedback: "Auto-generated evaluation", // optional
    });
  } catch (err) {
    console.error(err);
    alert("Evaluation error");
  } finally {
    setIsEvaluating(false);
  }
};

const handleBulkEvaluation = async () => {
  if (!csvFile || !bulkReferenceAnswer.trim()) {
    alert("Please provide a reference answer and upload a CSV file.");
    return;
  }

  setIsEvaluating(true);

  try {
    if (!(csvFile instanceof File)) {
      alert("Invalid file. Please re-upload.");
      setIsEvaluating(false);
      return;
    }

    const text = await csvFile.text();

    // Parse CSV with header = true
    const parsed = Papa.parse(text, {
      header: true,             // First row is header
      skipEmptyLines: true,
    });

    const data = parsed.data;

    const responses: string[] = [];
    const studentIds: string[] = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      // Use first and second column regardless of header names
      const studentId = row[Object.keys(row)[0]]?.trim();
      const response = row[Object.keys(row)[1]]?.trim();

      if (studentId && response) {
        studentIds.push(studentId);
        responses.push(response);
      }
    }

    if (responses.length === 0) {
      alert("CSV file must contain at least two columns (student ID and response).");
      setIsEvaluating(false);
      return;
    }

    const res = await axios.post(API_URL, {
      answer: bulkReferenceAnswer,
      responses,
    });

    const { results } = res.data;

const finalResults = results.map((r: any, i: number) => ({
  studentId: studentIds[i],
  response: responses[i],
  semanticScore: parseFloat((r.semantic_score * 100).toFixed(2)),
  keywordScore: parseFloat((r.keyword_score * 100).toFixed(2)),
  grammarScore: parseFloat((r.grammar_score * 100).toFixed(2)),
  finalScore: parseFloat((r.predicted_score * bulkMarksOutOf).toFixed(2)),
}));

    setBulkResults(finalResults);
  } catch (error) {
    console.error("Bulk evaluation error:", error);
    alert("An error occurred while processing the file.");
  } finally {
    setIsEvaluating(false);
  }
};



  const downloadResults = () => {
    const csvContent = [
      ['Student ID', 'Answer', 'Semantic Score (%)', 'Keyword Score (%)', 'Grammar Score (%)', 'Final Score'],
      ...bulkResults.map(result => [
        result.studentId,
        `"${result.response}"`,
        result.semanticScore,
        result.keywordScore, 
        result.grammarScore,
        result.finalScore
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'evaluation_results.csv';
    a.click();
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 70) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 60) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 85) return <Award className="h-4 w-4" />;
    if (score >= 70) return <Target className="h-4 w-4" />;
    if (score >= 60) return <Eye className="h-4 w-4" />;
    return <Zap className="h-4 w-4" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-emerald-400/20 to-blue-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <header className="relative bg-white/80 backdrop-blur-lg shadow-lg border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur opacity-75 animate-pulse"></div>
              <div className="relative p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
                <Brain className="h-10 w-10 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-600 bg-clip-text text-transparent">
                SMARTGRADE Subjective Answer Evaluator
              </h1>
              <p className="text-slate-600 mt-2 text-lg">AI-powered evaluation for educational assessments</p>
            </div>
            <div className="hidden lg:flex items-center space-x-2 ml-auto">
              <Sparkles className="h-5 w-5 text-yellow-500 animate-pulse" />
              <span className="text-sm font-medium text-slate-600">Powered by Advanced AI</span>
            </div>
          </div>
        </div>
      </header>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mode Selection */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-slate-200/50 p-8 mb-8 hover:shadow-2xl transition-all duration-300">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
            <Settings className="h-6 w-6 mr-3 text-blue-600" />
            Choose Evaluation Mode
            <Sparkles className="h-5 w-5 ml-2 text-yellow-500 animate-bounce" />
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => setMode('single')}
              className={`group relative p-6 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                mode === 'single'
                  ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 text-blue-700 shadow-lg'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-center space-x-3 mb-3">
                <MessageSquare className={`h-6 w-6 transition-transform duration-300 ${mode === 'single' ? 'scale-110' : 'group-hover:scale-110'}`} />
                <span className="font-bold text-lg">Single Answer Evaluation</span>
              </div>
              <p className="text-sm opacity-75 leading-relaxed">Evaluate one student answer at a time with detailed feedback</p>
              {mode === 'single' && (
                <div className="absolute top-2 right-2">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                </div>
              )}
            </button>
            <button
              onClick={() => setMode('bulk')}
              className={`group relative p-6 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                mode === 'bulk'
                  ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 text-blue-700 shadow-lg'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-center space-x-3 mb-3">
                <BarChart3 className={`h-6 w-6 transition-transform duration-300 ${mode === 'bulk' ? 'scale-110' : 'group-hover:scale-110'}`} />
                <span className="font-bold text-lg">Bulk Evaluation via CSV</span>
              </div>
              <p className="text-sm opacity-75 leading-relaxed">Evaluate multiple answers from CSV file efficiently</p>
              {mode === 'bulk' && (
                <div className="absolute top-2 right-2">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Single Answer Evaluation */}
        {mode === 'single' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-slate-200/50 p-8 hover:shadow-2xl transition-all duration-300">
              <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-emerald-600" />
                Input Section
              </h3>
              
              <div className="space-y-6">
                <div className="group">
                  <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    Question
                  </label>
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Enter the question that students need to answer..."
                    className="w-full h-24 px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 resize-none group-hover:border-slate-300 bg-white/50"
                  />
                </div>

                <div className="group">
                  <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center">
                    <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                    Student's Answer
                  </label>
                  <textarea
                    value={studentAnswer}
                    onChange={(e) => setStudentAnswer(e.target.value)}
                    placeholder="Enter the student's answer here..."
                    className="w-full h-32 px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-300 resize-none group-hover:border-slate-300 bg-white/50"
                  />
                </div>

                <div className="group">
                  <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                    Reference Answer
                  </label>
                  <textarea
                    value={referenceAnswer}
                    onChange={(e) => setReferenceAnswer(e.target.value)}
                    placeholder="Enter the reference/model answer here..."
                    className="w-full h-32 px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-300 resize-none group-hover:border-slate-300 bg-white/50"
                  />
                </div>

                <div className="group">
                  <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center">
                    <span className="w-2 h-2 bg-amber-500 rounded-full mr-2"></span>
                    Marks Out Of
                  </label>
                  <input
                    type="number"
                    value={marksOutOf}
                    onChange={(e) => setMarksOutOf(Number(e.target.value))}
                    min="1"
                    max="100"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 transition-all duration-300 group-hover:border-slate-300 bg-white/50"
                  />
                </div>

                <button
                  onClick={handleSingleEvaluation}
                  disabled={isEvaluating}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 focus:ring-4 focus:ring-blue-500/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  {isEvaluating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Evaluating with AI...</span>
                      <Sparkles className="h-5 w-5 animate-pulse" />
                    </>
                  ) : (
                    <>
                      <Brain className="h-5 w-5" />
                      <span>Generate AI Score</span>
                      <Zap className="h-5 w-5" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Single Results */}
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-slate-200/50 p-8 hover:shadow-2xl transition-all duration-300">
              <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                Evaluation Results
              </h3>
              
              {singleResult ? (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="text-center relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-2xl blur-xl"></div>
                    <div className="relative bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-2xl border border-blue-200">
                      <div className="text-5xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                        {singleResult.totalScore}/{marksOutOf}
                      </div>
                      <p className="text-slate-600 font-medium">Total Score</p>
                      <Award className="h-8 w-8 text-yellow-500 mx-auto mt-2 animate-bounce" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className={`p-4 rounded-xl border-2 transition-all duration-300 hover:scale-105 ${getScoreColor(singleResult.semanticScore)}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-bold">{singleResult.semanticScore}%</div>
                          <p className="text-sm font-medium">Semantic Similarity</p>
                        </div>
                        {getScoreIcon(singleResult.semanticScore)}
                      </div>
                    </div>
                    <div className={`p-4 rounded-xl border-2 transition-all duration-300 hover:scale-105 ${getScoreColor(singleResult.keywordScore)}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-bold">{singleResult.keywordScore}%</div>
                          <p className="text-sm font-medium">Keyword Matching</p>
                        </div>
                        {getScoreIcon(singleResult.keywordScore)}
                      </div>
                    </div>
                    <div className={`p-4 rounded-xl border-2 transition-all duration-300 hover:scale-105 ${getScoreColor(singleResult.grammarScore)}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-bold">{singleResult.grammarScore}%</div>
                          <p className="text-sm font-medium">Grammar Quality</p>
                        </div>
                        {getScoreIcon(singleResult.grammarScore)}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-6 rounded-xl border-2 border-slate-200 hover:border-blue-300 transition-all duration-300">
                    <h4 className="font-bold text-slate-900 mb-3 flex items-center">
                      <MessageSquare className="h-4 w-4 mr-2 text-blue-600" />
                      AI Feedback
                    </h4>
                    <p className="text-slate-700 leading-relaxed">{singleResult.feedback}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-80 text-slate-400">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-xl animate-pulse"></div>
                    <BarChart3 className="relative h-16 w-16 mb-4 text-slate-300" />
                  </div>
                  <p className="text-lg font-medium">Results will appear here after evaluation</p>
                  <p className="text-sm mt-2">Fill in the form and click "Generate AI Score"</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bulk Evaluation */}
        {mode === 'bulk' && (
          <div className="space-y-8">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-slate-200/50 p-8 hover:shadow-2xl transition-all duration-300">
              <h3 className="text-xl font-bold text-slate-900 mb-8 flex items-center">
                <Upload className="h-6 w-6 mr-3 text-emerald-600" />
                Bulk Evaluation Setup
                <Sparkles className="h-5 w-5 ml-2 text-yellow-500 animate-pulse" />
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="group">
                    <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      Question
                    </label>
                    <textarea
                      value={bulkQuestion}
                      onChange={(e) => setBulkQuestion(e.target.value)}
                      placeholder="Enter the question that students answered..."
                      className="w-full h-24 px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 resize-none group-hover:border-slate-300 bg-white/50"
                    />
                  </div>

                  <div className="group">
                    <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center">
                      <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                      Upload CSV File
                    </label>
                    <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 hover:border-purple-400 hover:bg-purple-50/50 ${csvFile ? 'border-emerald-400 bg-emerald-50/50' : 'border-slate-300'}`}>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="csv-upload"
                      />
                      <label htmlFor="csv-upload" className="cursor-pointer group">
                        <div className="relative">
                          <Upload className={`h-12 w-12 mx-auto mb-3 transition-all duration-300 group-hover:scale-110 ${csvFile ? 'text-emerald-500' : 'text-slate-400'}`} />
                          {csvFile && (
                            <CheckCircle className="absolute -top-1 -right-1 h-6 w-6 text-emerald-500 bg-white rounded-full" />
                          )}
                        </div>
                        <p className={`font-bold text-lg mb-2 ${csvFile ? 'text-emerald-600' : 'text-slate-600'}`}>
                          {csvFile ? csvFile.name : 'Click to upload CSV file'}
                        </p>
                        <p className="text-sm text-slate-500">
                          CSV should contain columns: student_id, answer
                        </p>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="group">
                    <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                      Reference Answer
                    </label>
                    <textarea
                      value={bulkReferenceAnswer}
                      onChange={(e) => setBulkReferenceAnswer(e.target.value)}
                      placeholder="Enter the reference answer for comparison..."
                      className="w-full h-32 px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-300 resize-none group-hover:border-slate-300 bg-white/50"
                    />
                  </div>

                  <div className="group">
                    <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center">
                      <span className="w-2 h-2 bg-amber-500 rounded-full mr-2"></span>
                      Marks Out Of
                    </label>
                    <input
                      type="number"
                      value={bulkMarksOutOf}
                      onChange={(e) => setBulkMarksOutOf(Number(e.target.value))}
                      min="1"
                      max="100"
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 transition-all duration-300 group-hover:border-slate-300 bg-white/50"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleBulkEvaluation}
                disabled={isEvaluating}
                className="w-full mt-8 bg-gradient-to-r from-emerald-600 to-blue-600 text-white py-4 px-6 rounded-xl font-bold text-lg hover:from-emerald-700 hover:to-blue-700 focus:ring-4 focus:ring-emerald-500/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                {isEvaluating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Processing CSV with AI...</span>
                    <Sparkles className="h-5 w-5 animate-pulse" />
                  </>
                ) : (
                  <>
                    <BarChart3 className="h-5 w-5" />
                    <span>Evaluate CSV</span>
                    <Zap className="h-5 w-5" />
                  </>
                )}
              </button>
            </div>

            {/* Bulk Results */}
            {bulkResults.length > 0 && (
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-slate-200/50 p-8 hover:shadow-2xl transition-all duration-300 animate-in fade-in duration-500">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
                  <h3 className="text-xl font-bold text-slate-900 mb-4 sm:mb-0 flex items-center">
                    <Award className="h-6 w-6 mr-3 text-emerald-600" />
                    Evaluation Results
                    <span className="ml-3 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                      {bulkResults.length} Students
                    </span>
                  </h3>
                  <button
                    onClick={downloadResults}
                    className="bg-gradient-to-r from-emerald-600 to-green-600 text-white py-3 px-6 rounded-xl font-bold hover:from-emerald-700 hover:to-green-700 focus:ring-4 focus:ring-emerald-500/20 transition-all duration-300 flex items-center space-x-2 transform hover:scale-105 shadow-lg hover:shadow-xl"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download Results</span>
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full border-collapse bg-white">
                    <thead>
                      <tr className="bg-gradient-to-r from-slate-50 to-blue-50">
                        <th className="text-left py-4 px-6 font-bold text-slate-700 border-b border-slate-200">Student ID</th>
                        <th className="text-left py-4 px-6 font-bold text-slate-700 border-b border-slate-200">Answer Preview</th>
                        <th className="text-center py-4 px-6 font-bold text-slate-700 border-b border-slate-200">Semantic</th>
                        <th className="text-center py-4 px-6 font-bold text-slate-700 border-b border-slate-200">Keyword</th>
                        <th className="text-center py-4 px-6 font-bold text-slate-700 border-b border-slate-200">Grammar</th>
                        <th className="text-center py-4 px-6 font-bold text-slate-700 border-b border-slate-200">Final Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkResults.map((result, index) => (
                        <tr key={index} className="border-b border-slate-100 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 transition-all duration-200 group">
                          <td className="py-4 px-6 font-bold text-slate-900">{result.studentId}</td>
                          <td className="py-4 px-6 text-slate-700 max-w-xs">
                            <div className="truncate group-hover:whitespace-normal group-hover:overflow-visible transition-all duration-300">
                              {result.response}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border-2 transition-all duration-300 hover:scale-110 ${getScoreColor(result.semanticScore)}`}>
                              {getScoreIcon(result.semanticScore)}
                              <span className="ml-1">{result.semanticScore}%</span>
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border-2 transition-all duration-300 hover:scale-110 ${getScoreColor(result.keywordScore)}`}>
                              {getScoreIcon(result.keywordScore)}
                              <span className="ml-1">{result.keywordScore}%</span>
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border-2 transition-all duration-300 hover:scale-110 ${getScoreColor(result.grammarScore)}`}>
                              {getScoreIcon(result.grammarScore)}
                              <span className="ml-1">{result.grammarScore}%</span>
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <div className="relative">
                              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                              <span className="relative text-xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                {result.finalScore}/{bulkMarksOutOf}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Statistics Summary */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                    <div className="text-2xl font-bold text-blue-600">
                      {(bulkResults.reduce((sum, r) => sum + r.finalScore, 0) / bulkResults.length).toFixed(1)}
                    </div>
                    <p className="text-sm font-medium text-blue-700">Average Score</p>
                  </div>
                  <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 p-4 rounded-xl border border-emerald-200">
                    <div className="text-2xl font-bold text-emerald-600">
                      {Math.max(...bulkResults.map(r => r.finalScore))}
                    </div>
                    <p className="text-sm font-medium text-emerald-700">Highest Score</p>
                  </div>
                  <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-4 rounded-xl border border-amber-200">
                    <div className="text-2xl font-bold text-amber-600">
                      {Math.min(...bulkResults.map(r => r.finalScore))}
                    </div>
                    <p className="text-sm font-medium text-amber-700">Lowest Score</p>
                  </div>
                  <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                    <div className="text-2xl font-bold text-purple-600">
                      {bulkResults.filter(r => r.finalScore >= bulkMarksOutOf * 0.7).length}
                    </div>
                    <p className="text-sm font-medium text-purple-700">Above 70%</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* About/FAQ Section */}
        <div className="mt-16 bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-slate-200/50 p-8 hover:shadow-2xl transition-all duration-300">
          <h3 className="text-2xl font-bold text-slate-900 mb-8 flex items-center">
            <Info className="h-6 w-6 mr-3 text-blue-600" />
            About & FAQ
            <Sparkles className="h-5 w-5 ml-2 text-yellow-500 animate-pulse" />
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="group p-6 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 hover:border-blue-300 transition-all duration-300 hover:shadow-lg">
                <h4 className="font-bold text-slate-900 mb-3 flex items-center">
                  <HelpCircle className="h-5 w-5 mr-2 text-emerald-600" />
                  How does the AI evaluation work?
                </h4>
                <p className="text-slate-700 leading-relaxed">
                  Our advanced AI system analyzes student answers across three key dimensions: semantic similarity to the reference answer, keyword matching accuracy, and grammatical quality. The final score is calculated using a sophisticated weighted combination of these factors.
                </p>
              </div>

              <div className="group p-6 rounded-xl bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 hover:border-emerald-300 transition-all duration-300 hover:shadow-lg">
                <h4 className="font-bold text-slate-900 mb-3 flex items-center">
                  <HelpCircle className="h-5 w-5 mr-2 text-emerald-600" />
                  CSV file format for bulk evaluation
                </h4>
                <p className="text-slate-700 leading-relaxed">
                  Your CSV file should contain two columns: 'student_id' and 'answer'. The first row should contain these column headers, followed by the student data in subsequent rows. Make sure answers are properly quoted if they contain commas.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="group p-6 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 hover:border-purple-300 transition-all duration-300 hover:shadow-lg">
                <h4 className="font-bold text-slate-900 mb-3 flex items-center">
                  <HelpCircle className="h-5 w-5 mr-2 text-emerald-600" />
                  Scoring methodology
                </h4>
                <div className="text-slate-700 leading-relaxed space-y-2">
                  <p><strong className="text-emerald-600">Semantic Similarity:</strong> Measures conceptual understanding and meaning alignment</p>
                  <p><strong className="text-purple-600">Keyword Matching:</strong> Evaluates presence of important terms and concepts</p>
                  <p><strong className="text-amber-600">Grammar Quality:</strong> Assesses writing clarity, grammar, and structure</p>
                </div>
              </div>

              <div className="group p-6 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 hover:border-amber-300 transition-all duration-300 hover:shadow-lg">
                <h4 className="font-bold text-slate-900 mb-3 flex items-center">
                  <HelpCircle className="h-5 w-5 mr-2 text-emerald-600" />
                  Best practices for optimal results
                </h4>
                <p className="text-slate-700 leading-relaxed">
                  Provide comprehensive questions and reference answers that include key concepts, terminology, and expected reasoning patterns. The system works best with answers that are at least 50 words long and questions that are clearly defined.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative bg-slate-900 text-white py-12 mt-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/20 to-purple-900/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Brain className="h-6 w-6 text-blue-400" />
            <span className="text-xl font-bold">Subjective Answer Evaluator</span>
            <Sparkles className="h-5 w-5 text-yellow-400 animate-pulse" />
          </div>
          <p className="text-slate-400 text-lg">
            © 2025 Subjective Answer Evaluator. Empowering educators with AI-driven assessment tools.
          </p>
          <p className="text-slate-500 mt-2">
            Built with ❤️ for the future of education
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;