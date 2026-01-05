import React, { useState, useEffect, useRef } from 'react';
import { Upload, Download, Settings, RefreshCw, Wand2, Grid3X3, ArrowRight, Loader2, Image as ImageIcon } from 'lucide-react';
import { ImageUploader } from './components/ImageUploader';
import { splitImageGrid } from './utils/imageProcessing';
import { analyzeGridImage } from './services/geminiService';
import { ProcessedImage, ProcessingStatus } from './types';

const App: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [slices, setSlices] = useState<ProcessedImage[]>([]);
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [threshold, setThreshold] = useState<number>(30); // Default sensitivity
  const [aiDescription, setAiDescription] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // Process image when image or threshold changes
  useEffect(() => {
    if (originalImage) {
      processImage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originalImage, threshold]);

  const processImage = async () => {
    if (!originalImage) return;
    setStatus(ProcessingStatus.PROCESSING);
    try {
      const results = await splitImageGrid(originalImage, {
        threshold: threshold,
        padding: 0
      });
      setSlices(results);
      setStatus(ProcessingStatus.COMPLETED);
    } catch (error) {
      console.error(error);
      setStatus(ProcessingStatus.ERROR);
    }
  };

  const handleImageSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setOriginalImage(e.target.result as string);
        setAiDescription(''); // Reset AI text
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = (dataUrl: string, index: number) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `split_image_${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = () => {
    slices.forEach((slice, idx) => {
      // Stagger downloads slightly to prevent browser blocking
      setTimeout(() => {
        handleDownload(slice.dataUrl, slice.id);
      }, idx * 200);
    });
  };

  const handleAiAnalysis = async () => {
    if (!originalImage) return;
    setIsAnalyzing(true);
    try {
      const text = await analyzeGridImage(originalImage);
      setAiDescription(text);
    } catch (err) {
      setAiDescription("Sorry, AI analysis failed. Please check your API key.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setOriginalImage(null);
    setSlices([]);
    setStatus(ProcessingStatus.IDLE);
    setAiDescription('');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 selection:bg-blue-500/30">
      {/* Header */}
      <header className="bg-slate-950/50 backdrop-blur-md sticky top-0 z-50 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <Grid3X3 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              CAVP - Storyboard Image Splitter
            </h1>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <span className="hidden sm:block">Smart Border Removal</span>
            <span className="w-px h-4 bg-slate-700 hidden sm:block"></span>
            <span className="hidden sm:block">High Quality Export</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {/* State: No Image */}
        {!originalImage && (
          <div className="min-h-[60vh] flex flex-col items-center justify-center animate-fade-in-up">
            <ImageUploader onImageSelected={handleImageSelect} />
            
            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-4xl w-full">
              {[
                { icon: Grid3X3, title: "Auto Split", desc: "Instantly divides your 3x3 collage into 9 separate files." },
                { icon: RefreshCw, title: "Clean Borders", desc: "Intelligently detects and removes white or black bars." },
                { icon: Wand2, title: "AI Analysis", desc: "Get AI-powered captions for your grid post using Gemini." },
              ].map((feat, i) => (
                <div key={i} className="bg-slate-800/30 p-6 rounded-xl border border-slate-700/50">
                  <feat.icon className="w-8 h-8 text-blue-400 mb-3" />
                  <h3 className="font-semibold text-white mb-1">{feat.title}</h3>
                  <p className="text-sm text-slate-400">{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* State: Image Loaded */}
        {originalImage && (
          <div className="grid lg:grid-cols-12 gap-8 animate-fade-in">
            
            {/* Sidebar / Controls */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Original Preview */}
              <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-medium text-white flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-blue-400" /> Original
                  </h2>
                  <button 
                    onClick={reset}
                    className="text-xs text-red-400 hover:text-red-300 hover:underline"
                  >
                    Remove
                  </button>
                </div>
                <div className="relative aspect-square rounded-lg overflow-hidden bg-slate-900 border border-slate-700">
                   <img src={originalImage} alt="Original" className="w-full h-full object-contain" />
                </div>
              </div>

              {/* Controls */}
              <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl">
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="w-5 h-5 text-blue-400" />
                  <h2 className="font-semibold text-white">Adjustments</h2>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <label className="text-slate-300">Border Threshold</label>
                      <span className="text-blue-400 font-mono">{threshold}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={threshold}
                      onChange={(e) => setThreshold(Number(e.target.value))}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      Higher values remove more aggressive borders. <br/>
                      <span className="text-blue-300 opacity-80">
                        (Automatic grid detection is also active)
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-700">
                  <button
                    onClick={handleDownloadAll}
                    disabled={status !== ProcessingStatus.COMPLETED}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-5 h-5" />
                    Download All 9 Images
                  </button>
                </div>
              </div>

               {/* AI Section */}
               <div className="bg-gradient-to-br from-indigo-900/50 to-slate-800 rounded-2xl p-6 border border-indigo-500/30 shadow-xl">
                <div className="flex items-center gap-2 mb-4">
                  <Wand2 className="w-5 h-5 text-indigo-400" />
                  <h2 className="font-semibold text-white">Gemini AI Assistant</h2>
                </div>
                
                {!aiDescription ? (
                  <button
                    onClick={handleAiAnalysis}
                    disabled={isAnalyzing}
                    className="w-full py-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/50 text-indigo-200 rounded-lg text-sm transition-all flex items-center justify-center gap-2"
                  >
                    {isAnalyzing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Wand2 className="w-4 h-4" />
                    )}
                    {isAnalyzing ? 'Analyzing Grid...' : 'Generate Caption'}
                  </button>
                ) : (
                  <div className="space-y-3 animate-fade-in">
                    <p className="text-sm text-indigo-100 italic leading-relaxed bg-indigo-950/30 p-3 rounded-lg border border-indigo-500/20">
                      "{aiDescription}"
                    </p>
                    <button 
                      onClick={() => setAiDescription('')}
                      className="text-xs text-indigo-400 hover:text-indigo-300"
                    >
                      Try again
                    </button>
                  </div>
                )}
              </div>

            </div>

            {/* Main Result Area */}
            <div className="lg:col-span-8">
               <div className="flex items-center justify-between mb-6">
                 <h2 className="text-2xl font-bold text-white">Split Results</h2>
                 <div className="text-sm text-slate-400">
                   {status === ProcessingStatus.PROCESSING ? (
                     <span className="flex items-center gap-2 text-blue-400">
                       <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                     </span>
                   ) : (
                     <span>{slices.length} images ready</span>
                   )}
                 </div>
               </div>

               <div className="grid grid-cols-3 gap-4">
                 {slices.map((slice) => (
                   <div 
                    key={slice.id} 
                    className="group relative aspect-square bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-md transition-all hover:ring-2 hover:ring-blue-500"
                   >
                     {/* Transparent checkerboard background for png transparency check */}
                     <div className="absolute inset-0 opacity-20" 
                          style={{ backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)', backgroundSize: '10px 10px' }}>
                     </div>
                     
                     <img 
                      src={slice.dataUrl} 
                      alt={`Slice ${slice.id}`} 
                      className="relative z-10 w-full h-full object-contain p-2"
                     />
                     
                     <div className="absolute inset-0 z-20 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                       <span className="text-white font-mono text-xs bg-black/50 px-2 py-1 rounded">
                         {slice.width}x{slice.height}
                       </span>
                       <button
                        onClick={() => handleDownload(slice.dataUrl, slice.id)}
                        className="p-2 bg-white text-slate-900 rounded-full hover:bg-blue-50 transition-transform hover:scale-110"
                        title="Download this slice"
                       >
                         <Download className="w-5 h-5" />
                       </button>
                     </div>
                     
                     <div className="absolute top-2 left-2 z-20 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm">
                       #{slice.id + 1}
                     </div>
                   </div>
                 ))}
               </div>
               
               {/* Instructions Footer */}
               <div className="mt-8 p-4 bg-blue-900/10 border border-blue-800/30 rounded-lg flex gap-4 items-start">
                  <div className="bg-blue-500/20 p-2 rounded-full shrink-0">
                    <ArrowRight className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-200 text-sm mb-1">Intelligent Auto-Split</h4>
                    <p className="text-blue-200/70 text-sm">
                      The AI first scans for the actual grid lines (gutters) to accurately separate the 9 photos. It then applies a secondary pixel-cleaning pass to remove any remaining white or black borders based on your threshold setting.
                    </p>
                  </div>
               </div>

            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;