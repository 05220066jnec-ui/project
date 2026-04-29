// 1. Setup Map
const map = L.map('map').setView([27.5142, 90.4336], 8);

// 2. Base Maps
const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}');

// 3. Layer Groups
const pm25Layer = L.layerGroup().addTo(map); 
const popLayer = L.layerGroup();
const expLayer = L.layerGroup();

// --- THE FIX: Property Name for _mean ---
function getVal(props) {
    return props["_mean"] || 0; 
}

// --- UPDATED: Dynamic Pop-up Function ---
function createPopup(feature, layer, label) {
    if (feature.properties && feature.properties["_mean"]) {
        let meanVal = feature.properties["_mean"].toFixed(2);
        
        // Custom HTML for the popup to make it look professional
        let content = `
            <div style="font-family: sans-serif; padding: 5px;">
                <strong style="color: #555; font-size: 12px; text-transform: uppercase;">${label}</strong><br/>
                <span style="font-size: 18px; font-weight: bold; color: #2c3e50;">${meanVal}</span>
            </div>
        `;
        layer.bindPopup(content);
    }
}

// 4. Color Logic
function getExposureColor(d) {
    return d > 5.55 ? '#ff0000' : 
           d > 1.86 ? '#ff4d4d' : 
           d > 0.67 ? '#ff9999' : 
           d > 0.2  ? '#ffcccc' : 
                      '#00ff00'; 
}

function getPM25Color(d) {
    return d > 21.2 ? '#d73027' : 
           d > 17.0 ? '#f46d43' : 
           d > 13.9 ? '#fdae61' : 
           d > 11.8 ? '#fee08b' : 
                      '#66bd63'; 
}

// 5. Load Data
async function loadData() {
    try {
        // PM 2.5
        const resPM = await fetch('./Data/Bhutan_pm2.5.geojson');
        const dataPM = await resPM.json();
        L.geoJson(dataPM, {
            style: (f) => ({
                fillColor: getPM25Color(getVal(f.properties)),
                fillOpacity: 0.8, weight: 0.3, color: 'white'
            }),
            onEachFeature: (feature, layer) => {
                createPopup(feature, layer, "PM2.5 Concentration");
            }
        }).addTo(pm25Layer);

        // Exposure
        const resExp = await fetch('Data/Bhutan_Exposure.geojson');
        const dataExp = await resExp.json();
        L.geoJson(dataExp, {
            style: (f) => ({
                fillColor: getExposureColor(getVal(f.properties)),
                fillOpacity: 0.8, weight: 0.3, color: 'white'
            }),
            onEachFeature: (feature, layer) => {
                createPopup(feature, layer, "Exposure Risk");
            }
        }).addTo(expLayer);

        // Population
        const resPop = await fetch('./Data/Bhutan_population.geojson');
        const dataPop = await resPop.json();
        L.geoJson(dataPop, {
            style: (f) => ({
                fillColor: getExposureColor(getVal(f.properties)), 
                fillOpacity: 0.8, weight: 0.3, color: 'white'
            }),
            onEachFeature: (feature, layer) => {
                createPopup(feature, layer, "Population Density");
            }
        }).addTo(popLayer);

        console.log("Success! Custom popups enabled for all layers.");
    } catch (err) {
        console.error("Error loading files:", err);
    }
}

// 6. Legend Logic
const legend = L.control({ position: 'bottomright' });
function updateLegend(type) {
    legend.onAdd = function() {
        let div = L.DomUtil.create('div', 'info legend');
        let grades, colors, title;

        if (type === 'pm25') {
            title = "PM2.5 Concentration";
            grades = [8.3, 11.8, 13.9, 17.0, 21.2];
            colors = ['#66bd63', '#fee08b', '#fdae61', '#f46d43', '#d73027'];
        } else {
            title = type === 'exposure' ? "Exposure Index" : "Population Index";
            grades = [0, 0.2, 0.67, 1.86, 5.55];
            colors = ['#00ff00', '#ffcccc', '#ff9999', '#ff4d4d', '#ff0000'];
        }

        div.innerHTML = `<h4>${title}</h4>`;
        for (let i = 0; i < grades.length; i++) {
            div.innerHTML += `<i style="background: ${colors[i]}"></i> ${grades[i]}${grades[i+1] ? '&ndash;' + grades[i+1] : '+'}<br>`;
        }
        return div;
    };
    legend.addTo(map);
}

// Control behavior
map.on('overlayadd', e => {
    map.removeControl(legend);
    if (e.name === "PM 2.5") updateLegend('pm25');
    else if (e.name === "Exposure") updateLegend('exposure');
    else updateLegend('pop');
});

const baseMaps = { "Street": osm, "Satellite": satellite };
const overlays = { "PM 2.5": pm25Layer, "Population": popLayer, "Exposure": expLayer };
L.control.layers(baseMaps, overlays, { collapsed: false }).addTo(map);

loadData();
updateLegend('pm25');

// --- GIS PLUGINS ---

// 1. Mouse Coordinates
L.control.coordinates({
    position: "bottomleft",
    decimals: 4,
    labelTemplateLat: "Lat: {y}",
    labelTemplateLng: "Lng: {x}",
    useDMS: false
}).addTo(map);

// 2. Measurement Tool
const measureControl = new L.Control.Measure({
    position: 'topright',
    primaryLengthUnit: 'kilometers',
    primaryAreaUnit: 'sqmeters',
    activeColor: '#db4a44',
    completedColor: '#8b2d2a'
});
measureControl.addTo(map);

// 3. Search Bar
L.Control.geocoder().addTo(map);

// 4. Distance Scale
L.control.scale({
    metric: true,
    imperial: false,
    position: 'bottomleft'
}).addTo(map);