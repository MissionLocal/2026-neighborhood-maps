// define mapbox access token
mapboxgl.accessToken = "pk.eyJ1IjoibWxub3ciLCJhIjoiY21kNmw1aTAyMDFkbTJqb3Z2dTN0YzRjMyJ9.4abRTnHdhMI-RE48dHNtYw";

// define basemap
if (window.innerWidth < 400) {
    var mapZoom = 11;
    var mapY = 37.765;
} else {
    var mapZoom = 11;
    var mapY = 37.758;
}
var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mlnow/cmbgyvcll009801sn6ygk6kzo',
    zoom: mapZoom,
    center: [-122.438, mapY],
});

// define stuff
var mapFill = 'map_fill_001'
var source = 'basemap'
var selectedAreas = []
var legendDetailsLocal = document.getElementById("legend-details-local")
var legendDetailsTotal = document.getElementById("legend-details-total")
var results = document.getElementById('results')
var areaList = document.getElementById('area-list')
var dropdown = document.getElementById('dataset-dropdown');
var pymChild = new pym.Child();

// add bayview

const DEFAULT_NEIGHBORHOOD = 'Bayview Hunters Point';


// Census data structure instead of election data
var footnotes = {
    'race': 'Data from the <a target="_blank" href="https://data.census.gov/table/ACSDT5Y2023.B03002?q=B03002&g=050XX00US06075$1400000">2023 American Community Survey</a>. "Other" includes non-Hispanic people of more than one race as well as Native Americans, Pacific Islanders, and people of other origins.',
    'sex': 'Data from the <a target="_blank" href="https://data.census.gov/table/ACSDP5Y2023.DP05?q=sex&g=050XX00US06075$1400000">2023 American Community Survey</a>.',
    'age': 'Data from the <a target="_blank" href="https://data.census.gov/table/ACSDP5Y2023.DP05?q=age&g=050XX00US06075$1400000">2023 American Community Survey</a>.',
    'disability': 'Data from the <a target="_blank" href="https://data.census.gov/table/ACSDT5Y2023.B18101?q=disability&g=050XX00US06075$1400000">2023 American Community Survey</a>.',
    'education': 'Data from the <a target="_blank" href="https://data.census.gov/table/ACSDT5Y2023.B15003?q=b15003&g=050XX00US06075,06075$1400000">2023 American Community Survey</a>. Includes people 25 years and older.',
    'income': 'Data from the <a target="_blank" href="https://data.census.gov/table?q=income&g=050XX00US06075$1400000">2023 American Community Survey</a>.',
    'vehicles': 'Data from the <a target="_blank" href="https://data.census.gov/table/ACSDT5Y2023.B25044?q=B25044&g=050XX00US06075$1400000&tp=true&tid=ACSDT5Y2021.B25044">2023 American Community Survey</a>.',
    'internet': 'Data from the <a target="_blank" href="https://data.census.gov/table?q=B28011:+Internet+Subscriptions+in+Household&g=050XX00US06075$1400000">2023 American Community Survey</a>.',
    'housing_age': 'Data from the <a target="_blank" href="https://data.census.gov/table?q=DP04&g=050XX00US06075$1400000">2023 American Community Survey</a>.',
    'housing_tenure': 'Data from the <a target="_blank" href="https://data.census.gov/table?q=DP04&g=050XX00US06075$1400000">2023 American Community Survey</a>.',
    'crime': 'Data from San Francisco Police Department <a target="_blank" href="https://data.sfgov.org/Public-Safety/Police-Department-Incident-Reports-2018-to-Present/wg3w-h783">incident reports for 2024</a>. Please note that incident reports are not the same as <a href="https://www.sanfranciscopolice.org/stay-safe/crime-data/crime-dashboard">official crime statistics</a>. Incidents without geographic data are omitted.'
}

const datasetInfo = {
    'race': ['Race', ''],
    'sex': ['Sex', ''],
    'age': ['Age', ''],
    'disability': ['Disability', ''],
    'education': ['Education', ''],
    'income': ['Household income', ''],
    'vehicles': ['Vehicle ownership', ''],
    'internet': ['Internet', ''],
    'housing_age': ['Housing age', ''],
    'housing_tenure': ['Housing tenure', ''],
    'crime': ['Crime', 'Incidents per 1,000 residents']
};

///
/// PRIMARY FUNCTIONS
///

// main function
async function main() {
    const files = ['race','age','education','income','vehicles','housing_tenure','crime'];
    const datasets = await fetchData(files);
    const populationData = await fetchPopulation();
    const lookup = await fetchCSV('lookup');

    const total_population = Object.values(populationData['value'])
        .reduce((acc, value) => acc + parseInt(value, 10), 0);

    legendDetailsTotal.innerHTML = numberWithCommas(total_population);

    map.on('click', mapFill, (e) => {
        hoveredId = e.features[0].properties.name;
        onMapClick(datasets, populationData, hoveredId);
    });

    dropdown.addEventListener('change', function () {
        onDropdownSelect(datasets, populationData, lookup, this.value);
    });

    // SET DEFAULT ON LOAD
    dropdown.value = DEFAULT_NEIGHBORHOOD;
    onDropdownSelect(datasets, populationData, lookup, DEFAULT_NEIGHBORHOOD);
}


// when map is clicked
function onMapClick(datasets, populationData, hoveredId) {
    if (selectedAreas.includes(hoveredId)) {
        removeItem(selectedAreas, hoveredId)
        changeMapSelection([hoveredId], false);
    } else {
        selectedAreas.push(hoveredId)
        changeMapSelection([hoveredId], true);
    }

    generate(datasets, populationData, selectedAreas);
    pymChild.sendHeight();
}

// when dropdown is clicked
function onDropdownSelect(datasets, populationData, lookup, value) {
    selectedAreas = lookup.filter(function (el) {
        return el.neighborhood == value;
    }).map(function (el) {
        return el.tract; // This maps to census tract names
    });
    
    var allAreas = lookup.map(function (el) {
        return el.tract;
    }).slice(1);

    changeMapSelection(allAreas, false);
    if (value == 'custom') {
        clear();
    } else {
        changeMapSelection(selectedAreas, true);
    }

    generate(datasets, populationData, selectedAreas);
    pymChild.sendHeight();
}

// function to change map selection
function changeMapSelection(areas, bool) {
    areas.forEach(function (area) {
        if (area == undefined) {
            return
        }
        map.setFeatureState(
            { source: source, id: area },
            { selected: bool }
        );
    });
}

function generate(datasets, populationData, selectedAreas) {
    results.innerHTML = ""; // clear the results
    
    if (selectedAreas.length == 0) {
        areaList.innerHTML = "<span class='area'>No area selected</span>";
        results.innerHTML = "";
        legendDetailsLocal.innerHTML = "0";
        dropdown.value = 'custom';
        return;
    }

    let areaListHTML = "";
    areaList.innerHTML = areaListHTML + "<button id='clear-button'>Clear selection</button>";

    // Calculate local population
    const local_population = selectedAreas.reduce((acc, area) => {
        return acc + parseInt(populationData['value'][area] || 0, 10);
    }, 0);
    
    legendDetailsLocal.innerHTML = numberWithCommas(local_population);

    var clearButton = document.getElementById("clear-button");
    clearButton.addEventListener("click", clear);

    // Check minimum population requirement
    //if (local_population < 500) {
    //    results.innerHTML = "Please select areas with a combined <strong>population of more than 500</strong> to see results.";
    //    return;
    //}

    // Process each dataset
    Object.keys(datasetInfo).forEach(datasetKey => {
        if (datasets[datasetKey]) {
            generateChart(datasetKey, datasets[datasetKey], selectedAreas, populationData);
        }
    });

    // Add expand/collapse functionality
    addExpandCollapseListeners();
}

function generateChart(datasetKey, data, selectedAreas, populationData) {
    const [title, subtitle] = datasetInfo[datasetKey];
    const columns = Object.keys(data);
    
    // Remove the total/population column (usually the last one)
    const dataColumns = columns.slice(0, -1);
    
    // Calculate local and city sums
    const localSums = dataColumns.map(column => 
        selectedAreas.reduce((sum, area) => sum + (data[column][area] || 0), 0)
    );
    
    const citySums = dataColumns.map(column => 
        Object.values(data[column]).reduce((sum, value) => sum + value, 0)
    );

    // Calculate percentages or rates
    let localRates, cityRates;
    
    if (datasetKey === 'crime') {
        // Special handling for crime data - rates per 1,000 residents
        const localPopulation = selectedAreas.reduce((sum, area) => 
            sum + parseInt(populationData['value'][area] || 0, 10), 0);
        const cityPopulation = Object.values(populationData['value']).reduce((sum, value) => 
            sum + parseInt(value, 10), 0);
            
        localRates = localSums.map(sum => (sum / localPopulation) * 1000);
        cityRates = citySums.map(sum => (sum / cityPopulation) * 1000);
    } else {
        // Regular percentage calculation
        const totalLocal = localSums.reduce((sum, val) => sum + val, 0);
        const totalCity = citySums.reduce((sum, val) => sum + val, 0);
        
        localRates = localSums.map(sum => (sum / totalLocal) * 100);
        cityRates = citySums.map(sum => (sum / totalCity) * 100);
    }

    // Generate HTML
    let chartHTML = `
        <h5 class='chart-heading' id='heading-${datasetKey}'>
            ${title}
            <span class='expand-collapse-indicator'>+</span>
        </h5>
        <div class='chart' id='chart-${datasetKey}' style="display: none;">
            ${subtitle ? `<p><em>${subtitle}</em></p>` : ''}
    `;

    dataColumns.forEach((column, i) => {
        const safeId = removeSpaces(datasetKey + column);
        const localValue = datasetKey === 'crime' ? localRates[i].toFixed(1) : localRates[i].toFixed(1) + '%';
        const cityValue = datasetKey === 'crime' ? cityRates[i].toFixed(1) : cityRates[i].toFixed(1) + '%';
        
        chartHTML += `
            <div class="glass">
                <p class="bar-label">${toTitleCase(column)}</p>
                <div class="progress-container">
                    <div class="progress-citywide" style="width: ${Math.min(cityRates[i], 100)}%"></div>
                    <div class="progress-local" style="width: ${Math.min(localRates[i], 100)}%"></div>
                    <span class="progress-percentage overall-highlight" style="left: calc(${Math.min(cityRates[i], 90)}% + 6px)">${cityValue}</span>
                </div>
                <div class="mark-text local-highlight" style="left: calc(${Math.min(localRates[i], 90)}% + 2px)">${localValue}</div>
            </div>
        `;
    });

    chartHTML += `
            <p class='footnote'>${footnotes[datasetKey] || ''}</p>
        </div>
        <hr>
    `;

    results.innerHTML += chartHTML;
}

// Add expand/collapse functionality
function addExpandCollapseListeners() {
    const headings = document.querySelectorAll('.chart-heading');
    
    headings.forEach(heading => {
        heading.addEventListener('click', function() {
            const chartId = this.id.replace('heading-', '');
            const chartDiv = document.getElementById('chart-' + chartId);
            const indicator = this.querySelector('.expand-collapse-indicator');
            
            if (chartDiv.style.display === 'none' || chartDiv.style.display === '') {
                chartDiv.style.display = 'block';
                indicator.textContent = '-';
            } else {
                chartDiv.style.display = 'none';
                indicator.textContent = '+';
            }
            
            if (typeof pymChild !== 'undefined') {
                pymChild.sendHeight();
            }
        });
    });
}

// function to clear everything
function clear() {
    selectedAreas.forEach(function (area) {
        changeMapSelection([area], false)
    });
    selectedAreas = [];

    areaList.innerHTML = "<span class='area'>No area selected</span>"
    results.innerHTML = ""
    legendDetailsLocal.innerHTML = "0"

    dropdown.value = 'custom';
    delay(250).then(() => pymChild.sendHeight());
};

///
/// DATA FUNCTIONS FROM -V1 PROJECT
///

// function to fetch population info
async function fetchPopulation() {
    var response = await fetch('data/population.json?nocache=' + (new Date()).getTime());
    var populationData = await response.json();
    return populationData
}

///
/// MAPBOX FUNCTIONS
///

// function to define map fill information
function mapFillFunction(mapID, visibility, source) {
    return {
        id: mapID,
        type: "fill",
        source: source,
        layout: {
            'visibility': visibility
        },
        paint: {
            "fill-color": [
                'case',
                ['boolean', ['feature-state', 'selected'], false],
                '#f220de',
                'transparent'
            ],
            "fill-opacity": [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                0.85,
                0.65
            ],
        },
    }
}

// function to define map outline information
function mapOutlineFunction(mapID, visibility, source) {
    return {
        id: mapID,
        type: "line",
        source: source,
        layout: {
            "visibility": visibility
        },
        paint: {
            "line-color": "#f220de",
            "line-width": ['case', ['boolean', ['feature-state', 'hover'], false], 2, 0]
        },
    }
}

///
/// SECONDARY FUNCTIONS
///

// function to remove spaces
function removeSpaces(inputString) {
    return inputString.replace(/\s/g, '');
}

// delay for a bit
function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

// function to round numbers
function round(value, precision) {
    var multiplier = Math.pow(10, precision || 0);
    return Math.round(value * multiplier) / multiplier;
}

// function to return numbers with commas
function numberWithCommas(x) {
    if (isFinite(x)) {
        x = x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return x;
    }
    else {
        return '0'
    }
}

// function to remove value from an array
function removeItem(arr, value) {
    var i = 0;
    while (i < arr.length) {
        if (arr[i] === value) {
            arr.splice(i, 1);
        } else {
            ++i;
        }
    }
    return arr;
}

// function to make stuff title case
function toTitleCase(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

///
/// LOAD MAP DATA
///

// load my map layers
map.on("load", function () {
    mapLayers = ['basemap']
    for (var i = 0; i < mapLayers.length; i++) {
        map.addSource(mapLayers[i], {
            'type': 'geojson',
            'data': 'data/' + mapLayers[i] + '.geojson?nocache=' + (new Date()).getTime(),
            'promoteId': 'name'  // Changed from 'precinct' to 'name' for census tracts
        });
    }
    const mapFillDetails = mapFillFunction("map_fill_001", "visible", "basemap");
    map.addLayer(mapFillDetails, "water-point-label");
    const mapOutlineDetails = mapOutlineFunction("map_outline_001", "visible", "basemap");
    map.addLayer(mapOutlineDetails, "water-point-label");
});

// function to fetch data
async function fetchData(files) {
    let datasets = {};
    for (let i = 0; i < files.length; i++) {
        try {
            var response = await fetch('data/' + files[i] + '.json?nocache=' + (new Date()).getTime());
            var data = await response.json();
            datasets[files[i]] = data;
        } catch (error) {
            console.error(`Error loading ${files[i]}:`, error);
        }
    }
    return datasets
}

// function to fetch csv
async function fetchCSV(file) {
    var response = await fetch('data/' + file + '.csv?nocache=' + (new Date()).getTime());
    var lookup = await response.text();
    lookup = lookup.split('\n').map(row => row.split(','));
    lookup = lookup.map(row => {
        let obj = {}
        for (let i = 0; i < row.length; i++) {
            obj[lookup[0][i]] = row[i]
        }
        return obj
    });
    return lookup
}

// trigger hover effects when entering area
map.on('mouseenter', mapFill, function () { map.getCanvas().style.cursor = 'pointer'; });
map.on('mouseleave', mapFill, function () { map.getCanvas().style.cursor = ''; });
let hoveredId = null;
map.on('mousemove', mapFill, (e) => {
    if (e.features.length > 0) {
        if (hoveredId !== null) {
            map.setFeatureState(
                { source: source, id: hoveredId },
                { hover: false }
            );
        }
        hoveredId = e.features[0].properties.name; // Changed from 'precinct' to 'name'
        map.setFeatureState(
            { source: source, id: hoveredId },
            { hover: true }
        );
    }
});

// stop hover effects when leaving area
map.on('mouseleave', mapFill, () => {
    if (hoveredId !== null) {
        map.setFeatureState(
            { source: source, id: hoveredId },
            { hover: false }
        );
    }
    hoveredId = null;
});

// add navigation
map.addControl(new mapboxgl.NavigationControl());

// fit map to container
this.map.once('load', () => {
    this.map.resize();
});

// set everything off
main();