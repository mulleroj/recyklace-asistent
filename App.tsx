
import React, { useState, useEffect, useRef } from 'react';
import { WasteCategory, WasteItem, ChatHistoryItem } from './types';
import CategoryBadge from './components/CategoryBadge';
import { WASTE_DATABASE } from './constants';
import { findLocalMatch, findSuggestions, normalizeForSearch } from './utils/fuzzySearch';
import { getAnalytics, AnalyticsEvent } from './utils/analytics';
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
import { useAnnounce } from './src/hooks/useAnnounce';

// Components
import Header from './src/components/layout/Header';
import SearchBox from './src/components/ui/SearchBox';
import TipSection from './src/components/ui/TipSection';
import ResultCard from './src/components/waste/ResultCard';
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
  const [result, setResult] = useState<(WasteItem & { source?: 'local' | 'user' }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isNotificationSettingsOpen, setIsNotificationSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ name: string; category: string; note?: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [notFoundQuery, setNotFoundQuery] = useState<string | null>(null);
  const [isAnalyticsDashboardOpen, setIsAnalyticsDashboardOpen] = useState(false);
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

  const handleDeleteUserItem = (id: string) => {
    setUserDatabase(prev => prev.filter(item => item.id !== id));
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

  const openAddWasteModal = () => {
    rememberModalTrigger();
    setIsAddModalOpen(true);
  };

  const closeAddWasteModal = () => {
    setIsAddModalOpen(false);
    restoreModalTrigger();
  };

  const handleIdentifyResult = (res: WasteItem & { source?: 'local' | 'user' }, transcript?: string) => {
    setResult(res);
    setNotFoundQuery(null);
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
    } else if (res.source === 'user') {
      analytics.track(AnalyticsEvent.SEARCH_LOCAL_HIT, { query: transcript || res.name, userAdded: true });
    }
  };

  const [error, setError] = useState<string | null>(null);

  const { isListening, error: speechError, startListening } = useSpeech((transcript) => {
    setQuery(transcript);
    handleIdentify(transcript);
  });

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

  const handleIdentify = (text: string) => {
    const normalizedText = normalizeQuery(text);
    if (!normalizedText) {
      setError('Zadejte nazev odpadu.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setNotFoundQuery(null);
    setShowSuggestions(false);

    const localMatch = findLocalMatch(normalizedText, fullDatabase);
    if (localMatch) {
      const isUserItem = userDatabase.some(
        item => normalizeForSearch(item.name) === normalizeForSearch(localMatch.name)
      );
      handleIdentifyResult({
        id: `local-${normalizeForSearch(localMatch.name)}`,
        ...localMatch,
        isFromDatabase: true,
        source: isUserItem ? 'user' : 'local'
      }, normalizedText);
      return;
    }

    const similarItems = findSuggestions(normalizedText, fullDatabase, 3);
    if (similarItems.length > 0) {
      setSuggestions(similarItems);
      setShowSuggestions(true);
      setLoading(false);
      const analytics = getAnalytics();
      analytics.track(AnalyticsEvent.SEARCH_SUGGESTION_SHOWN, { query: normalizedText });
      return;
    }

    const analytics = getAnalytics();
    analytics.track(AnalyticsEvent.SEARCH_NOT_FOUND, { query: normalizedText });
    setNotFoundQuery(normalizedText);
    setLoading(false);
  };

  const handleAddMissingItem = () => {
    setQuery(notFoundQuery || query);
    openAddWasteModal();
  };

  const handleSuggestionCancel = () => {
    setShowSuggestions(false);
    setSuggestions([]);
    setNotFoundQuery(query.trim() ? normalizeQuery(query) : null);
    setLoading(false);

    const analytics = getAnalytics();
    analytics.track(AnalyticsEvent.SEARCH_SUGGESTION_REJECTED, {
      query: query.trim() ? normalizeQuery(query) : undefined,
      reason: 'user_cancelled',
    });
  };

  const displayedError = error || speechError;

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
            onClick={openAddWasteModal}
            className="w-full mb-6 py-4 rounded-[25px] border-4 border-dashed border-emerald-300 text-emerald-600 font-bold text-lg hover:bg-emerald-50 transition-all flex items-center justify-center gap-2"
          >
            <span className="text-2xl">+</span> Přidat vlastní odpad do databáze
          </button>
        )}

        {userDatabase.length > 0 && !result && !loading && (
          <section className="mb-6 bg-white rounded-[28px] p-5 shadow-lg border-4 border-purple-100">
            <h3 className="text-lg font-black uppercase text-purple-700 mb-4">Moje položky</h3>
            <div className="space-y-3">
              {userDatabase.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 bg-purple-50 rounded-2xl p-3">
                  <button
                    onClick={() => handleIdentifyResult({
                      id: item.id,
                      name: item.name,
                      category: item.category,
                      note: item.note,
                      isFromDatabase: true,
                      source: 'user',
                    }, item.name)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block font-bold text-slate-800 truncate">{item.name}</span>
                    <span className="text-xs font-bold text-purple-600 uppercase">Moje položka</span>
                  </button>
                  <CategoryBadge category={item.category} variant="minimal" />
                  <button
                    onClick={() => handleDeleteUserItem(item.id)}
                    className="w-9 h-9 rounded-full bg-red-100 text-red-600 font-black"
                    aria-label={`Odstranit ${item.name} z vlastních položek`}
                    title="Odstranit"
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <SearchBox
          query={query}
          setQuery={setQuery}
          onSearch={() => handleIdentify(query)}
          onVoice={startListening}
          isListening={isListening}
          loading={loading}
          error={displayedError}
        />

        {loading && <LoadingSpinner message="Analyzuji odpad..." />}

        {result && !loading && (
          <ResultCard result={result} onClose={() => setResult(null)} />
        )}

        {notFoundQuery && !result && !loading && !showSuggestions && (
          <section className="mb-10 bg-white rounded-[32px] p-8 shadow-xl border-4 border-amber-200" role="status">
            <h2 className="text-2xl font-black text-slate-900 mb-4">Tuto položku zatím v databázi nemám.</h2>
            <p className="text-slate-600 font-bold mb-3">Zkuste:</p>
            <ul className="list-disc pl-6 space-y-2 text-slate-600 font-semibold">
              <li>jiný nebo kratší název,</li>
              <li>název bez značky výrobku,</li>
              <li>vybrat některý z podobných návrhů,</li>
              <li>přidat položku do vlastní databáze.</li>
            </ul>
            <div className="grid sm:grid-cols-2 gap-3 mt-6">
              <button
                onClick={() => {
                  setNotFoundQuery(null);
                  window.setTimeout(() => document.querySelector<HTMLInputElement>('input[type="text"]')?.focus(), 0);
                }}
                className="py-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black transition-all"
              >
                Upravit hledání
              </button>
              <button
                onClick={handleAddMissingItem}
                className="py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black transition-all"
              >
                Přidat vlastní položku
              </button>
            </div>
          </section>
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

      </main>

      <AddWasteModal
        isOpen={isAddModalOpen}
        onClose={closeAddWasteModal}
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
            setSuggestions([]);
            handleIdentifyResult({
              id: `suggestion-${Date.now()}`,
              name: suggestion.name,
              category: suggestion.category as any,
              note: suggestion.note || '',
              isFromDatabase: true,
              source: 'local'
            }, query.trim() ? normalizeQuery(query) : suggestion.name);

            // Track suggestion accepted
            const analytics = getAnalytics();
            analytics.track(AnalyticsEvent.SEARCH_SUGGESTION_ACCEPTED, {
              query: query.trim() ? normalizeQuery(query) : undefined,
              selectedSuggestion: suggestion.name,
            });
          }}
          onCancel={handleSuggestionCancel}
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
