import { useState } from 'react';
import { ArrowLeft, BookOpen, Layers, CheckCircle2, ExternalLink } from 'lucide-react';
import './DataSourcesPage.css';

export default function DataSourcesPage({ onBack }) {
  return (
    <div className="ds-overlay">
      {/* Header */}
      <header className="ds-header">
        <div className="ds-title-group">
          <button className="ds-back-btn" onClick={onBack}>
            <ArrowLeft size={18} /> Return to Globe
          </button>
          <div>
            <h1 className="bhoomi-page-title">Data Sources & Methods</h1>
            <span className="ds-subtitle">
              Where the data comes from, what is connected, and how calculations work
            </span>
          </div>
        </div>
      </header>

      {/* Content Body */}
      <div className="ds-content-body">
        <div className="ds-card">
          <h3><BookOpen size={20} /> Data Sources & Connection Status</h3>
          <p>
            BHOOMI combines Earth data with farming experiments. This table shows the data sources and example calculations used.
          </p>

          <div className="ds-table-wrapper">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Data / Calculation</th>
                  <th>Provided By</th>
                  <th>Connection Status</th>
                  <th>Area Covered / Update Interval</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>NASA POWER API</strong></td>
                  <td>NASA Langley Research Center</td>
                  <td><span className="ds-badge live">Connected</span></td>
                  <td>0.5° × 0.5° map areas / Daily farming-related weather data</td>
                </tr>
                <tr>
                  <td><strong>SMAP L4 Surface Soil Moisture</strong></td>
                  <td>NASA / JPL / GSFC (GIBS WMTS)</td>
                  <td><span className="ds-badge live">Connected</span></td>
                  <td>9 km grid / 3-hour composite tiles</td>
                </tr>
                <tr>
                  <td><strong>IMERG Precipitation Rate</strong></td>
                  <td>NASA Global Precipitation Measurement</td>
                  <td><span className="ds-badge live">Connected</span></td>
                  <td>0.1° x 0.1° / Half-hourly rate</td>
                </tr>
                <tr>
                  <td><strong>MODIS Vegetation NDVI</strong></td>
                  <td>NASA EOSDIS / LP DAAC</td>
                  <td><span className="ds-badge pending">Example / Not Connected</span></td>
                  <td>250m / 16-day composite</td>
                </tr>
                <tr>
                  <td><strong>BHOOMI Simulation Engine</strong></td>
                  <td>BHOOMI Hackathon Team</td>
                  <td><span className="ds-badge heuristic">Example Calculation</span></td>
                  <td>Example comparisons and water-use calculations</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="ds-card">
          <h3>Measured Data, Your Settings & Example Results</h3>
          <p>
            BHOOMI keeps these three kinds of information separate:
          </p>
          <ul className="ds-list">
            <li><strong>Measured Data:</strong> Measurements from NASA POWER and map images from NASA GIBS, with dates and available-data information.</li>
            <li><strong>Your Settings:</strong> Values you choose in the simulator, such as rainfall, drought level, crop variety, and watering method. These are kept separate from measured data.</li>
            <li><strong>Example Results:</strong> Example estimates of water savings, soil moisture, and crop harvest, calculated using simplified rules.</li>
          </ul>
        </div>

        <div className="ds-card">
          <h3>Calculation Limits & Data Delays</h3>
          <p>
            Earth data can arrive after the measurement date. NASA POWER describes surrounding map areas, not individual fields. Check farming advice with local agricultural experts.
          </p>
          <div className="ds-links-row">
            <a href="https://power.larc.nasa.gov/" target="_blank" rel="noreferrer" className="ds-link-pill">
              NASA POWER Portal <ExternalLink size={14} />
            </a>
            <a href="https://earthdata.nasa.gov/" target="_blank" rel="noreferrer" className="ds-link-pill">
              NASA Earthdata <ExternalLink size={14} />
            </a>
            <a href="https://smap.jpl.nasa.gov/" target="_blank" rel="noreferrer" className="ds-link-pill">
              NASA SMAP Mission <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
