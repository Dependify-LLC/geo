import { useState, useEffect } from 'react'
import { Dashboard } from './components/Dashboard'
import { SearchForm } from './components/SearchForm'
import { ResultsTable } from './components/ResultsTable'
import { SubLocationList } from './components/SubLocationList'
import { BusinessProfile } from './components/BusinessProfile'
import { Login } from './components/Login'
import { AdminDashboard } from './components/AdminDashboard'
import { SavedLocationsList } from './components/SavedLocationsList'
import { searchApi, businessesApi } from './api/client'
import { Download, LogOut, Shield } from 'lucide-react'
type WorkflowPhase = 'input' | 'discovering' | 'sublocation_review' | 'scraping' | 'completed';

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<any>(JSON.parse(localStorage.getItem('user') || 'null'));

  const [currentSearchId, setCurrentSearchId] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [sublocations, setSublocations] = useState<any[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<any | null>(null);
  const [status, setStatus] = useState<string>('');
  const [phase, setPhase] = useState<WorkflowPhase>('input');
  const [cached, setCached] = useState<boolean>(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [preFillLocation, setPreFillLocation] = useState<string>('');

  useEffect(() => {
    if (!currentSearchId) return;

    const poll = setInterval(async () => {
      try {
        const res = await searchApi.get(currentSearchId);
        setResults(res.data.results);
        setSublocations(res.data.sublocations || []);
        setStatus(res.data.search.status);

        // Update workflow phase based on API response
        if (res.data.search.phase === 'discovering') {
          setPhase('discovering');
        } else if (res.data.search.phase === 'ready_to_scrape') {
          setPhase('sublocation_review');
          clearInterval(poll); // Stop polling until user proceeds
        } else if (res.data.search.phase === 'scraping') {
          setPhase('scraping');
        } else if (res.data.search.status === 'completed') {
          setPhase('completed');
          clearInterval(poll);
        } else if (res.data.search.status === 'failed') {
          clearInterval(poll);
        }
      } catch (e) {
        console.error(e);
      }
    }, 2000);

    return () => clearInterval(poll);
  }, [currentSearchId]);

  const handleLoginSuccess = (userData: any, authToken: string) => {
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(authToken);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setCurrentSearchId(null);
    setPhase('input');
    setShowAdmin(false);
  };

  const handleSearchStarted = (searchId: string, isCached: boolean = false) => {
    setCurrentSearchId(searchId);
    setCached(isCached);
    setPhase(isCached ? 'sublocation_review' : 'discovering');
    setResults([]);
    setSublocations([]);
    setPreFillLocation(''); // Clear pre-fill after search starts
  };

  const handleLocationSelected = (locationName: string) => {
    setPreFillLocation(locationName);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDownloadSublocations = () => {
    if (currentSearchId) {
      const url = searchApi.exportUrl(currentSearchId, 'csv');
      window.open(url, '_blank');
    }
  };

  const handleProceedToScraping = async () => {
    if (currentSearchId) {
      try {
        await searchApi.startScraping(currentSearchId);
        setPhase('scraping');
        setStatus('scraping');
      } catch (e) {
        console.error('Error starting scraping:', e);
      }
    }
  };

  const handleResearchSelected = async (businessIds: number[]) => {
    try {
      await businessesApi.enrich(businessIds);

      // Poll for updates
      const pollInterval = setInterval(() => {
        if (currentSearchId) {
          searchApi.get(currentSearchId).then(res => {
            setResults(res.data.results);
          });
        }
      }, 3000);

      // Stop polling after 1 minute
      setTimeout(() => clearInterval(pollInterval), 60000);

    } catch (e) {
      console.error('Error starting enrichment:', e);
      alert('Failed to start research. Please try again.');
    }
  };

  const handleDownloadReport = (businessId: number) => {
    window.open(`http://localhost:3000/api/businesses/${businessId}/report?format=pdf`, '_blank');
  };

  const handleExport = (format: 'json' | 'csv') => {
    if (currentSearchId) {
      window.open(searchApi.exportUrl(currentSearchId, format), '_blank');
    }
  };

  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <Dashboard>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <span className="text-gray-400">Welcome, <span className="text-white font-semibold">{user?.username}</span></span>
            {user?.role === 'admin' && (
              <button
                onClick={() => setShowAdmin(true)}
                className="flex items-center gap-1 text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded border border-purple-500/30 hover:bg-purple-500/30 transition-colors"
              >
                <Shield size={12} /> Admin Dashboard
              </button>
            )}
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <LogOut size={18} /> Sign Out
          </button>
        </div>

        {showAdmin && <AdminDashboard onClose={() => setShowAdmin(false)} />}

        <SavedLocationsList onLocationSelected={handleLocationSelected} />
        <SearchForm onSearchStarted={handleSearchStarted} preFillLocation={preFillLocation} />

        {currentSearchId && (
          <div className="space-y-6">
            {/* Phase 1: Discovering Sub-Locations */}
            {phase === 'discovering' && (
              <div className="text-center py-8">
                <div className="inline-block">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                  <h3 className="text-lg font-semibold text-white">Discovering Sub-Locations...</h3>
                  <p className="text-gray-300 mt-2">Using AI to find all neighborhoods, districts, and areas</p>
                </div>
              </div>
            )}

            {/* Phase 2: Sub-Location Review */}
            {phase === 'sublocation_review' && (
              <>
                {cached && (
                  <div className="bg-blue-500/10 border border-blue-500/30 text-blue-400 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
                    <span className="text-xl">⚡</span>
                    <div>
                      <span className="font-semibold">Smart Cache Hit!</span>
                      <p className="text-sm opacity-80">We found an existing hierarchy for this location. Sub-locations loaded instantly.</p>
                    </div>
                  </div>
                )}
                {sublocations.length > 0 && (
                  <SubLocationList
                    searchId={Number(currentSearchId)}
                    sublocations={sublocations}
                    onDownload={handleDownloadSublocations}
                    onProceed={handleProceedToScraping}
                  />
                )}
              </>
            )}

            {/* Phase 3 & 4: Scraping and Results */}
            {(phase === 'scraping' || phase === 'completed') && (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold text-white">Research Results</h2>
                    {phase === 'scraping' && (
                      <span className="px-3 py-1 text-sm bg-blue-500 text-white rounded-full animate-pulse">
                        Scraping in progress...
                      </span>
                    )}
                    {status && (
                      <span className={`px-3 py-1 text-sm rounded-full ${status === 'completed' ? 'bg-green-500 text-white' :
                        status === 'failed' ? 'bg-red-500 text-white' :
                          'bg-yellow-500 text-white'
                        }`}>
                        {status}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExport('json')}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    >
                      <Download size={16} />
                      JSON
                    </button>
                    <button
                      onClick={() => handleExport('csv')}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                    >
                      <Download size={16} />
                      CSV
                    </button>
                  </div>
                </div>

                {/* Show sublocation progress */}
                {sublocations.length > 0 && (
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="text-white font-semibold mb-3">Scraping Progress by Sub-Location</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {sublocations.map((sl: any) => (
                        <div key={sl.id} className="bg-gray-700 rounded p-3">
                          <div className="text-sm text-gray-300 truncate" title={sl.name}>{sl.name}</div>
                          <div className={`text-xs mt-1 ${sl.status === 'completed' ? 'text-green-400' :
                            sl.status === 'scraping' ? 'text-blue-400' :
                              sl.status === 'failed' ? 'text-red-400' :
                                'text-gray-400'
                            }`}>
                            {sl.status === 'completed' && `✓ ${sl.businessCount} businesses`}
                            {sl.status === 'scraping' && '⏳ Scraping...'}
                            {sl.status === 'failed' && '✗ Failed'}
                            {sl.status === 'pending' && '⋯ Pending'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedBusiness && (
                  <BusinessProfile
                    business={selectedBusiness}
                    onClose={() => setSelectedBusiness(null)}
                  />
                )}

                <ResultsTable
                  results={results}
                  onResearchSelected={handleResearchSelected}
                  onViewBusiness={setSelectedBusiness}
                  onDownloadReport={handleDownloadReport}
                />
              </>
            )}
          </div>
        )}
      </div>
    </Dashboard>
  )
}

export default App
