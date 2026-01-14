// map.js — neighborhood + political district outlines (2 districts)
document.addEventListener('DOMContentLoaded', async () => {
    const pymChild = new pym.Child();
    mapboxgl.accessToken =
      "pk.eyJ1IjoibWxub3ciLCJhIjoiY21kNmw1aTAyMDFkbTJqb3Z2dTN0YzRjMyJ9.4abRTnHdhMI-RE48dHNtYw";
  
    // DOM
    const infoBox = document.getElementById("info-box");
    if (infoBox) infoBox.style.display = "none";
  
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
  
    // ---- GeoJSON paths (change this for each neighborhood) ----
    const neighborhoodUrl = "sunset.geojson";
    const districtUrl = "district.geojson";
  
    const [neighborhoodGJ, districtGJ] = await Promise.all([
      fetch(neighborhoodUrl).then((r) => r.json()),
      fetch(districtUrl).then((r) => r.json()),
    ]);
  
    // ---- helpers: split districts into two groups ----
    function pickDistrictKey(featureCollection) {
      const f = featureCollection?.features?.find((x) => x && x.properties);
      if (!f) return null;
  
      const props = f.properties;
  
      // Prefer keys that look like district labels
      const preferredKeys = [
        "district",
        "District",
        "DISTRICT",
        "distr",
        "supervisor",
        "Supervisor",
        "SUPERVISOR",
        "dist_num",
        "district_num",
        "d",
      ];
  
      for (const k of preferredKeys) {
        if (k in props) return k;
      }
  
      // Otherwise: pick a key with string/number values and multiple unique values
      const keys = Object.keys(props);
      let bestKey = null;
      let bestUniqueCount = 0;
  
      for (const k of keys) {
        const vals = featureCollection.features
          .map((ft) => ft?.properties?.[k])
          .filter((v) => v !== null && v !== undefined);
  
        // Only consider primitive-ish values
        if (!vals.length) continue;
        if (vals.some((v) => typeof v === "object")) continue;
  
        const unique = new Set(vals.map((v) => String(v).trim()));
        if (unique.size > bestUniqueCount) {
          bestUniqueCount = unique.size;
          bestKey = k;
        }
      }
  
      return bestKey;
    }
  
    function splitIntoTwoDistricts(featureCollection) {
      const key = pickDistrictKey(featureCollection);
  
      if (!key) {
        return {
          key: null,
          aLabel: "District A",
          bLabel: "District B",
          aGJ: featureCollection,
          bGJ: { type: "FeatureCollection", features: [] },
        };
      }
  
      const values = featureCollection.features
        .map((ft) => ft?.properties?.[key])
        .filter((v) => v !== null && v !== undefined)
        .map((v) => String(v).trim());
  
      const unique = Array.from(new Set(values));
  
      const aVal = unique[0] ?? "District A";
      const bVal = unique[1] ?? "District B";
  
      const aFeatures = featureCollection.features.filter(
        (ft) => String(ft?.properties?.[key]).trim() === aVal
      );
      const bFeatures = featureCollection.features.filter(
        (ft) => String(ft?.properties?.[key]).trim() === bVal
      );
  
      return {
        key,
        aLabel: aVal,
        bLabel: bVal,
        aGJ: { type: "FeatureCollection", features: aFeatures },
        bGJ: { type: "FeatureCollection", features: bFeatures },
      };
    }
  
    const districts = splitIntoTwoDistricts(districtGJ);
  
    map.on("load", () => {
      // ---- Colors & styles (edit here) ----
      const neighborhoodColor = "#efbe25"; // your current gold
      const districtAColor = "#0dd6c7";    // teal
      const districtBColor = "#f67cf6";    // pink
  
      // ---- Sources ----
      map.addSource("neighborhood", { type: "geojson", data: neighborhoodGJ });
  
      // Split districts into two sources so we don't need to know the property name in Mapbox filters
      map.addSource("district-a", { type: "geojson", data: districts.aGJ });
      map.addSource("district-b", { type: "geojson", data: districts.bGJ });
  
      // ---- Layers: neighborhood ----
      map.addLayer({
        id: "neighborhood-fill",
        type: "fill",
        source: "neighborhood",
        paint: {
          "fill-color": neighborhoodColor,
          "fill-opacity": 0.12,
        },
      });
  
      map.addLayer({
        id: "neighborhood-outline",
        type: "line",
        source: "neighborhood",
        paint: {
          "line-color": neighborhoodColor,
          "line-width": 1.5,
        },
      });
  
      // ---- Layers: districts ----
      // District A = dashed
      map.addLayer({
        id: "district-a-outline",
        type: "line",
        source: "district-a",
        paint: {
          "line-color": districtAColor,
          "line-width": 1.8,
          "line-dasharray": [3, 2],
        },
      });
  
      // District B = dotted (short dash + bigger gap reads as dots)
      map.addLayer({
        id: "district-b-outline",
        type: "line",
        source: "district-b",
        paint: {
          "line-color": districtBColor,
          "line-width": 1.8,
          "line-dasharray": [0.5, 2], // dotted-ish
        },
      });
  
      // ---- Interaction: click anywhere → open link ----
      const neighborhoodUrlOut = "https://missionlocal.org/"; // <-- your story URL
      map.getCanvas().style.cursor = "pointer";
      map.on("click", () => window.open(neighborhoodUrlOut, "_blank"));
  
      // ---- Keep labels on top ----
      try {
        if (map.getLayer("road-label-navigation")) map.moveLayer("road-label-navigation");
        if (map.getLayer("settlement-subdivision-label")) map.moveLayer("settlement-subdivision-label");
      } catch (e) {}
  
      // Initial resize for embeds
      map.resize();
      pymChild.sendHeight();
  
      // ---- Optional: auto-update legend text if your legend spans exist ----
      const d1 = document.getElementById("district-1-label");
      const d2 = document.getElementById("district-2-label");
      if (d1) d1.textContent = districts.aLabel || "District A";
      if (d2) d2.textContent = districts.bLabel || "District B";
    });
  
    window.addEventListener("resize", () => {
      map.resize();
      pymChild.sendHeight();
    });
  });
  