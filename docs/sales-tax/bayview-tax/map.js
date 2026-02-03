// map.js – neighborhood with sales tax recovery data
document.addEventListener("DOMContentLoaded", async () => {
  const pymChild = new pym.Child();
  mapboxgl.accessToken =
    "pk.eyJ1IjoibWxub3ciLCJhIjoiY21kNmw1aTAyMDFkbTJqb3Z2dTN0YzRjMyJ9.4abRTnHdhMI-RE48dHNtYw";

  // DOM
  const infoBox = document.getElementById("info-box");
  const recoveryStatDiv = document.getElementById("recovery-stat");

  // Hide info box on load
  if (infoBox) infoBox.style.display = "none";

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

  // ---- Fetch sales tax data ----
  let recoveryData = null;
  try {
    const response = await fetch("../adjusted_sales_tax.csv");
    const csvText = await response.text();
    const rows = csvText.trim().split("\n");

    // Find Bayview row
    const bayviewRow = rows.find((row) =>
      row.includes("Bayview Hunters Point")
    );

    if (bayviewRow) {
      const values = bayviewRow.split(",");
      recoveryData = {
        recovery_pct: parseFloat(values[28]),
        latest_quarter: values[29].trim(),
        baseline_quarter: values[30].trim(),
      };
    }
  } catch (error) {
    console.error("Error loading sales tax data:", error);
  }

  // ---- Determine color based on recovery (interpolate on -40 to +40 scale) ----
  let fillColor = "#dddddd"; // default gray
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
      // Interpolate between magenta (-40) and gray (0)
      const factor = (pct + 40) / 40; // 0 at -40%, 1 at 0%
      fillColor = interpolateColor(magenta, gray, factor);
    } else {
      // Interpolate between gray (0) and yellow (40)
      const factor = pct / 40; // 0 at 0%, 1 at 40%
      fillColor = interpolateColor(gray, yellow, factor);
    }

    outlineColor = fillColor;

    // Update legend with better reader-facing text
    const absPct = Math.abs(recoveryData.recovery_pct);
    let statusText;

    if (recoveryData.recovery_pct < 0) {
      statusText = `Sales tax revenue is <strong>${absPct.toFixed(
        1
      )}% below</strong> pre-pandemic levels (${
        recoveryData.baseline_quarter
      })`;
    } else if (recoveryData.recovery_pct > 0) {
      statusText = `Sales tax revenue is <strong>${recoveryData.recovery_pct.toFixed(
        1
      )}% above</strong> pre-pandemic levels (${
        recoveryData.baseline_quarter
      })`;
    } else {
      statusText = `Sales tax revenue has <strong>returned to</strong> pre-pandemic levels (${recoveryData.baseline_quarter})`;
    }

    recoveryStatDiv.innerHTML = statusText;
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
    // ---- Sources ----
    map.addSource("neighborhood", {
      type: "geojson",
      data: neighborhoodGJ,
    });

    map.addSource("district", {
      type: "geojson",
      data: districtGJ,
    });

    // ---- Layers ----
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

    // ---- Keep labels on top ----
    try {
      if (map.getLayer("road-label-navigation")) {
        map.moveLayer("road-label-navigation");
      }
      if (map.getLayer("settlement-subdivision-label")) {
        map.moveLayer("settlement-subdivision-label");
      }
    } catch (e) {
      // fail silently if style layers differ
    }

    // Initial resize for embeds
    map.resize();
    pymChild.sendHeight();
  });

  window.addEventListener("resize", () => {
    map.resize();
    pymChild.sendHeight();
  });
});
