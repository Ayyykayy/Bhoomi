import { useState, useEffect, useRef } from 'react';
import { Search, Globe, Sun, Moon, Loader2, MapPin, AlertCircle, RefreshCw } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { searchLocations } from '../../services/api';
import './SearchBar.css';

export default function SearchBar({ onSelectLocation, selectedLocation }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);
  const abortControllerRef = useRef(null);
  const dropdownRef = useRef(null);
  const { theme, toggleTheme } = useTheme();

  // Explicit Enter / Search execution with timeout, cancellation, and distinct error state
  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    const trimmed = searchTerm.trim();
    if (!trimmed || trimmed.length < 2) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);
    setIsOpen(true);
    setResults([]);

    try {
      const apiResults = await searchLocations(trimmed, abortControllerRef.current.signal);
      if (!abortControllerRef.current.signal.aborted) {
        setResults(apiResults);
        setLoading(false);
      }
    } catch (err) {
      if (err.name !== 'AbortError' && (!abortControllerRef.current || !abortControllerRef.current.signal.aborted)) {
        console.error('Search error:', err);
        setError(err.message || 'Geocoding search failed or timed out.');
        setLoading(false);
        setResults([]);
      }
    }
  };

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      {/* Floating Branding Top Left */}
      <div className="floating-brand">
        <div>
          <h1 className="brand-title" style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '0.5px', margin: 0, lineHeight: 1.2 }}>BHOOMI</h1>
          <p className="brand-subtitle" style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.2 }}>Space Insights to Smart Farming</p>
        </div>
      </div>

      {/* Floating Search Top Center with explicit form submit on Enter */}
      <div className="floating-search-container" ref={dropdownRef}>
        <form onSubmit={handleSearchSubmit} className="search-input-wrapper">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            placeholder="Search city, country, or lat, lon (Press Enter)..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
            }}
            onFocus={() => {
              if (results.length > 0 || error) setIsOpen(true);
            }}
          />
          {loading && <Loader2 size={15} className="search-spinner" />}
        </form>

        {isOpen && (results.length > 0 || loading || error || searchTerm.trim().length >= 2) && (
          <div className="search-dropdown">
            {loading ? (
              <div className="search-no-results">Searching global locations via backend geocoding proxy...</div>
            ) : error ? (
              <div className="search-no-results" style={{ color: 'var(--risk-high-text)', background: 'var(--risk-high-bg)', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <AlertCircle size={16} />
                  <span style={{ fontWeight: 600 }}>{error}</span>
                </div>
                <button
                  type="button"
                  onClick={handleSearchSubmit}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <RefreshCw size={12} /> Retry Search
                </button>
              </div>
            ) : results.length > 0 ? (
              results.map(item => (
                <div
                  key={item.id}
                  className="search-item"
                  onClick={() => {
                    onSelectLocation(item);
                    setSearchTerm('');
                    setIsOpen(false);
                  }}
                >
                  <div className="item-info">
                    <span className="item-name">
                      <MapPin size={13} style={{ display: 'inline', marginRight: '4px', color: 'var(--primary-blue)' }} />
                      {item.name}
                    </span>
                    <span className="item-country">
                      {item.country} • {item.lat >= 0 ? `${item.lat.toFixed(2)}°N` : `${Math.abs(item.lat).toFixed(2)}°S`}, {item.lng >= 0 ? `${item.lng.toFixed(2)}°E` : `${Math.abs(item.lng).toFixed(2)}°W`}
                    </span>
                  </div>
                  <span className="item-risk" style={{ color: '#3b82f6' }}>
                    NASA Data
                  </span>
                </div>
              ))
            ) : (
              <div className="search-no-results">
                No matching locations found. Try another query or coordinates (e.g. 26.71, 74.54).
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Controls Top Right with Theme Toggle */}
      <div className="floating-controls">
        <button className="theme-toggle-btn" onClick={toggleTheme} title="Toggle Light/Dark Theme">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </>
  );
}
