// map.js — neighborhood + political district outlines
document.addEventListener('DOMContentLoaded', async () => {
    const pymChild = new pym.Child();
    mapboxgl.accessToken = "pk.eyJ1IjoibWxub3ciLCJhIjoiY21kNmw1aTAyMDFkbTJqb3Z2dTN0YzRjMyJ9.4abRTnHdhMI-RE48dHNtYw";

    const infoBox = document.getElementById('info-box');
    if (infoBox) infoBox.style.display = 'none';

    const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mlnow/cmis0bnr0000401sr9iyb6i1a',
        center: [-122.431297, 37.773972],
        zoom: 10.25,
        scrollZoom: false,
        dragRotate: false,
        dragPan: false,
        touchPitch: false
    });

    if (window.innerWidth < 768) {
        map.setZoom(10.25);
    }

    // ---- Mapbox tileset IDs (replace with your actual tileset IDs) ----
    // Format: "mapbox://YOUR_USERNAME.TILESET_ID"
    const NEIGHBORHOOD_TILESET = "mapbox://mlnow.4p41p2qi";
    const DISTRICT1_TILESET    = "mapbox://mlnow.7sprss6m";
    const DISTRICT2_TILESET    = "mapbox://mlnow.6vm5tysn";

    // ---- Source layer names (the layer name inside the tileset, visible in Mapbox Studio) ----
    const NEIGHBORHOOD_SOURCE_LAYER = "sunset-d0z0so";
    const DISTRICT1_SOURCE_LAYER    = "district-2iluic";
    const DISTRICT2_SOURCE_LAYER    = "district_7-cn8pjl";

    map.on("load", () => {
        // ---- Colors ----
        const neighborhoodColor = "#efbe25"; // gold
        const district1Color    = "#0dd6c7"; // teal
        const district2Color    = "#efbe25"; // gold

        // ---- Sources (vector tiles) ----
        map.addSource("neighborhood", {
            type: "vector",
            url: NEIGHBORHOOD_TILESET,
        });
        map.addSource("district-1", {
            type: "vector",
            url: DISTRICT1_TILESET,
        });
        map.addSource("district-2", {
            type: "vector",
            url: DISTRICT2_TILESET,
        });

        // ---- Layers: neighborhood ----
        map.addLayer({
            id: "neighborhood-fill",
            type: "fill",
            source: "neighborhood",
            "source-layer": NEIGHBORHOOD_SOURCE_LAYER,
            paint: {
                "fill-color": neighborhoodColor,
                "fill-opacity": 0.12,
            },
        });

        map.addLayer({
            id: "neighborhood-outline",
            type: "line",
            source: "neighborhood",
            "source-layer": NEIGHBORHOOD_SOURCE_LAYER,
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
            "source-layer": DISTRICT1_SOURCE_LAYER,
            paint: {
                "line-color": district1Color,
                "line-width": 1.8,
                "line-dasharray": [3, 2],
            },
        });

        // District 2 = dotted-ish
        map.addLayer({
            id: "district-2-outline",
            type: "line",
            source: "district-2",
            "source-layer": DISTRICT2_SOURCE_LAYER,
            paint: {
                "line-color": district2Color,
                "line-width": 1.8,
                "line-dasharray": [3, 2],
            },
        });

        // ---- Ensure District 1 is on top ----
        map.moveLayer("district-1-outline");

        // ---- Click anywhere → open link ----
        const neighborhoodUrlOut = 'https://missionlocal.org/sunset-resources/';
        map.getCanvas().style.cursor = 'pointer';
        map.on('click', () => {
            window.open(neighborhoodUrlOut, '_blank');
        });

        try {
            if (map.getLayer('road-label-navigation')) map.moveLayer('road-label-navigation');
            if (map.getLayer('settlement-subdivision-label')) map.moveLayer('settlement-subdivision-label');
        } catch (e) { }

        setTimeout(() => {
            map.resize();
            pymChild.sendHeight();
        }, 300);
    });

    window.addEventListener('resize', () => {
        map.resize();
        pymChild.sendHeight();
    });
});