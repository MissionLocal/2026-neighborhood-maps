// map.js — neighborhood + political district outlines (2 district files)
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
      center: [-122.431297, 37.773972], // San Francisco center
      zoom: 10.5,
      maxBounds: [
        [-122.60, 37.68],
        [-122.28, 37.88],
      ],
    });
  
    if (window.innerWidth < 768) {
      map.setZoom(10.5);
    }
  
    // ---- GeoJSON paths (change these as needed) ----
    const neighborhoodUrl = "sunset.geojson";
  
    // Two separate district files
    const district1Url = "district.geojson";
    const district2Url = "district_7.geojson";
  
    const [neighborhoodGJ, district1GJ, district2GJ] = await Promise.all([
      fetch(neighborhoodUrl).then((r) => r.json()),
      fetch(district1Url).then((r) => r.json()),
      fetch(district2Url).then((r) => r.json()),
    ]);
  
    map.on("load", () => {
      // ---- Colors ----
      const neighborhoodColor = "#efbe25"; // gold
      const district1Color = "#0dd6c7";    // teal
      const district2Color = "#efbe25";    // pink
  
      // ---- Sources ----
      map.addSource("neighborhood", { type: "geojson", data: neighborhoodGJ });
      map.addSource("district-1", { type: "geojson", data: district1GJ });
      map.addSource("district-2", { type: "geojson", data: district2GJ });
  
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
      // District 1 = dashed
      map.addLayer({
        id: "district-1-outline",
        type: "line",
        source: "district-1",
        paint: {
          "line-color": district1Color,
          "line-width": 1.8,
          "line-dasharray": [3, 2],
        },
      });
  
      // District 2 = dotted-ish (very short dash + larger gap)
      map.addLayer({
        id: "district-2-outline",
        type: "line",
        source: "district-2",
        paint: {
          "line-color": district2Color,
          "line-width": 1.8,
          "line-dasharray": [3, 2],
        },
      });

      // ---- Ensure District 1 is on top ----

    map.moveLayer("district-1-outline");
  
  
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
    });
  
    window.addEventListener("resize", () => {
      map.resize();
      pymChild.sendHeight();
    });
  });
  