import { useState } from 'react';
import { Search, Globe, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import './SearchBar.css';

export default function SearchBar({ regions, onSelectRegion, selectedRegion }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const filteredRegions = regions.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.riskCategory.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {/* Floating Branding Top Left */}
      <div className="floating-brand">
        <div className="brand-logo-icon">
          <Globe size={18} />
        </div>
        <div>
          <h1 className="brand-title">BHOOMI <span className="version-tag">NASA</span></h1>
          <p className="brand-subtitle">Space Insights to Smarter Farming</p>
        </div>
      </div>

      {/* Floating Search Top Center */}
      <div className="floating-search-container">
        <div className="search-input-wrapper">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            placeholder="Search regions or risks..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
          />
        </div>

        {isOpen && filteredRegions.length > 0 && (
          <div className="search-dropdown">
            {filteredRegions.map(region => (
              <div
                key={region.id}
                className="search-item"
                onClick={() => {
                  onSelectRegion(region);
                  setSearchTerm('');
                  setIsOpen(false);
                }}
              >
                <div className="item-info">
                  <span className="item-name">{region.name}</span>
                  <span className="item-country">{region.country}</span>
                </div>
                <span className="item-risk" style={{ color: region.color }}>
                  {region.riskCategory}
                </span>
              </div>
            ))}
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
