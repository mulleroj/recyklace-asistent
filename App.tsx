
import React, { useState, useEffect, useRef } from 'react';
import { WasteCategory, WasteItem, ChatHistoryItem } from './types';
import CategoryBadge from './components/CategoryBadge';
import { WASTE_DATABASE } from './constants';
import { findLocalMatch, findSuggestions, normalizeForSearch } from './utils/fuzzySearch';
import { getAICache } from './utils/aiCache';
import { getAnalytics, AnalyticsEvent } from './utils/analytics';
import { retryApiCall } from './utils/retryLogic';
import { identifyWasteViaProxy } from './src/services/aiProxyClient';
import {
  clearLegacyAiKeys,
  dedupeUserItems,
  HISTORY_LIMIT,
  normalizeQuery,
  parseHistory,
  parseUserDatabase,
  UserWasteItem,
} from './src/utils/storage';

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
import HelpModal from './src/components/ui/HelpModal';
import RecyclingTips from './src/components/ui/RecyclingTips';
import LoadingSpinner from './src/components/ui/LoadingSpinner';
import InstallPrompt from './src/components/ui/InstallPrompt';
import UpdatePrompt from './src/components/ui/UpdatePrompt';
import CalendarModal from './src/components/schedule/CalendarModal';
import SuggestionList from './src/components/waste/SuggestionList';
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
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ name: string; category: string; note?: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [pendingQuery, setPendingQuery] = useState<{ text?: string; image?: { data: string; mimeType: string } } | null>(null);
  const [isAnalyticsDashboardOpen, setIsAnalyticsDashboardOpen] = useState(false);
  const requestRef = useRef<{ id: number; controller?: AbortController }>({ id: 0 });
  const modalTriggerRef = useRef<HTMLElement | null>(null);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(() => {
    // Show prompt if not shown before and notifications not yet enabled
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const wasShown = localStorage.getItem(NOTIFICATION_PROMPT_KEY);
      return !wasShown && Notification.permission === 'default';
    }
    return false;
  });

  // Service Worker update detection
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  // User-added database items (stored in localStorage)
  const [userDatabase, setUserDatabase] = useState<UserWasteItem[]>(() => parseUserDatabase(localStorage.getItem(USER_DATABASE_KEY)));

  useEffect(() => {
    clearLegacyAiKeys();
  }, []);

  // Save user database to localStorage
  useEffect(() => {
    localStorage.setItem(USER_DATABASE_KEY, JSON.stringify(userDatabase));
  }, [userDatabase]);

  // Merge both databases for searching
  const fullDatabase = [...WASTE_DATABASE, ...userDatabase];

  const handleAddUserItem = (item: { name: string; category: WasteCategory; note: string }) => {
    const createdAt = Date.now();
    const normalized = { ...item, id: `user-${createdAt}`, createdAt, source: 'manual' as const };
    setUserDatabase(prev => dedupeUserItems([normalized, ...prev]).slice(0, 200));

    // Track user added item
    const analytics = getAnalytics();
    analytics.track(AnalyticsEvent.USER_ADDED_ITEM, {
      itemName: item.name,
      category: item.category,
    });
  };

  const { announceResult } = useAnnounce(soundEnabled);

  const rememberModalTrigger = () => {
    modalTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  };

  const restoreModalTrigger = () => {
    const trigger = modalTriggerRef.current;
    modalTriggerRef.current = null;
    window.setTimeout(() => trigger?.focus(), 0);
  };

  const handleIdentifyResult = (res: WasteItem & { source?: 'local' | 'ai' | 'user' }, transcript?: string) => {
    setResult(res);
    announceResult(res.category);
    setHistory(prev => [{
      query: transcript || res.name,
      result: res,
      timestamp: Date.now()
    }, ...prev.slice(0, HISTORY_LIMIT - 1)]);
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

  const { isListening, error: speechError, startListening } = useSpeech((transcript) => {
    setQuery(transcript);
    handleIdentify({ text: transcript });
  });

  const {
    isCameraOpen,
    videoRef,
    canvasRef,
    error: cameraError,
    startCamera,
    stopCamera,
    capturePhoto
  } = useCamera();

  const [history, setHistory] = useState<ChatHistoryItem[]>(() => parseHistory(localStorage.getItem(STORAGE_KEY)));

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

  useEffect(() => {
    const handleUpdate = (event: Event) => {
      setWaitingWorker((event as CustomEvent<ServiceWorker>).detail);
      setShowUpdatePrompt(true);
    };
    window.addEventListener('sw-update-available', handleUpdate);
    return () => window.removeEventListener('sw-update-available', handleUpdate);
  }, []);

  const handleIdentify = async ({ text, image, skipCache = false, skipSuggestions = false }: {
    text?: string;
    image?: { data: string; mimeType: string };
    skipCache?: boolean;
    skipSuggestions?: boolean;
  }) => {
    const normalizedText = text ? normalizeQuery(text) : undefined;
    if (!normalizedText && !image) {
      setError('Zadejte nazev odpadu.');
      return;
    }

    requestRef.current.controller?.abort();
    const controller = new AbortController();
    const requestId = requestRef.current.id + 1;
    requestRef.current = { id: requestId, controller };

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const aiCache = getAICache();

      // 1. Lokální databáze (včetně uživatelské)
      if (normalizedText) {
        const localMatch = findLocalMatch(normalizedText, fullDatabase);
        if (localMatch) {
          const isUserItem = userDatabase.some(item => item.name === localMatch.name);
          handleIdentifyResult({
            id: `local-${Date.now()}`,
            ...localMatch,
            isFromDatabase: true,
            source: isUserItem ? 'user' : 'local'
          }, normalizedText);
          return;
        }
      }

      // 2. Check AI cache
      if (!skipCache) {
        if (normalizedText) {
          const cachedResult = aiCache.findByQuery(normalizedText);
          if (cachedResult) {
            handleIdentifyResult({
              id: `cache-${Date.now()}`,
              ...cachedResult,
              isFromDatabase: false,
              source: 'ai'
            }, normalizedText);
            return;
          }
        } else if (image) {
          const cachedResult = aiCache.findByImage(image.data);
          if (cachedResult) {
            handleIdentifyResult({
              id: `cache-${Date.now()}`,
              ...cachedResult,
              isFromDatabase: false,
              source: 'ai'
            }, 'Vyfocený odpad');
            return;
          }
        }
      }

      // 3. Show suggestions before calling AI (only for text queries)
      if (!skipSuggestions && normalizedText && !image) {
        const similarItems = findSuggestions(normalizedText, fullDatabase, 3);
        if (similarItems.length > 0) {
          setSuggestions(similarItems);
          setShowSuggestions(true);
          setPendingQuery({ text: normalizedText, image });
          setLoading(false);
          return;
        }
      }

      // 4. AI analýza (vyžaduje online)
      if (!isOnline) {
        const analytics = getAnalytics();
        analytics.track(AnalyticsEvent.ERROR_OFFLINE, { hasImage: !!image });
        setError(image ? 'Focení vyžaduje internet.' : 'Tuto položku nemám v databázi a jste offline.');
        setLoading(false);
        return;
      }

      const analytics = getAnalytics();
      analytics.track(AnalyticsEvent.SEARCH_AI_CALL, { hasImage: !!image });

      const aiRes = await retryApiCall(
        () => identifyWasteViaProxy({ query: normalizedText, image }, controller.signal),
        'AI waste identification'
      );
      if (requestRef.current.id !== requestId) return;

      // Uložit do AI cache
      aiCache.add({
        name: aiRes.name,
        category: aiRes.category,
        note: aiRes.note || '',
        query: normalizedText,
        imageData: image?.data,
      });

      // Automaticky uložit AI výsledek do uživatelské databáze pro budoucí vyhledávání
      const aiItem: UserWasteItem = {
        id: `ai-${Date.now()}`,
        name: aiRes.name,
        category: aiRes.category,
        note: `${aiRes.note || ''} (Navrhl AI asistent - lze upravit nebo odstranit.)`,
        source: 'ai',
        createdAt: Date.now(),
      };

      const alreadyExists = userDatabase.some(
        item => normalizeForSearch(item.name) === normalizeForSearch(aiItem.name)
      );

      if (!alreadyExists) {
        setUserDatabase(prev => dedupeUserItems([aiItem, ...prev]).slice(0, 200));
      }

      handleIdentifyResult({ ...aiRes, source: 'ai' }, normalizedText);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Nepodarilo se spojit s asistentem.');
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
        onOpenNotificationSettings={() => {
          rememberModalTrigger();
          setIsNotificationSettingsOpen(true);
        }}
        onOpenHelp={() => {
          rememberModalTrigger();
          setIsHelpOpen(true);
        }}
        onOpenApiKey={() => setError('AI asistent pouziva serverovy endpoint. API klic se v aplikaci nezadava.')}
        onOpenCalendar={() => {
          rememberModalTrigger();
          setIsCalendarOpen(true);
        }}
        onOpenAnalytics={() => {
          rememberModalTrigger();
          setIsAnalyticsDashboardOpen(true);
        }}
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
              {history.map((item) => (
                <div key={`${item.timestamp}-${item.query}`} className="relative group">
                  <button
                    onClick={() => {
                      setResult({ ...item.result, source: (item.result as any).source });
                      announceResult(item.result.category);
                    }}
                    className="w-full bg-white p-6 rounded-3xl border-4 border-white shadow-lg flex justify-between items-center active:scale-95 transition-all text-left"
                  >
                    <div className="flex flex-col">
                      <span className="text-xl font-bold text-slate-800 break-words pr-4">{item.query}</span>
                      <span className="text-xs text-slate-400 font-bold uppercase">{new Date(item.timestamp).toLocaleString('cs-CZ')}</span>
                    </div>
                    <CategoryBadge category={item.result.category} variant="minimal" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteHistoryItem(item.timestamp);
                    }}
                    className="absolute -right-2 -top-2 w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center border-2 border-white shadow-md opacity-100 transition-opacity"
                    aria-label={`Smazat ${item.query} z historie`}
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
        onClose={() => {
          setIsNotificationSettingsOpen(false);
          restoreModalTrigger();
        }}
      />

      {showSuggestions && (
        <SuggestionList
          suggestions={suggestions}
          onSelect={(suggestion) => {
            setShowSuggestions(false);
            handleIdentifyResult({
              id: `suggestion-${Date.now()}`,
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
        onClose={() => {
          setIsHelpOpen(false);
          restoreModalTrigger();
        }}
      />

      <CalendarModal
        isOpen={isCalendarOpen}
        onClose={() => {
          setIsCalendarOpen(false);
          restoreModalTrigger();
        }}
      />

      <AnalyticsDashboard
        isOpen={isAnalyticsDashboardOpen}
        onClose={() => {
          setIsAnalyticsDashboardOpen(false);
          restoreModalTrigger();
        }}
      />

      {showUpdatePrompt && (
        <UpdatePrompt
          onUpdate={() => {
            if (waitingWorker) {
              waitingWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          }}
          onDismiss={() => setShowUpdatePrompt(false)}
        />
      )}
    </div>
  );
};

export default App;
