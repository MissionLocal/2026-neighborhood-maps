// map.js — neighborhood + political district outlines
document.addEventListener('DOMContentLoaded', () => {
    const pymChild = new pym.Child();
    mapboxgl.accessToken = "pk.eyJ1IjoibWxub3ciLCJhIjoiY21kNmw1aTAyMDFkbTJqb3Z2dTN0YzRjMyJ9.4abRTnHdhMI-RE48dHNtYw";

    const infoBox = document.getElementById('info-box');
    if (infoBox) infoBox.style.display = 'none';

    const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mlnow/cmis0bnr0000401sr9iyb6i1a',
        center: [-122.431297, 37.773972],
        zoom: 10.25,
        // ---- Require pinch to zoom, disable scroll wheel ----
        scrollZoom: false,
        dragRotate: false,
        dragPan: false,
        touchPitch: false
    });

    if (window.innerWidth < 768) {
        map.setZoom(10.25);
    }

    map.on("load", () => {
        // ---- Colors ----
        const neighborhoodColor = "#efbe25"; // gold
        const district1Color = "#0dd6c7";    // teal
        const district2Color = "#efbe25";    // pink

        // ---- Sources (Mapbox tilesets) ----
        map.addSource("neighborhood", {
            type: "vector",
            url: "mapbox://mlnow.2v2kdwqx"
        });
        map.addSource("district-1", {
            type: "vector",
            url: "mapbox://mlnow.1b5i409m"
        });

        // ---- Layers: neighborhood ----
        map.addLayer({
            id: "neighborhood-fill",
            type: "fill",
            source: "neighborhood",
            "source-layer": "mlnow_2v2kdwqx",
            paint: {
                "fill-color": neighborhoodColor,
                "fill-opacity": 0.12,
            },
        });

        map.addLayer({
            id: "neighborhood-outline",
            type: "line",
            source: "neighborhood",
            "source-layer": "mlnow_2v2kdwqx",
            paint: {
                "line-color": neighborhoodColor,
                "line-width": 1.5,
            },
        });

        // ---- Layers: district 1 (dashed) ----
        map.addLayer({
            id: "district-1-outline",
            type: "line",
            source: "district-1",
            "source-layer": "mlnow_1b5i409m",
            paint: {
                "line-color": district1Color,
                "line-width": 1.8,
                "line-dasharray": [3, 2],
            },
        });

        // ---- Ensure District 1 is on top ----
        map.moveLayer("district-1-outline");

        // ---- Click anywhere → open link ----
        const neighborhoodUrlOut = 'https://missionlocal.org/';
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