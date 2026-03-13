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
        // ---- Require pinch to zoom, disable scroll wheel ----
        scrollZoom: false,
        dragRotate: false,
            dragPan: false,
        touchPitch: false
    });

    if (window.innerWidth < 768) {
        map.setZoom(10.25);
    }

   // ---- GeoJSON paths (change this for each neighborhood) ----
    const neighborhoodUrl = 'richmond.geojson';
    const districtUrl = 'district.geojson';

    const [neighborhoodGJ, districtGJ] = await Promise.all([
        fetch(neighborhoodUrl).then(r => r.json()),
        fetch(districtUrl).then(r => r.json())
    ]);

    map.on('load', () => {
        // ---- Sources ----
        map.addSource('neighborhood', {
            type: 'geojson',
            data: neighborhoodGJ
        });

        map.addSource('district', {
            type: 'geojson',
            data: districtGJ
        });

        // ---- Layers ----
        map.addLayer({
            id: 'neighborhood-fill',
            type: 'fill',
            source: 'neighborhood',
            paint: {
                'fill-color': '#efbe25',
                'fill-opacity': 0.12
            }
        });

        map.addLayer({
            id: 'neighborhood-outline',
            type: 'line',
            source: 'neighborhood',
            paint: {
                'line-color': '#efbe25',
                'line-width': 1.5
            }
        });

        map.addLayer({
            id: 'district-outline',
            type: 'line',
            source: 'district',
            paint: {
                'line-color': '#efbe25',
                'line-width': 1.5,
                'line-dasharray': [3, 2]
            }
        });

        // ---- Click anywhere → open link ----
        const neighborhoodUrlOut = 'https://missionlocal.org/';
        map.getCanvas().style.cursor = 'pointer';
        map.on('click', () => {
            window.open(neighborhoodUrlOut, '_blank');
        });

        try {
            if (map.getLayer('road-label-navigation')) map.moveLayer('road-label-navigation');
            if (map.getLayer('settlement-subdivision-label')) map.moveLayer('settlement-subdivision-label');
        } catch (e) {}

        
    setTimeout(() => {
        map.resize();
        pymChild.sendHeight();
    }, 300)
    });

    window.addEventListener('resize', () => {
        map.resize();
        pymChild.sendHeight();
    });
});