var map;
var layerControl;

// --- CAPAS BASE ---
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

// --- FUNCIÓN PARA DETERMINAR COLOR SEGÚN HABILITADOS ---
function getColor(d) {
    return d > 3000 ? '#7D6608' : // Bronce Oscuro (Muy importante)
           d > 1000 ? '#D4AF37' : // Dorado Estándar (Normal)
                      '#F7DC6F';  // Amarillo Claro (Menos carga)
}

function initMap() {
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
                    var votos = feature.properties.Habilitados || 500; 
                    
                    // 1. Tamaño según votos
                    var radio = Math.sqrt(votos) * 0.35; 
                    radio = Math.max(radio, 8); // Mínimo 8px

                    // 2. Color según votos
                    var colorRelleno = getColor(votos);

                    return L.circleMarker(latlng, {
                        radius: radio,
                        fillColor: colorRelleno, 
                        color: "#fff", // Borde blanco
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0.85
                    });
                },
                onEachFeature: function (feature, layer) {
                    var p = feature.properties;

                    // LÓGICA WHATSAPP
                    // Limpiamos el número para quitar espacios o guiones y agregamos el código de país
                    var waLink = "#";
                    var waClass = "disabled";
                    if (p.Contacto_Jefe) {
                        var cleanPhone = p.Contacto_Jefe.toString().replace(/\D/g,''); // Solo deja números
                        waLink = `https://wa.me/591${cleanPhone}`;
                        waClass = "";
                    }

                    // HTML DE MESAS
                    var htmlMesas = "";
                    if (p.Lista_Mesas && Array.isArray(p.Lista_Mesas)) {
                        htmlMesas = `<ul class="mesas-list">`;
                        p.Lista_Mesas.forEach(m => {
                            htmlMesas += `
                                <li class="mesa-item">
                                    <span class="mesa-header">MESA ${m.mesa}</span>
                                    <div style="display:flex; justify-content:space-between; font-size:11px;">
                                        <span>👤 ${m.delegado || "Sin asignar"}</span>
                                        <span>🆔 ${m.carnet || "--"}</span>
                                    </div>
                                    <div style="font-size:10px; color:#666; margin-top:2px;">
                                        📞 ${m.cel || "--"} | 🎂 ${m.fnac || "--"}
                                    </div>
                                </li>`;
                        });
                        htmlMesas += `</ul>`;
                    } else {
                        htmlMesas = `<p style="font-size:12px; color:#999; text-align:center; padding:10px;">No hay delegados registrados aún.</p>`;
                    }

                    // CONSTRUIR POPUP (FICHA TÉCNICA)
                    var contenido = `
                        <div class="info-card">
                            <div class="card-header">
                                <h3>${p.NombreReci}</h3>
                                <span class="sub-header">ASIENTO ELECTORAL: ${p.AsientoEle || "Warnes"}</span>
                            </div>
                            
                            <div class="card-body">
                                <div class="location-box">
                                    <strong>UBICACIÓN:</strong><br>
                                    ${p.NomDist || ""} - ${p.NomZona || ""}<br>
                                    <span style="font-style:italic; font-size:11px;">${p.Direccion || ""}</span>
                                </div>

                                <div class="stats-grid">
                                    <div class="stat-item">
                                        <span class="stat-label">Grupo</span>
                                        <span class="stat-value">${p.Grupo || "-"}</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">Recinto Nº</span>
                                        <span class="stat-value">${p.Nro_Recinto || "-"}</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">Mesas</span>
                                        <span class="stat-value">${p.Cantidad_Mesas || "?"}</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">Habilitados</span>
                                        <span class="stat-value" style="color:${getColor(p.Habilitados)}">${p.Habilitados || 0}</span>
                                    </div>
                                </div>
                                
                                <div style="text-align:center; font-size:11px; margin-bottom:15px; color:#555;">
                                    <strong>Impacto:</strong> ${p.Porcentaje || "0%"} del padrón de Warnes
                                </div>

                                <div class="boss-box">
                                    <div style="font-size:10px; text-transform:uppercase; font-weight:700;">Jefe de Recinto</div>
                                    <div style="font-size:14px; font-weight:700; margin:5px 0;">${p.Jefe_Recinto || "VACANTE"}</div>
                                    
                                    <a href="${waLink}" target="_blank" class="boss-phone" 
                                       style="${!p.Contacto_Jefe ? 'background:#ccc; pointer-events:none;' : ''}">
                                       <span style="margin-right:5px;">💬</span>
                                       ${p.Contacto_Jefe ? 'WhatsApp: ' + p.Contacto_Jefe : 'Sin Contacto'}
                                    </a>
                                </div>

                                <div class="separator"></div>
                                
                                <div style="background:#333; color:#D4AF37; padding:5px 10px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px;">
                                    Detalle Mesas: ${p.NombreReci}
                                </div>
                                
                                ${htmlMesas}
                            </div>
                        </div>
                    `;

                    // bindPopup sin opciones de ancho fijo, porque lo controlamos con CSS (.info-card)
                    layer.bindPopup(contenido);
                    
                    layer.bindTooltip(`<b>${p.NombreReci}</b>`, {
                        direction: 'top', className: 'my-tooltip', offset: [0, -10]
                    });
                }
            }).addTo(map);
        });
}

document.addEventListener('keydown', function(event) {
    if (event.key === "Escape") cerrarMapa();
});