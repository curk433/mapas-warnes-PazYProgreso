var map;
var searchIndex = []; // Aquí guardaremos los datos para buscar

var calles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' });
var satelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: 'Tiles © Esri' });

function abrirMapa(tipo) {
    document.getElementById('modalMapa').style.display = 'block';
    if (!map) { initMap(); } 
    else { setTimeout(function(){ map.invalidateSize(); }, 200); }
}

function cerrarMapa() { document.getElementById('modalMapa').style.display = 'none'; }

function getColor(d) {
    return d > 3000 ? '#7D6608' : d > 1000 ? '#D4AF37' : '#F7DC6F';
}

function initMap() {
    map = L.map('map', { center: [-17.51, -63.16], zoom: 13, layers: [calles] });
    L.control.layers({ "Mapa Vial": calles, "Satélite": satelite }).addTo(map);

    fetch('data/recintos_warnes.geojson')
        .then(response => response.json())
        .then(data => {
            // Limpiamos el índice de búsqueda antes de cargar
            searchIndex = [];

            L.geoJSON(data, {
                pointToLayer: function (feature, latlng) {
                    var votos = feature.properties.Habilitados || 500; 
                    var radio = Math.sqrt(votos) * 0.28; 
                    radio = Math.max(radio, 7); 
                    radio = Math.min(radio, 20); 

                    return L.circleMarker(latlng, {
                        radius: radio,
                        fillColor: getColor(votos), 
                        color: "#fff", weight: 1.5, opacity: 1, fillOpacity: 0.9
                    });
                },
                onEachFeature: function (feature, layer) {
                    var p = feature.properties;
                    
                    // --- 1. INDEXAR DATOS PARA EL BUSCADOR ---
                    // Guardamos referencia a este recinto para buscarlo luego
                    searchIndex.push({
                        nombre: p.NombreReci,
                        jefe: p.Jefe_Recinto || "",
                        mesas: p.Lista_Mesas || [],
                        layer: layer // Guardamos el objeto del mapa para poder abrirlo
                    });

                    // --- 2. CONTENIDO DEL POPUP (Igual que antes) ---
                    var waLink = p.Contacto_Jefe ? `https://wa.me/591${p.Contacto_Jefe.toString().replace(/\D/g,'')}` : "#";
                    var htmlMesas = "";
                    
                    if (p.Lista_Mesas && Array.isArray(p.Lista_Mesas)) {
                        htmlMesas = `<ul class="mesas-list">`;
                        p.Lista_Mesas.forEach(m => {
                            htmlMesas += `
                                <li class="mesa-item">
                                    <span class="mesa-header">MESA ${m.mesa}</span>
                                    <div class="mesa-row">
                                        <div class="mesa-col-delegado">👤 ${m.delegado || "Sin asignar"}</div>
                                        <div class="mesa-col-id">🆔 ${m.carnet || "--"}</div>
                                    </div>
                                    <div class="mesa-info-extra">
                                        <span>📞 ${m.cel || "--"}</span>
                                        <span>🎂 ${m.fnac || "--"}</span>
                                    </div>
                                </li>`;
                        });
                        htmlMesas += `</ul>`;
                    } else {
                        htmlMesas = `<p style="font-size:13px; color:#777; text-align:center; padding:15px;">No hay delegados registrados aún.</p>`;
                    }

                    var mapsLink = `https://www.google.com/maps/dir/?api=1&destination=${p.latitud},${p.longitud}`;
var mapsButton = `
    <div style="text-align:center; margin:18px 0;">
        <a href="${mapsLink}" target="_blank" class="maps-btn">
            <span style="margin-right:6px;">🗺️</span> Cómo llegar con Google Maps
        </a>
    </div>
`;

                    var contenido = `
    <div class="info-card">
        <button class="close-popup-btn" style="position:absolute;top:10px;right:10px;font-size:22px;background:none;border:none;color:#D4AF37;z-index:10;cursor:pointer;">&times;</button>
        <div class="card-header">
            <h3>${p.NombreReci}</h3>
            <span class="sub-header">ASIENTO: ${p.AsientoEle || "WARNES"}</span>
        </div>
        <div class="card-body">
            <div class="location-box">
                <strong>UBICACIÓN:</strong><br>
                ${p.NomDist || ""} - ${p.NomZona || ""}<br>
                <span style="font-style:italic; font-size:13px; color:#444;">${p.Direccion || ""}</span>
            </div>
            ${mapsButton}
            <div class="stats-grid">
                <div class="stat-item"><span class="stat-label">Grupo</span><span class="stat-value">${p.Grupo || "-"}</span></div>
                <div class="stat-item"><span class="stat-label">Recinto Nº</span><span class="stat-value">${p.Nro_Recinto || "-"}</span></div>
                <div class="stat-item"><span class="stat-label">Mesas</span><span class="stat-value">${p.Cantidad_Mesas || "?"}</span></div>
                <div class="stat-item"><span class="stat-label">Habilitados</span><span class="stat-value" style="color:${getColor(p.Habilitados)}">${p.Habilitados || 0}</span></div>
            </div>
            <div style="text-align:center; font-size:13px; margin-bottom:20px; color:#333;">
                <strong>Impacto:</strong> ${p.Porcentaje || "0%"} del padrón de Warnes
            </div>
            <div class="boss-box">
                <div style="font-size:11px; text-transform:uppercase; font-weight:800; color:#555;">Jefe de Recinto</div>
                <div style="font-size:16px; font-weight:900; margin:8px 0; color:#000;">${p.Jefe_Recinto || "VACANTE"}</div>
                <a href="${waLink}" target="_blank" class="boss-phone" style="${!p.Contacto_Jefe ? 'background:#ccc; pointer-events:none;' : ''}">
                   <span style="margin-right:5px;">💬</span> ${p.Contacto_Jefe || 'Sin Contacto'}
                </a>
            </div>
            <div class="separator"></div>
            <div style="background:#222; color:#D4AF37; padding:8px 15px; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:1px; margin-bottom:15px;">
                Detalle Mesas: ${p.NombreReci}
            </div>
            ${htmlMesas}
        </div>
    </div>`;

                    layer.bindPopup(contenido);
                    layer.bindTooltip(`<b>${p.NombreReci}</b>`, { direction: 'top', className: 'my-tooltip', offset: [0, -10] });
                    layer.on('popupopen', function(e) {
                        var btn = document.querySelector('.close-popup-btn');
                        if (btn) {
                            btn.onclick = function() {
                                map.closePopup();
                            };
                        }
                    });
                }
            }).addTo(map);
        });
}

// --- LÓGICA DEL BUSCADOR ---
const inputBuscador = document.getElementById('inputBuscador');
const listaResultados = document.getElementById('listaResultados');
const iconClear = document.querySelector('.clear-icon');

inputBuscador.addEventListener('input', function(e) {
    const texto = e.target.value.toLowerCase();
    listaResultados.innerHTML = ''; // Limpiar
    
    if (texto.length < 2) {
        listaResultados.style.display = 'none';
        iconClear.style.display = 'none';
        return;
    }

    iconClear.style.display = 'block';
    
    // Filtrar resultados
    const resultados = searchIndex.filter(item => {
        // Buscar en nombre recinto
        if (item.nombre && item.nombre.toLowerCase().includes(texto)) return true;
        // Buscar en nombre jefe
        if (item.jefe && item.jefe.toLowerCase().includes(texto)) return true;
        // Buscar en delegados
        if (item.mesas.some(m => m.delegado && m.delegado.toLowerCase().includes(texto))) return true;
        return false;
    });

    if (resultados.length > 0) {
        listaResultados.style.display = 'block';
        resultados.forEach(res => {
            // Determinar qué coincidió para mostrarlo
            let extraInfo = "Recinto Electoral";
            if (res.jefe.toLowerCase().includes(texto)) extraInfo = `Jefe: ${res.jefe}`;
            
            // Si coincide delegado, mostrar cuál
            const delegadoEncontrado = res.mesas.find(m => m.delegado && m.delegado.toLowerCase().includes(texto));
            if (delegadoEncontrado) extraInfo = `Delegado Mesa ${delegadoEncontrado.mesa}: ${delegadoEncontrado.delegado}`;

            const div = document.createElement('div');
            div.className = 'result-item';
            div.innerHTML = `
                <span class="res-nombre">${res.nombre}</span>
                <span class="res-detalle">${extraInfo}</span>
            `;
            
            div.onclick = function() {
                // VOLAR AL LUGAR
                map.flyTo(res.layer.getLatLng(), 16, { duration: 1.5 });
                // ABRIR POPUP
                res.layer.openPopup();
                // Limpiar buscador
                listaResultados.style.display = 'none';
            };
            
            listaResultados.appendChild(div);
        });
    } else {
        listaResultados.style.display = 'none';
    }
});

function limpiarBusqueda() {
    inputBuscador.value = '';
    listaResultados.style.display = 'none';
    iconClear.style.display = 'none';
    inputBuscador.focus();
}

document.addEventListener('keydown', function(event) { if (event.key === "Escape") cerrarMapa(); });