// define mapbox access token
mapboxgl.accessToken =
  "pk.eyJ1IjoibWxub3ciLCJhIjoiY21kNmw1aTAyMDFkbTJqb3Z2dTN0YzRjMyJ9.4abRTnHdhMI-RE48dHNtYw";

// define basemap
if (window.innerWidth < 400) {
  var mapZoom = 11;
  var mapY = 37.765;
} else {
  var mapZoom = 11;
  var mapY = 37.758;
}
var map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mlnow/cmbgyvcll009801sn6ygk6kzo",
  zoom: mapZoom,
  center: [-122.438, mapY],
});

// define stuff
var mapFill = "map_fill_001";
var source = "basemap";
var selectedAreas = [];
var legendDetailsLocal = document.getElementById("legend-details-local");
var legendDetailsTotal = document.getElementById("legend-details-total");
var results = document.getElementById("results");
var areaList = document.getElementById("area-list");
var dropdown = document.getElementById("dataset-dropdown");
var pymChild = new pym.Child();

// Compare controls (NEW)
var compareDropdown = document.getElementById("compare-dropdown");
var compareLegendLabel = document.getElementById("compare-legend-label");

// compare selection state
// - "" means "Citywide" (default)
// - otherwise it will be the neighborhood name to compare to
var compareNeighborhood = "";

// default neighborhood
const DEFAULT_NEIGHBORHOOD = "Bayview Hunters Point";

// footnotes
var footnotes = {
  race:
    'Data from the <a target="_blank" href="https://data.census.gov/table/ACSDT5Y2024.B03002?q=B03002&g=050XX00US06075$1400000">2024 American Community Survey</a>. "Other" includes non-Hispanic people of more than one race as well as Native Americans, Pacific Islanders, and people of other origins.',
  age:
    'Data from the <a target="_blank" href="https://data.census.gov/table/ACSDP5Y2024.DP05?q=age&g=050XX00US06075$1400000">2024 American Community Survey</a>.',
  education:
    'Data from the <a target="_blank" href="https://data.census.gov/table/ACSDT5Y2024.B15003?q=b15003&g=050XX00US06075,06075$1400000">2024 American Community Survey</a>. Includes people 25 years and older.',
  income:
    'Data from the <a target="_blank" href="https://data.census.gov/table?q=table+B19001&g=050XX00US06075$1400000">2024 American Community Survey</a>.',
  housing_tenure:
    'Data from the <a target="_blank" href="https://data.census.gov/table?q=DP04&g=050XX00US06075$1400000">2024 American Community Survey</a>.',
  crime:
    'Data from San Francisco Police Department <a target="_blank" href="https://data.sfgov.org/Public-Safety/Police-Department-Incident-Reports-2018-to-Present/wg3w-h783">incident reports for 2024</a>. Please note that incident reports are not the same as <a href="https://www.sanfranciscopolice.org/stay-safe/crime-data/crime-dashboard">official crime statistics</a>. Incidents without geographic data are omitted.',
};

const datasetInfo = {
  race: ["Race", ""],
  sex: ["Sex", ""],
  age: ["Age", ""],
  disability: ["Disability", ""],
  education: ["Education", ""],
  income: ["Household income", ""],
  vehicles: ["Vehicle ownership", ""],
  internet: ["Internet", ""],
  housing_age: ["Housing age", ""],
  housing_tenure: ["Tenant vs. homeowner", ""],
  crime: ["Crime", "Incidents per 1,000 residents"],
};

///
/// PRIMARY FUNCTIONS
///

// main function
async function main() {
  const files = ["population", "race", "age", "education", "income", "vehicles", "housing_tenure", "crime"];
  const datasets = await fetchData(files);
  const populationData = await fetchPopulation();
  const lookup = await fetchCSV("lookup");

  const total_population = Object.values(populationData["value"]).reduce(
    (acc, value) => acc + parseInt(value, 10),
    0
  );

  legendDetailsTotal.innerHTML = numberWithCommas(total_population);

  // Setup compare dropdown (NEW)
  setupCompareDropdown(lookup);

  map.on("click", mapFill, (e) => {
    hoveredId = e.features[0].properties.name;
    onMapClick(datasets, populationData, hoveredId, lookup);
  });

  dropdown.addEventListener("change", function () {
    onDropdownSelect(datasets, populationData, lookup, this.value);
  });

  // SET DEFAULT ON LOAD
  dropdown.value = DEFAULT_NEIGHBORHOOD;
  onDropdownSelect(datasets, populationData, lookup, DEFAULT_NEIGHBORHOOD);
}

// Compare dropdown wiring (NEW)
function setupCompareDropdown(lookup) {
  if (!compareDropdown) return;

  // Build list of neighborhoods from the main dropdown options to match exactly
  const opts = Array.from(dropdown.options)
    .map((o) => o.value)
    .filter((v) => v && v !== "custom");

  // Default: Citywide
  compareDropdown.innerHTML = "";
  const base = document.createElement("option");
  base.value = "";
  base.textContent = "Citywide";
  compareDropdown.appendChild(base);

  // Add neighborhoods
  opts.forEach((name) => {
    const o = document.createElement("option");
    o.value = name;
    o.textContent = name;
    compareDropdown.appendChild(o);
  });

  compareDropdown.value = "";
  compareNeighborhood = "";

  // Legend label default
  if (compareLegendLabel) compareLegendLabel.textContent = "Citywide data";

  compareDropdown.addEventListener("change", function () {
    compareNeighborhood = this.value || "";
    if (compareLegendLabel) {
      compareLegendLabel.textContent = compareNeighborhood
        ? `Compare: ${compareNeighborhood}`
        : "Citywide data";
    }

    // Regenerate (uses current selectedAreas)
    // We don’t need lookup here; generateChart will compute compare tracts when needed
    // But generate() needs lookup to resolve compare tracts, so we’ll store it globally via window.
    if (window.__lookup) {
      generate(window.__datasets, window.__populationData, selectedAreas, window.__lookup);
      pymChild.sendHeight();
    }
  });
}

function refreshCompareDropdown(lookup, selectedNeighborhood) {
  if (!compareDropdown) return;

  const allOptions = Array.from(dropdown.options)
    .map(o => o.value)
    .filter(v => v && v !== "custom");

  compareDropdown.innerHTML = "";

  // Always include Citywide
  const citywideOption = document.createElement("option");
  citywideOption.value = "";
  citywideOption.textContent = "Citywide";
  compareDropdown.appendChild(citywideOption);

  // Add all neighborhoods EXCEPT the selected one
  allOptions.forEach(name => {
    if (name !== selectedNeighborhood) {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      compareDropdown.appendChild(opt);
    }
  });

  // If compare selection matches selectedNeighborhood, reset to Citywide
  if (compareNeighborhood === selectedNeighborhood) {
    compareNeighborhood = "";
    compareDropdown.value = "";
    if (compareLegendLabel) {
      compareLegendLabel.textContent = "Citywide data";
    }
  }
}

// when map is clicked
function onMapClick(datasets, populationData, hoveredId, lookup) {
  if (selectedAreas.includes(hoveredId)) {
    removeItem(selectedAreas, hoveredId);
    changeMapSelection([hoveredId], false);
  } else {
    selectedAreas.push(hoveredId);
    changeMapSelection([hoveredId], true);
  }

  generate(datasets, populationData, selectedAreas, lookup);
  pymChild.sendHeight();
}

// when dropdown is clicked
function onDropdownSelect(datasets, populationData, lookup, value) {
  selectedAreas = lookup
    .filter(function (el) {
      return el.neighborhood == value;
    })
    .map(function (el) {
      return el.tract; // census tract names
    });

      refreshCompareDropdown(lookup, value);

  var allAreas = lookup
    .map(function (el) {
      return el.tract;
    })
    .slice(1);

  changeMapSelection(allAreas, false);

  if (value == "custom") {
    clear();
  } else {
    changeMapSelection(selectedAreas, true);
  }

  generate(datasets, populationData, selectedAreas, lookup);
  pymChild.sendHeight();
}

// function to change map selection
function changeMapSelection(areas, bool) {
  areas.forEach(function (area) {
    if (area == undefined) return;
    map.setFeatureState({ source: source, id: area }, { selected: bool });
  });
}

function generate(datasets, populationData, selectedAreas, lookup) {
  // stash for compare dropdown regeneration
  window.__datasets = datasets;
  window.__populationData = populationData;
  window.__lookup = lookup;

  results.innerHTML = ""; // clear results

  if (selectedAreas.length == 0) {
    areaList.innerHTML = "<span class='area'>No area selected</span>";
    results.innerHTML = "";
    legendDetailsLocal.innerHTML = "0";
    dropdown.value = "custom";
    return;
  }

  areaList.innerHTML = "<button id='clear-button'>Clear selection</button>";

  // local population
  const local_population = selectedAreas.reduce((acc, area) => {
    return acc + parseInt(populationData["value"][area] || 0, 10);
  }, 0);

  legendDetailsLocal.innerHTML = numberWithCommas(local_population);

  var clearButton = document.getElementById("clear-button");
  clearButton.addEventListener("click", clear);

  // Process each dataset
  Object.keys(datasetInfo).forEach((datasetKey) => {
    if (datasets[datasetKey]) {
      generateChart(datasetKey, datasets[datasetKey], selectedAreas, populationData, lookup);
    }
  });

  addExpandCollapseListeners();
}

function generateChart(datasetKey, data, selectedAreas, populationData, lookup) {
  const [title, subtitle] = datasetInfo[datasetKey];
  const columns = Object.keys(data);

  // Remove total/population column (usually last)
  const dataColumns = columns.slice(0, -1);

  // Local sums
  const localSums = dataColumns.map((column) =>
    selectedAreas.reduce((sum, area) => sum + (data[column][area] || 0), 0)
  );

  // Comparison target (NEW)
  // If compareNeighborhood is "", we compare to CITYWIDE (original behavior)
  // Else, compare to that neighborhood’s tracts (not citywide)
  let compareAreas = null;
  if (compareNeighborhood) {
    compareAreas = lookup
      .filter((el) => el.neighborhood == compareNeighborhood)
      .map((el) => el.tract);
  }

  // Compare sums
  let compareSums = null;

  if (compareNeighborhood) {
    compareSums = dataColumns.map((column) =>
      compareAreas.reduce((sum, area) => sum + (data[column][area] || 0), 0)
    );
  } else {
    // Citywide (original)
    compareSums = dataColumns.map((column) =>
      Object.values(data[column]).reduce((sum, value) => sum + value, 0)
    );
  }

  // Rates
  let localRates, compareRates;

  if (datasetKey === "crime") {
    const localPopulation = selectedAreas.reduce(
      (sum, area) => sum + parseInt(populationData["value"][area] || 0, 10),
      0
    );

    let comparePopulation;
    if (compareNeighborhood) {
      comparePopulation = compareAreas.reduce(
        (sum, area) => sum + parseInt(populationData["value"][area] || 0, 10),
        0
      );
    } else {
      comparePopulation = Object.values(populationData["value"]).reduce(
        (sum, value) => sum + parseInt(value, 10),
        0
      );
    }

    localRates = localSums.map((sum) => (localPopulation ? (sum / localPopulation) * 1000 : 0));
    compareRates = compareSums.map((sum) => (comparePopulation ? (sum / comparePopulation) * 1000 : 0));
  } else {
    const totalLocal = localSums.reduce((sum, val) => sum + val, 0);
    const totalCompare = compareSums.reduce((sum, val) => sum + val, 0);

    localRates = localSums.map((sum) => (totalLocal ? (sum / totalLocal) * 100 : 0));
    compareRates = compareSums.map((sum) => (totalCompare ? (sum / totalCompare) * 100 : 0));
  }

  // HTML
  let chartHTML = `
    <h5 class='chart-heading' id='heading-${datasetKey}'>
      ${title}
      <span class='expand-collapse-indicator'>+</span>
    </h5>
    <div class='chart' id='chart-${datasetKey}' style="display: none;">
      ${subtitle ? `<p><em>${subtitle}</em></p>` : ""}
  `;

  dataColumns.forEach((column, i) => {
    const localValue =
      datasetKey === "crime" ? localRates[i].toFixed(1) : localRates[i].toFixed(1) + "%";
    const compareValue =
      datasetKey === "crime" ? compareRates[i].toFixed(1) : compareRates[i].toFixed(1) + "%";

    chartHTML += `
      <div class="glass">
        <p class="bar-label">${toTitleCase(column)}</p>
        <div class="progress-container">
          <!-- GREY = comparison target (citywide by default, or chosen neighborhood) -->
          <div class="progress-citywide" style="width: ${Math.min(compareRates[i], 100)}%"></div>

          <!-- PINK = local -->
          <div class="progress-local" style="width: ${Math.min(localRates[i], 100)}%"></div>

          <!-- show compare value as the grey label pill (original placement) -->
          <span class="progress-percentage overall-highlight"
                style="left: calc(${Math.min(compareRates[i], 90)}% + 6px)">${compareValue}</span>
        </div>

        <!-- local label stays as before -->
        <div class="mark-text local-highlight" style="left: calc(${Math.min(localRates[i], 90)}% + 2px)">${localValue}</div>
      </div>
    `;
  });

  chartHTML += `
      <p class='footnote'>${footnotes[datasetKey] || ""}</p>
    </div>
    <hr>
  `;

  results.innerHTML += chartHTML;
}

// Accordion: only one open at a time
function addExpandCollapseListeners() {
  const headings = document.querySelectorAll(".chart-heading");

  headings.forEach((heading) => {
    heading.addEventListener("click", function () {
      const chartId = this.id.replace("heading-", "");
      const chartDiv = document.getElementById("chart-" + chartId);
      const indicator = this.querySelector(".expand-collapse-indicator");

      const isOpening = chartDiv.style.display === "none" || chartDiv.style.display === "";

      document.querySelectorAll(".chart").forEach((div) => (div.style.display = "none"));
      document
        .querySelectorAll(".expand-collapse-indicator")
        .forEach((ind) => (ind.textContent = "+"));

      if (isOpening) {
        chartDiv.style.display = "block";
        indicator.textContent = "-";
      }

      if (typeof pymChild !== "undefined") {
        pymChild.sendHeight();
      }
    });
  });
}

// clear everything
function clear() {
  selectedAreas.forEach(function (area) {
    changeMapSelection([area], false);
  });
  selectedAreas = [];

  areaList.innerHTML = "<span class='area'>No area selected</span>";
  results.innerHTML = "";
  legendDetailsLocal.innerHTML = "0";

  dropdown.value = "custom";

  // ✅ NEW: also reset the grey chip + compare state
  compareNeighborhood = "";
  if (compareDropdown) compareDropdown.value = "";
  if (compareLegendLabel) compareLegendLabel.textContent = "Citywide data";

  delay(250).then(() => pymChild.sendHeight());
}

///
/// DATA FUNCTIONS
///

async function fetchPopulation() {
  var response = await fetch("data/population.json?nocache=" + new Date().getTime());
  var populationData = await response.json();
  return populationData;
}

async function fetchData(files) {
  let datasets = {};
  for (let i = 0; i < files.length; i++) {
    try {
      var response = await fetch("data/" + files[i] + ".json?nocache=" + new Date().getTime());
      var data = await response.json();
      datasets[files[i]] = data;
    } catch (error) {
      console.error(`Error loading ${files[i]}:`, error);
    }
  }
  return datasets;
}

async function fetchCSV(file) {
  var response = await fetch("data/" + file + ".csv?nocache=" + new Date().getTime());
  var lookup = await response.text();
  lookup = lookup.split("\n").map((row) => row.split(","));
  lookup = lookup.map((row) => {
    let obj = {};
    for (let i = 0; i < row.length; i++) {
      obj[lookup[0][i]] = row[i];
    }
    return obj;
  });
  return lookup;
}

///
/// MAPBOX
///

function mapFillFunction(mapID, visibility, source) {
  return {
    id: mapID,
    type: "fill",
    source: source,
    layout: { visibility: visibility },
    paint: {
      "fill-color": ["case", ["boolean", ["feature-state", "selected"], false], "#f220de", "transparent"],
      "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.85, 0.65],
    },
  };
}

function mapOutlineFunction(mapID, visibility, source) {
  return {
    id: mapID,
    type: "line",
    source: source,
    layout: { visibility: visibility },
    paint: {
      "line-color": "#f220de",
      "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 2, 0],
    },
  };
}

///
/// HELPERS
///

function removeSpaces(inputString) {
  return inputString.replace(/\s/g, "");
}

function delay(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

function numberWithCommas(x) {
  if (isFinite(x)) {
    x = x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return x;
  } else {
    return "0";
  }
}

function removeItem(arr, value) {
  var i = 0;
  while (i < arr.length) {
    if (arr[i] === value) arr.splice(i, 1);
    else ++i;
  }
  return arr;
}

function toTitleCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

///
/// LOAD MAP DATA
///

map.on("load", function () {
  mapLayers = ["basemap"];
  for (var i = 0; i < mapLayers.length; i++) {
    map.addSource(mapLayers[i], {
      type: "geojson",
      data: "data/" + mapLayers[i] + ".geojson?nocache=" + new Date().getTime(),
      promoteId: "name",
    });
  }
  const mapFillDetails = mapFillFunction("map_fill_001", "visible", "basemap");
  map.addLayer(mapFillDetails, "water-point-label");
  const mapOutlineDetails = mapOutlineFunction("map_outline_001", "visible", "basemap");
  map.addLayer(mapOutlineDetails, "water-point-label");
});

map.on("mouseenter", mapFill, function () {
  map.getCanvas().style.cursor = "pointer";
});
map.on("mouseleave", mapFill, function () {
  map.getCanvas().style.cursor = "";
});
let hoveredId = null;

map.on("mousemove", mapFill, (e) => {
  if (e.features.length > 0) {
    if (hoveredId !== null) {
      map.setFeatureState({ source: source, id: hoveredId }, { hover: false });
    }
    hoveredId = e.features[0].properties.name;
    map.setFeatureState({ source: source, id: hoveredId }, { hover: true });
  }
});

map.on("mouseleave", mapFill, () => {
  if (hoveredId !== null) {
    map.setFeatureState({ source: source, id: hoveredId }, { hover: false });
  }
  hoveredId = null;
});

// add navigation
map.addControl(new mapboxgl.NavigationControl());

// fit map to container
this.map.once("load", () => {
  this.map.resize();
});

// start
main();