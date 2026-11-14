export const REGIONS = [
  {
    id: 'punjab-india',
    name: 'Punjab Agricultural Basin',
    country: 'India',
    lat: 31.1471,
    lng: 75.3412,
    riskCategory: 'Low Soil Moisture',
    riskLevel: 'High',
    color: '#E5484D', // Red accent per Task 2
    description: 'Critical groundwater depletion and low root-zone soil moisture impacting winter wheat sowing.',
    indicators: {
      soilMoisture: '18% (Severe Deficit)',
      ndvi: '0.42 (Moderate Stress)',
      rainfall: '12mm (Below Average)',
      temperature: '34°C (+2.4°C anomaly)',
      observationDate: '2026-11-10',
      dataSource: 'NASA SMAP / MODIS NDVI'
    },
    historicalData: [
      { month: 'Jun', moisture: 35, ndvi: 0.6 },
      { month: 'Jul', moisture: 48, ndvi: 0.75 },
      { month: 'Aug', moisture: 42, ndvi: 0.7 },
      { month: 'Sep', moisture: 30, ndvi: 0.58 },
      { month: 'Oct', moisture: 22, ndvi: 0.48 },
      { month: 'Nov', moisture: 18, ndvi: 0.42 }
    ]
  },
  {
    id: 'california-usa',
    name: 'Central Valley, California',
    country: 'United States',
    lat: 36.7783,
    lng: -119.4179,
    riskCategory: 'High Temperature Stress',
    riskLevel: 'Critical',
    color: '#E5484D', // Red accent per Task 2
    description: 'Prolonged heatwave causing thermal stress in perennial orchards and vineyards.',
    indicators: {
      soilMoisture: '14% (Critical)',
      ndvi: '0.35 (Stressed)',
      rainfall: '2mm (Drought)',
      temperature: '39°C (+4.1°C anomaly)',
      observationDate: '2026-11-10',
      dataSource: 'NASA ECOSTRESS / Landsat 9'
    },
    historicalData: [
      { month: 'Jun', moisture: 28, ndvi: 0.55 },
      { month: 'Jul', moisture: 20, ndvi: 0.45 },
      { month: 'Aug', moisture: 16, ndvi: 0.38 },
      { month: 'Sep', moisture: 15, ndvi: 0.36 },
      { month: 'Oct', moisture: 14, ndvi: 0.35 },
      { month: 'Nov', moisture: 14, ndvi: 0.35 }
    ]
  },
  {
    id: 'sahel-mali',
    name: 'Mali Agricultural Zone',
    country: 'Mali',
    lat: 17.5707,
    lng: -3.9962,
    riskCategory: 'Vegetation Stress',
    riskLevel: 'High',
    color: '#E5484D', // Red accent per Task 2
    description: 'Erratic monsoon rainfall followed by rapid drying affecting staple cereal crops.',
    indicators: {
      soilMoisture: '12% (Very Low)',
      ndvi: '0.28 (Sparse)',
      rainfall: '45mm (Erratic)',
      temperature: '38°C (+1.8°C anomaly)',
      observationDate: '2026-11-09',
      dataSource: 'NASA GPM / MODIS'
    },
    historicalData: [
      { month: 'Jun', moisture: 15, ndvi: 0.3 },
      { month: 'Jul', moisture: 45, ndvi: 0.65 },
      { month: 'Aug', moisture: 55, ndvi: 0.72 },
      { month: 'Sep', moisture: 35, ndvi: 0.5 },
      { month: 'Oct', moisture: 20, ndvi: 0.38 },
      { month: 'Nov', moisture: 12, ndvi: 0.28 }
    ]
  },
  {
    id: 'cerrado-brazil',
    name: 'Cerrado Agricultural Region',
    country: 'Brazil',
    lat: -15.8267,
    lng: -47.9218,
    riskCategory: 'Unusual Rainfall Patterns',
    riskLevel: 'Moderate',
    color: '#D99A32', // Amber per Task 2
    description: 'Delayed rainy season start threatening early soybean planting schedules.',
    indicators: {
      soilMoisture: '24% (Moderate)',
      ndvi: '0.51 (Normalizing)',
      rainfall: '30mm (Delayed Onset)',
      temperature: '31°C (+0.9°C anomaly)',
      observationDate: '2026-11-10',
      dataSource: 'NASA GPM IMERG'
    },
    historicalData: [
      { month: 'Jun', moisture: 40, ndvi: 0.62 },
      { month: 'Jul', moisture: 35, ndvi: 0.58 },
      { month: 'Aug', moisture: 30, ndvi: 0.55 },
      { month: 'Sep', moisture: 26, ndvi: 0.53 },
      { month: 'Oct', moisture: 22, ndvi: 0.50 },
      { month: 'Nov', moisture: 24, ndvi: 0.51 }
    ]
  },
  {
    id: 'great-plains-usa',
    name: 'Great Plains Winter Wheat Belt',
    country: 'United States',
    lat: 38.5739,
    lng: -99.4617,
    riskCategory: 'Optimal Moisture Conditions',
    riskLevel: 'Low',
    color: '#4D9B75', // Muted green per Task 2
    description: 'Favorable precipitation and healthy vegetative indices supporting robust crop growth.',
    indicators: {
      soilMoisture: '54% (Optimal)',
      ndvi: '0.78 (Vigorous)',
      rainfall: '68mm (Normal)',
      temperature: '22°C (+0.2°C anomaly)',
      observationDate: '2026-11-10',
      dataSource: 'NASA SMAP / Landsat 9'
    },
    historicalData: [
      { month: 'Jun', moisture: 45, ndvi: 0.65 },
      { month: 'Jul', moisture: 50, ndvi: 0.70 },
      { month: 'Aug', moisture: 52, ndvi: 0.72 },
      { month: 'Sep', moisture: 48, ndvi: 0.68 },
      { month: 'Oct', moisture: 52, ndvi: 0.75 },
      { month: 'Nov', moisture: 54, ndvi: 0.78 }
    ]
  },
  {
    id: 'ukraine-basket',
    name: 'Ukrainian Chernozem Belt',
    country: 'Ukraine',
    lat: 48.3794,
    lng: 31.1656,
    riskCategory: 'Moderate Soil Moisture',
    riskLevel: 'Moderate',
    color: '#D99A32', // Amber per Task 2
    description: 'Post-harvest soil preparation proceeding under seasonal moisture constraints.',
    indicators: {
      soilMoisture: '32% (Adequate)',
      ndvi: '0.61 (Stable)',
      rainfall: '38mm (Seasonal Mean)',
      temperature: '18°C (+0.5°C anomaly)',
      observationDate: '2026-11-10',
      dataSource: 'NASA SMAP / MODIS'
    },
    historicalData: [
      { month: 'Jun', moisture: 42, ndvi: 0.78 },
      { month: 'Jul', moisture: 38, ndvi: 0.72 },
      { month: 'Aug', moisture: 30, ndvi: 0.65 },
      { month: 'Sep', moisture: 28, ndvi: 0.60 },
      { month: 'Oct', moisture: 30, ndvi: 0.60 },
      { month: 'Nov', moisture: 32, ndvi: 0.61 }
    ]
  }
];

// Helper utility for risk severity mapping per Task 2
export function getSeverityColor(riskLevel) {
  switch ((riskLevel || '').toLowerCase()) {
    case 'critical':
    case 'high':
      return '#E5484D';
    case 'moderate':
      return '#D99A32';
    case 'low':
    default:
      return '#4D9B75';
  }
}
