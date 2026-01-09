
import React, { useState, useEffect } from 'react';
import { AIProviderManager } from './services/aiProviderManager';
import { AIProvider, ApiKeyError } from './services/aiProviderInterface';
import { WasteItem, ChatHistoryItem } from './types';
import CategoryBadge from './components/CategoryBadge';
import { WASTE_DATABASE } from './constants';
import { findLocalMatch } from './utils/fuzzySearch';
import { getAICache } from './utils/aiCache';
import { getAnalytics, AnalyticsEvent } from './utils/analytics';
import { retryApiCall } from './utils/retryLogic';
import { prefetchPopularQueries, shouldPrefetch } from './utils/prefetch';

// Hooks
import { useSpeech } from './src/hooks/useSpeech';
import { useCamera } from './src/hooks/useCamera';
import { useAnnounce } from './src/hooks/useAnnounce';

// Components
import Header from './src/components/layout/Header';
import SearchBox from './src/components/ui/SearchBox';
import TipSection from './src/components/ui/TipSection';
import ResultCard from './src/components/waste/ResultCard';
import CameraView from './src/components/waste/CameraView';
import RecyclingGuide from './src/components/waste/RecyclingGuide';
import AddWasteModal from './src/components/waste/AddWasteModal';
import CollectionAlert from './src/components/schedule/CollectionAlert';
import NotificationPrompt from './src/components/ui/NotificationPrompt';
import NotificationSettings from './src/components/ui/NotificationSettings';
import ApiKeyPrompt from './src/components/ui/ApiKeyPrompt';
import HelpModal from './src/components/ui/HelpModal';
import RecyclingTips from './src/components/ui/RecyclingTips';
import LoadingSpinner from './src/components/ui/LoadingSpinner';
import InstallPrompt from './src/components/ui/InstallPrompt';
import CalendarModal from './src/components/schedule/CalendarModal';
import SuggestionList from './src/components/waste/SuggestionList';
import FeedbackButtons from './src/components/waste/FeedbackButtons';
import AnalyticsDashboard from './src/components/ui/AnalyticsDashboard';

const STORAGE_KEY = 'recyklacni_asistent_history';
const USER_DATABASE_KEY = 'recyklacni_asistent_user_db';
const NOTIFICATION_PROMPT_KEY = 'recyklacni_asistent_notification_prompt_shown';

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<(WasteItem & { source?: 'local' | 'ai' | 'user' }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isNotificationSettingsOpen, setIsNotificationSettingsOpen] = useState(false);
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false); // CHANGED: no auto-prompt
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(() =>
    AIProviderManager.getInstance().getCurrentProvider()
  );
  const [apiKeyError, setApiKeyError] = useState<string | undefined>();
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ name: string; category: string; note?: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [pendingQuery, setPendingQuery] = useState<{ text?: string; image?: { data: string; mimeType: string } } | null>(null);
  const [isAnalyticsDashboardOpen, setIsAnalyticsDashboardOpen] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(() => {
    // Show prompt if not shown before and notifications not yet enabled
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const wasShown = localStorage.getItem(NOTIFICATION_PROMPT_KEY);
      return !wasShown && Notification.permission === 'default';
    }
    return false;
  });

  // User-added database items (stored in localStorage)
  const [userDatabase, setUserDatabase] = useState<Array<{ name: string; category: string; note: string }>>(() => {
    try {
      const saved = localStorage.getItem(USER_DATABASE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load user database from localStorage", e);
      return [];
    }
  });

  // Save user database to localStorage
  useEffect(() => {
    localStorage.setItem(USER_DATABASE_KEY, JSON.stringify(userDatabase));
  }, [userDatabase]);

  // Merge both databases for searching
  const fullDatabase = [...WASTE_DATABASE, ...userDatabase];

  const handleAddUserItem = (item: { name: string; category: string; note: string }) => {
    setUserDatabase(prev => [item, ...prev]);

    // Track user added item
    const analytics = getAnalytics();
    analytics.track(AnalyticsEvent.USER_ADDED_ITEM, {
      itemName: item.name,
      category: item.category,
    });
  };

  const { announceResult } = useAnnounce(soundEnabled);

  const handleIdentifyResult = (res: WasteItem & { source?: 'local' | 'ai' | 'user' }, transcript?: string) => {
    setResult(res);
    announceResult(res.category);
    setHistory(prev => [{
      query: transcript || res.name,
      result: res,
      timestamp: Date.now()
    }, ...prev.slice(0, 49)]);
    setQuery('');
    setLoading(false);

    // Track analytics
    const analytics = getAnalytics();
    if (res.source === 'local') {
      analytics.track(AnalyticsEvent.SEARCH_LOCAL_HIT, { query: transcript || res.name });
    } else if (res.source === 'ai') {
      const isFromCache = (res as any).id?.startsWith('cache-');
      if (isFromCache) {
        analytics.track(AnalyticsEvent.SEARCH_CACHE_HIT, { query: transcript || res.name });
      }
    } else if (res.source === 'user') {
      analytics.track(AnalyticsEvent.SEARCH_LOCAL_HIT, { query: transcript || res.name, userAdded: true });
    }
  };

  const [error, setError] = useState<string | null>(null);

  const { isListening, error: speechError, startListening, setError: setSpeechError } = useSpeech((transcript) => {
    setQuery(transcript);
    handleIdentify({ text: transcript });
  });

  const {
    isCameraOpen,
    videoRef,
    canvasRef,
    error: cameraError,
    setError: setCameraError,
    startCamera,
    stopCamera,
    capturePhoto
  } = useCamera();

  const [history, setHistory] = useState<ChatHistoryItem[]>(() => {
    try {
      const savedHistory = localStorage.getItem(STORAGE_KEY);
      return savedHistory ? JSON.parse(savedHistory) : [];
    } catch (e) {
      console.error("Failed to load history from localStorage", e);
      return [];
    }
  });

  const deleteHistoryItem = (timestamp: number) => {
    setHistory(prev => prev.filter(item => item.timestamp !== timestamp));
  };

  const clearHistory = () => {
    if (window.confirm('Opravdu chcete smazat celou historii?')) {
      setHistory([]);
    }
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  // Smart prefetching - warm up cache with popular queries
  useEffect(() => {
    // Only run once on mount
    if (!shouldPrefetch()) return;

    const runPrefetch = async () => {
      try {
        await prefetchPopularQueries(
          async (query) => {
            // Silent search - just to populate cache
            await handleIdentify({ text: query, skipCache: false, skipSuggestions: true });
          },
          20, // Max 20 items
          3000 // Wait 3 seconds after app load
        );
      } catch (error) {
        console.error('Prefetch failed:', error);
      }
    };

    runPrefetch();
  }, []); // Run only once on mount

  const handleIdentify = async ({ text, image, skipCache = false, skipSuggestions = false }: {
    text?: string;
    image?: { data: string; mimeType: string };
    skipCache?: boolean;
    skipSuggestions?: boolean;
  }) => {
    // DEBUG: Log the incoming query to check for truncation
    if (text) {
      console.log(`🔵 handleIdentify received text: "${text}", length: ${text.length}`);
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const aiCache = getAICache();

      // 1. Lokální databáze (včetně uživatelské)
      if (text) {
        const localMatch = findLocalMatch(text, fullDatabase);
        if (localMatch) {
          const isUserItem = userDatabase.some(item => item.name === localMatch.name);
          handleIdentifyResult({
            id: 'local-' + Math.random().toString(36).substring(7),
            ...localMatch,
            isFromDatabase: true,
            source: isUserItem ? 'user' : 'local'
          }, text);
          return;
        }
      }

      // 2. Check AI cache
      if (!skipCache) {
        if (text) {
          const cachedResult = aiCache.findByQuery(text);
          if (cachedResult) {
            console.log('✅ Found in AI cache:', cachedResult.name);
            handleIdentifyResult({
              id: 'cache-' + Math.random().toString(36).substring(7),
              ...cachedResult,
              isFromDatabase: false,
              source: 'ai'
            }, text);
            return;
          }
        } else if (image) {
          const cachedResult = aiCache.findByImage(image.data);
          if (cachedResult) {
            console.log('✅ Found in AI cache (by image):', cachedResult.name);
            handleIdentifyResult({
              id: 'cache-' + Math.random().toString(36).substring(7),
              ...cachedResult,
              isFromDatabase: false,
              source: 'ai'
            }, 'Vyfocený odpad');
            return;
          }
        }
      }

      // 3. Show suggestions before calling AI (only for text queries)
      if (!skipSuggestions && text && !image) {
        // Find top 3 similar items with lower threshold
        const similarItems: Array<{ name: string; category: string; note?: string; score: number }> = [];

        for (const item of fullDatabase) {
          const match = findLocalMatch(text, [item], 5); // Higher threshold for suggestions
          if (match) {
            similarItems.push({ ...match, score: Math.random() }); // TODO: actual scoring
          }
        }

        if (similarItems.length > 0) {
          const topSuggestions = similarItems.slice(0, 3);
          setSuggestions(topSuggestions);
          setShowSuggestions(true);
          setPendingQuery({ text, image });
          setLoading(false);
          return;
        }
      }

      // 4. AI analýza (vyžaduje online)
      if (!isOnline) {
        const analytics = getAnalytics();
        analytics.track(AnalyticsEvent.ERROR_OFFLINE, { query: text, hasImage: !!image });
        setError(image ? 'Focení vyžaduje internet.' : 'Tuto položku nemám v databázi a jste offline.');
        setLoading(false);
        return;
      }

      // Check if AI service is available
      const aiManager = AIProviderManager.getInstance();
      const aiService = aiManager.getAIService();

      if (!aiService) {
        const analytics = getAnalytics();
        analytics.track(AnalyticsEvent.ERROR_NO_API_KEY);
        setError('Pro neznámé položky můžete nastavit API klíč v nastavení.');
        setLoading(false);
        return;
      }

      console.log('🤖 Calling AI service...');
      const analytics = getAnalytics();
      analytics.track(AnalyticsEvent.SEARCH_AI_CALL, { query: text, hasImage: !!image });

      const aiRes = await retryApiCall(
        () => aiService.identifyWaste({ query: text, image }),
        'AI waste identification'
      );

      // Uložit do AI cache
      aiCache.add({
        name: aiRes.name,
        category: aiRes.category,
        note: aiRes.note || '',
        query: text,
        imageData: image?.data,
      });

      // Automaticky uložit AI výsledek do uživatelské databáze pro budoucí vyhledávání
      const aiItem = {
        name: aiRes.name,
        category: aiRes.category,
        note: aiRes.note || ''
      };

      // Zkontrolovat, zda položka již není v databázi (aby se nedulikovaly)
      const alreadyExists = userDatabase.some(
        item => item.name.toLowerCase() === aiItem.name.toLowerCase()
      );

      if (!alreadyExists) {
        setUserDatabase(prev => [aiItem, ...prev]);
      }

      handleIdentifyResult({ ...aiRes, source: 'ai' }, text);
    } catch (err) {
      if (err instanceof ApiKeyError) {
        setApiKeyError(err.message);
        if (err.shouldPromptForKey) {
          setShowApiKeyPrompt(true);
          if (err.provider) {
            setSelectedProvider(err.provider);
          }
        }
        setError(err.message);
      } else {
        setError('Nepodařilo se spojit s asistentem.');
      }
      setLoading(false);
    }
  };

  const displayedError = error || speechError || cameraError;

  return (
    <div className={`min-h-screen transition-all duration-1000 ${isOnline ? 'bg-emerald-50' : 'bg-slate-200'} text-slate-900 pb-20`}>

      <Header
        isOnline={isOnline}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        onOpenNotificationSettings={() => setIsNotificationSettingsOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        onOpenApiKey={() => {
          setApiKeyError(undefined);
          setShowApiKeyPrompt(true);
        }}
        onOpenCalendar={() => setIsCalendarOpen(true)}
        onOpenAnalytics={() => setIsAnalyticsDashboardOpen(true)}
      />

      <main className="max-w-2xl mx-auto px-4 pt-10">

        {!result && !loading && <TipSection />}

        {/* Waste collection alert */}
        {!result && !loading && <CollectionAlert compact />}

        {/* Recycling tips */}
        {!result && !loading && <RecyclingTips />}

        {/* Install app prompt */}
        {!result && !loading && <InstallPrompt />}

        {/* Add to database button */}
        {!result && !loading && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="w-full mb-6 py-4 rounded-[25px] border-4 border-dashed border-emerald-300 text-emerald-600 font-bold text-lg hover:bg-emerald-50 transition-all flex items-center justify-center gap-2"
          >
            <span className="text-2xl">+</span> Přidat vlastní odpad do databáze
          </button>
        )}

        <SearchBox
          query={query}
          setQuery={setQuery}
          onSearch={() => handleIdentify({ text: query })}
          onCamera={() => startCamera(isOnline)}
          onVoice={startListening}
          isListening={isListening}
          loading={loading}
          isOnline={isOnline}
          error={displayedError}
        />

        {loading && <LoadingSpinner message="Analyzuji odpad..." />}

        {result && !loading && (
          <ResultCard result={result} onClose={() => setResult(null)} />
        )}

        {history.length > 0 && !result && !loading && (
          <section className="space-y-6">
            <div className="flex justify-between items-center px-6">
              <h3 className="text-2xl font-black uppercase italic text-slate-500">Historie třídění</h3>
              <button
                onClick={clearHistory}
                className="text-xs font-bold uppercase text-red-500 hover:text-red-700 transition-colors"
                title="Smazat vše"
              >
                Smazat vše
              </button>
            </div>
            <div className="space-y-4">
              {history.map((item, i) => (
                <div key={i} className="relative group">
                  <button
                    onClick={() => {
                      setResult({ ...item.result, source: (item.result as any).source });
                      announceResult(item.result.category);
                    }}
                    className="w-full bg-white p-6 rounded-3xl border-4 border-white shadow-lg flex justify-between items-center active:scale-95 transition-all text-left"
                  >
                    <div className="flex flex-col">
                      <span className="text-xl font-bold text-slate-800 break-words pr-4">{item.query}</span>
                      <span className="text-xs text-slate-400 font-bold uppercase">{new Date(item.timestamp).toLocaleTimeString('cs-CZ')}</span>
                    </div>
                    <CategoryBadge category={item.result.category} variant="minimal" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteHistoryItem(item.timestamp);
                    }}
                    className="absolute -right-2 -top-2 w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center border-2 border-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Smazat záznam"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {!result && !loading && <RecyclingGuide />}

        {isCameraOpen && (
          <CameraView
            videoRef={videoRef}
            onCapture={() => capturePhoto((data) => handleIdentify({ image: { data, mimeType: 'image/jpeg' } }))}
            onClose={stopCamera}
          />
        )}
      </main>

      <canvas ref={canvasRef} className="hidden" />

      <AddWasteModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddUserItem}
      />

      {showNotificationPrompt && (
        <NotificationPrompt
          onClose={() => {
            setShowNotificationPrompt(false);
            localStorage.setItem(NOTIFICATION_PROMPT_KEY, 'true');
          }}
        />
      )}

      <NotificationSettings
        isOpen={isNotificationSettingsOpen}
        onClose={() => setIsNotificationSettingsOpen(false)}
      />

      <ApiKeyPrompt
        isOpen={showApiKeyPrompt}
        onSave={(key, provider) => {
          const aiManager = AIProviderManager.getInstance();
          aiManager.setApiKey(provider, key);
          setSelectedProvider(provider);
          setShowApiKeyPrompt(false);
          setApiKeyError(undefined);
          setError(null);
        }}
        onSkip={() => {
          setShowApiKeyPrompt(false);
          setApiKeyError(undefined);
        }}
        errorMessage={apiKeyError}
        selectedProvider={selectedProvider}
      />


      {showSuggestions && (
        <SuggestionList
          suggestions={suggestions}
          onSelect={(suggestion) => {
            setShowSuggestions(false);
            handleIdentifyResult({
              id: 'suggestion-' + Math.random().toString(36).substring(7),
              name: suggestion.name,
              category: suggestion.category as any,
              note: suggestion.note || '',
              isFromDatabase: true,
              source: 'local'
            }, pendingQuery?.text || suggestion.name);
            setPendingQuery(null);

            // Track suggestion accepted
            const analytics = getAnalytics();
            analytics.track(AnalyticsEvent.SEARCH_SUGGESTION_ACCEPTED, {
              query: pendingQuery?.text,
              selectedSuggestion: suggestion.name,
            });
          }}
          onUseAI={() => {
            setShowSuggestions(false);
            if (pendingQuery) {
              // Track suggestion rejected - user chose AI
              const analytics = getAnalytics();
              analytics.track(AnalyticsEvent.SEARCH_SUGGESTION_REJECTED, {
                query: pendingQuery.text,
                reason: 'user_chose_ai',
              });
              handleIdentify({ ...pendingQuery, skipSuggestions: true });
            }
          }}
          onCancel={() => {
            setShowSuggestions(false);
            setPendingQuery(null);
            setLoading(false);

            // Track suggestion rejected - user cancelled
            const analytics = getAnalytics();
            analytics.track(AnalyticsEvent.SEARCH_SUGGESTION_REJECTED, {
              query: pendingQuery?.text,
              reason: 'user_cancelled',
            });
          }}
        />
      )}

      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      <CalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
      />

      <InstallPrompt />

      <AnalyticsDashboard
        isOpen={isAnalyticsDashboardOpen}
        onClose={() => setIsAnalyticsDashboardOpen(false)}
      />
    </div>
  );
};

export default App;
