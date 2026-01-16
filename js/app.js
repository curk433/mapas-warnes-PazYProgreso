var map;
var layerControl;

// --- CONFIGURACIÓN DE CAPAS BASE ---
var calles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
});

var satelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles © Esri'
});

function abrirMapa(tipo) {
    document.getElementById('modalMapa').style.display = 'block';
    if (!map) { initMap(); } 
    else { setTimeout(function(){ map.invalidateSize(); }, 200); }
}

function cerrarMapa() { document.getElementById('modalMapa').style.display = 'none'; }

function initMap() {
    // Coordenadas Warnes
    map = L.map('map', {
        center: [-17.51, -63.16], 
        zoom: 13,
        layers: [calles] 
    });

    var baseMaps = { "Mapa Vial": calles, "Satélite": satelite };
    L.control.layers(baseMaps).addTo(map);

    // --- CARGAR DATOS ---
    fetch('data/recintos_warnes.geojson')
        .then(response => response.json())
        .then(data => {
            L.geoJSON(data, {
                pointToLayer: function (feature, latlng) {
                    // CÁLCULO DE TAMAÑO DINÁMICO
                    // Si tienes el dato 'Habilitados' en tu JSON, el círculo crece. Si no, tamaño fijo.
                    var votos = feature.properties.Habilitados || 1000; 
                    var radio = Math.sqrt(votos) * 0.35; // Factor de ajuste
                    radio = Math.max(radio, 7); // Tamaño mínimo 7px

                    return L.circleMarker(latlng, {
                        radius: radio,
                        fillColor: "#D4AF37", // Dorado
                        color: "#fff",
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0.8
                    });
                },
                onEachFeature: function (feature, layer) {
                    var p = feature.properties;

                    // 1. GENERAR HTML DE LAS MESAS (Si existen en el JSON)
                    var htmlMesas = "";
                    if (p.Lista_Mesas && Array.isArray(p.Lista_Mesas)) {
                        htmlMesas = `<ul class="mesas-list">`;
                        p.Lista_Mesas.forEach(m => {
                            htmlMesas += `
                                <li class="mesa-item">
                                    <span class="mesa-header">MESA ${m.mesa}</span>
                                    <span class="mesa-delegate">👤 ${m.delegado || "Sin asignar"}</span>
                                    <div class="mesa-details">
                                        <span>📞 ${m.cel || "--"}</span>
                                        <span>🆔 ${m.carnet || "--"}</span>
                                        <span>🎂 ${m.fnac || "--"}</span>
                                    </div>
                                </li>`;
                        });
                        htmlMesas += `</ul>`;
                    } else {
                        htmlMesas = `<p style="font-size:11px; color:#999; text-align:center;">No hay delegados registrados aún.</p>`;
                    }

                    // 2. CONSTRUIR POPUP SUPERIOR
                    var contenido = `
                        <div class="info-card">
                            <div class="card-header">
                                <h3>${p.NombreReci}</h3>
                                <span class="sub-header">${p.AsientoEle || "Warnes"}</span>
                            </div>
                            
                            <div class="card-body">
                                <div class="location-box">
                                    <strong>UBICACIÓN:</strong><br>
                                    ${p.NomDist || ""} - ${p.NomZona || ""}<br>
                                    ${p.Direccion || ""}
                                </div>

                                <div class="separator"></div>

                                <div class="stats-grid">
                                    <div class="stat-item">
                                        <span class="stat-label">Grupo</span>
                                        <span class="stat-value">${p.Grupo || "-"}</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">Recinto Nº</span>
                                        <span class="stat-value">${p.Nro_Recinto || p.Reci}</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">Mesas</span>
                                        <span class="stat-value">${p.Cantidad_Mesas || "?"}</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">Habilitados</span>
                                        <span class="stat-value">${p.Habilitados || 0}</span>
                                    </div>
                                </div>
                                
                                <div style="text-align:center; font-size:10px; margin-bottom:10px;">
                                    <strong>Impacto:</strong> ${p.Porcentaje || "0%"} del padrón
                                </div>

                                <div class="boss-box">
                                    <span class="boss-title">Jefe de Recinto</span>
                                    <span class="boss-name">${p.Jefe_Recinto || "VACANTE"}</span>
                                    <a href="tel:${p.Contacto_Jefe}" class="boss-phone">📞 ${p.Contacto_Jefe || "--"}</a>
                                </div>

                                <div class="separator"></div>
                                <h4 style="margin:0 0 10px; font-size:12px; text-transform:uppercase;">Detalle Mesas</h4>
                                ${htmlMesas}
                            </div>
                        </div>
                    `;

                    layer.bindPopup(contenido, { maxWidth: 320 });
                    
                    // Tooltip hover
                    layer.bindTooltip(`<b>${p.NombreReci}</b>`, {
                        direction: 'top', className: 'my-tooltip', offset: [0, -10]
                    });
                }
            }).addTo(map);
        });

    // --- LÍMITES / FRONTERA ---
    // Si consigues el archivo 'limite_warnes.geojson', usa este bloque:
    /*
    fetch('data/limite_warnes.geojson').then(r => r.json()).then(data => {
        L.geoJSON(data, { 
            style: { color: '#ff0000', weight: 2, fill: false, dashArray: '5, 5' } 
        }).addTo(map);
    });
    */
}

document.addEventListener('keydown', function(event) {
    if (event.key === "Escape") cerrarMapa();
});