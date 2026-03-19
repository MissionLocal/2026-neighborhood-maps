// map.js — neighborhood + political district outlines
document.addEventListener('DOMContentLoaded', () => {
    const pymChild = new pym.Child();
    mapboxgl.accessToken = "pk.eyJ1IjoibWxub3ciLCJhIjoiY21kNmw1aTAyMDFkbTJqb3Z2dTN0YzRjMyJ9.4abRTnHdhMI-RE48dHNtYw";

    // DOM
    const infoBox = document.getElementById('info-box');

    // Hide info box on load (kept for styling consistency, but unused)
    if (infoBox) infoBox.style.display = 'none';

    const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mlnow/cmis0bnr0000401sr9iyb6i1a',
        center: [-122.431297, 37.773972], // San Francisco center
        zoom: 10.5,
        maxBounds: [
            [-122.60, 37.68],   // southwest corner
            [-122.28, 37.88]    // northeast corner
        ],
        scrollZoom: false,
        dragRotate: false,
        dragPan: false,
        touchPitch: false
    });

    if (window.innerWidth < 768) {
        map.setZoom(10.5); // mobile tweak
    }

    map.on('load', () => {
        // ---- Sources (Mapbox tilesets) ----
        map.addSource('neighborhood', {
            type: 'vector',
            url: 'mapbox://mlnow.0v3scdh5'   // e.g. mapbox://mlnow.xxxxxxxx
        });

        map.addSource('district', {
            type: 'vector',
            url: 'mapbox://mlnow.2i2jbr3x'       // e.g. mapbox://mlnow.xxxxxxxx
        });

        // ---- Layers ----
        map.addLayer({
            id: 'neighborhood-fill',
            type: 'fill',
            source: 'neighborhood',
            'source-layer': 'tenderloin-ccogd2', // layer name from Mapbox Studio
            paint: {
                'fill-color': '#efbe25',
                'fill-opacity': 0.12
            }
        });

        map.addLayer({
            id: 'neighborhood-outline',
            type: 'line',
            source: 'neighborhood',
            'source-layer': 'tenderloin-ccogd2', // same as above
            paint: {
                'line-color': '#efbe25',
                'line-width': 1.5
            }
        });

        map.addLayer({
            id: 'district-outline',
            type: 'line',
            source: 'district',
            'source-layer': 'district-5-8b3c3e',     // layer name from Mapbox Studio
            paint: {
                'line-color': '#efbe25',
                'line-width': 1.5,
                'line-dasharray': [3, 2]
            }
        });

        // ---- Interaction: click anywhere → open link ----
        const neighborhoodUrlOut = 'https://missionlocal.org/tenderloin-resources/'; // <-- your story URL

        map.getCanvas().style.cursor = 'pointer';

        map.on('click', () => {
            window.open(neighborhoodUrlOut, '_blank');
        });

        // ---- Keep labels on top ----
        try {
            if (map.getLayer('road-label-navigation')) {
                map.moveLayer('road-label-navigation');
            }
            if (map.getLayer('settlement-subdivision-label')) {
                map.moveLayer('settlement-subdivision-label');
            }
        } catch (e) {
            // fail silently if style layers differ
        }

        // Initial resize for embeds
        map.resize();
        pymChild.sendHeight();
    });

    window.addEventListener('resize', () => {
        map.resize();
        pymChild.sendHeight();
    });
});
