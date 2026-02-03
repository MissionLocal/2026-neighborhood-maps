// map.js – neighborhood with sales tax recovery data
document.addEventListener("DOMContentLoaded", async () => {
  const pymChild = new pym.Child();
  mapboxgl.accessToken =
    "pk.eyJ1IjoibWxub3ciLCJhIjoiY21kNmw1aTAyMDFkbTJqb3Z2dTN0YzRjMyJ9.4abRTnHdhMI-RE48dHNtYw";

  // DOM
  const infoBox = document.getElementById("info-box");
  const recoveryStatDiv = document.getElementById("recovery-stat");
  const neighborhoodLegendLine = document.getElementById(
    "neighborhood-legend-line"
  );
  const districtLegendLine = document.getElementById("district-legend-line");

  // Helper function to interpolate between two colors
  function interpolateColor(color1, color2, factor) {
    const hex1 = color1.replace("#", "");
    const hex2 = color2.replace("#", "");

    const r1 = parseInt(hex1.substring(0, 2), 16);
    const g1 = parseInt(hex1.substring(2, 4), 16);
    const b1 = parseInt(hex1.substring(4, 6), 16);

    const r2 = parseInt(hex2.substring(0, 2), 16);
    const g2 = parseInt(hex2.substring(2, 4), 16);
    const b2 = parseInt(hex2.substring(4, 6), 16);

    const r = Math.round(r1 + factor * (r2 - r1));
    const g = Math.round(g1 + factor * (g2 - g1));
    const b = Math.round(b1 + factor * (b2 - b1));

    return `#${r.toString(16).padStart(2, "0")}${g
      .toString(16)
      .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }

  // Helper to format quarter as human readable
  function formatQuarter(quarterStr) {
    // quarterStr like "2025Q3"
    const year = quarterStr.substring(0, 4);
    const quarter = quarterStr.substring(5, 7);
    return `Q${quarter.replace("Q", "")} ${year}`;
  }

  // Helper to format dollar amount
  function formatDollars(amount) {
    const millions = amount / 1000000;
    return `$${millions.toFixed(1)}M`;
  }

  // ---- Fetch both CSVs ----
  let recoveryData = null;
  let actualRevenue = null;

  try {
    // Fetch adjusted sales tax data
    const adjustedResponse = await fetch("../adjusted_sales_tax.csv");
    const adjustedText = await adjustedResponse.text();
    const adjustedRows = adjustedText.trim().split("\n");
    const adjustedHeaders = adjustedRows[0].split(",");

    // Find Bayview row in adjusted data
    const bayviewAdjustedRow = adjustedRows.find((row) =>
      row.includes("Bayview Hunters Point")
    );

    if (bayviewAdjustedRow) {
      const values = bayviewAdjustedRow.split(",");
      recoveryData = {
        recovery_pct: parseFloat(values[28]),
        latest_quarter: values[29].trim(),
        baseline_quarter: values[30].trim(),
      };
    }

    // Fetch master sales tax data for actual revenue
    const masterResponse = await fetch("../master_sales_tax.csv");
    const masterText = await masterResponse.text();
    const masterRows = masterText.trim().split("\n");
    const masterHeaders = masterRows[0].split(",");

    // Find the column name for latest quarter (e.g., "2025Q3")
    const latestQuarterCol = recoveryData.latest_quarter;
    const colIndex = masterHeaders.findIndex(
      (h) => h.trim() === latestQuarterCol
    );

    // Find Bayview row in master data
    const bayviewMasterRow = masterRows.find((row) =>
      row.includes("Bayview Hunters Point")
    );

    if (bayviewMasterRow && colIndex !== -1) {
      const values = bayviewMasterRow.split(",");
      actualRevenue = parseFloat(values[colIndex]);
    }
  } catch (error) {
    console.error("Error loading sales tax data:", error);
  }

  // ---- Determine color based on recovery ----
  let fillColor = "#dddddd";
  let outlineColor = "#dddddd";

  if (recoveryData) {
    const magenta = "#ed43e5";
    const gray = "#dddddd";
    const yellow = "#efbe25";

    const pct = recoveryData.recovery_pct;

    if (pct <= -40) {
      fillColor = magenta;
    } else if (pct >= 40) {
      fillColor = yellow;
    } else if (pct < 0) {
      const factor = (pct + 40) / 40;
      fillColor = interpolateColor(magenta, gray, factor);
    } else {
      const factor = pct / 40;
      fillColor = interpolateColor(gray, yellow, factor);
    }

    outlineColor = fillColor;

    // Update legend lines to match map color
    if (neighborhoodLegendLine) {
      neighborhoodLegendLine.style.borderTopColor = outlineColor;
    }
    if (districtLegendLine) {
      districtLegendLine.style.borderTopColor = outlineColor;
    }

    // Build info box content
    if (actualRevenue && recoveryData) {
      const revenueFormatted = formatDollars(actualRevenue);
      const quarterFormatted = formatQuarter(recoveryData.latest_quarter);
      const sign = recoveryData.recovery_pct >= 0 ? "+" : "";

      infoBox.innerHTML = `
                <div style="font-weight: 600; margin-bottom: 4px;">Bayview Hunters Point</div>
                <div style="margin-bottom: 6px;">Sales tax revenue, ${quarterFormatted}: <strong>${revenueFormatted}</strong></div>
                <div>Percent change from 2019: <strong>${sign}${recoveryData.recovery_pct.toFixed(
        0
      )}%</strong></div>
            `;
      infoBox.style.display = "block";
    }
  }

  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mlnow/cmis0bnr0000401sr9iyb6i1a",
    center: [-122.431297, 37.773972],
    zoom: 10.5,
    maxBounds: [
      [-122.6, 37.68],
      [-122.28, 37.88],
    ],
  });

  if (window.innerWidth < 768) {
    map.setZoom(10.5);
  }

  // ---- GeoJSON paths ----
  const neighborhoodUrl = "bayview.geojson";
  const districtUrl = "district.geojson";

  const [neighborhoodGJ, districtGJ] = await Promise.all([
    fetch(neighborhoodUrl).then((r) => r.json()),
    fetch(districtUrl).then((r) => r.json()),
  ]);

  map.on("load", () => {
    map.addSource("neighborhood", {
      type: "geojson",
      data: neighborhoodGJ,
    });

    map.addSource("district", {
      type: "geojson",
      data: districtGJ,
    });

    map.addLayer({
      id: "neighborhood-fill",
      type: "fill",
      source: "neighborhood",
      paint: {
        "fill-color": fillColor,
        "fill-opacity": 0.3,
      },
    });

    map.addLayer({
      id: "neighborhood-outline",
      type: "line",
      source: "neighborhood",
      paint: {
        "line-color": outlineColor,
        "line-width": 1.5,
      },
    });

    map.addLayer({
      id: "district-outline",
      type: "line",
      source: "district",
      paint: {
        "line-color": outlineColor,
        "line-width": 1.5,
        "line-dasharray": [3, 2],
      },
    });

    try {
      if (map.getLayer("road-label-navigation")) {
        map.moveLayer("road-label-navigation");
      }
      if (map.getLayer("settlement-subdivision-label")) {
        map.moveLayer("settlement-subdivision-label");
      }
    } catch (e) {
      // fail silently
    }

    map.resize();
    pymChild.sendHeight();
  });

  window.addEventListener("resize", () => {
    map.resize();
    pymChild.sendHeight();
  });
});
