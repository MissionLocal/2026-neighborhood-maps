// map.js — neighborhood + political district outlines (SoMa / District 6)
document.addEventListener('DOMContentLoaded', () => {
    const pymChild = new pym.Child();
    mapboxgl.accessToken = "pk.eyJ1IjoibWxub3ciLCJhIjoiY21kNmw1aTAyMDFkbTJqb3Z2dTN0YzRjMyJ9.4abRTnHdhMI-RE48dHNtYw";

    const infoBox = document.getElementById('info-box');
    if (infoBox) infoBox.style.display = 'none';

    const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mlnow/cmis0bnr0000401sr9iyb6i1a',
        center: [-122.4075, 37.7815], 
        zoom: 12.4,
        // ---- Require pinch to zoom, disable scroll wheel ----
        scrollZoom: false,
        dragRotate: false,
        dragPan: false,
        touchPitch: false
    });

    if (window.innerWidth < 768) {
        map.setZoom(12.4);
    }

    map.on("load", () => {
        // ---- Colors ----
        const neighborhoodColor = "#efbe25"; // gold (SoMa outline)
        const districtColor = "#efbe25";     // gold (District 6 outline)
        
        // ---- Sources (local GeoJSON) ----
        map.addSource("neighborhood", {
            type: "geojson",
            data: "soma.geojson"
        });
        map.addSource("district-6", {
            type: "geojson",
            data: "district-6.geojson"
        });

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

        // ---- Layers: district 6 (dashed) ----
        map.addLayer({
            id: "district-6-outline",
            type: "line",
            source: "district-6",
            paint: {
                "line-color": districtColor,
                "line-width": 1.8,
                "line-dasharray": [3, 2],
            },
        });

        // ---- Ensure District 6 is on top ----
        map.moveLayer("district-6-outline");

        // ---- Click anywhere → open link ----
        // TODO: confirm/replace with the live SoMa resources page URL.
        const neighborhoodUrlOut = 'https://missionlocal.org/soma-resources/';
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
