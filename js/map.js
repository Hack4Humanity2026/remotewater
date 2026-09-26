// map.js — a village map as plain SVG, no tiles, no external library.
// Real OpenStreetMap building centroids and roads, projected with a simple equirectangular scale.
// Status is shown by colour AND shape AND a text title, so it survives colour-blindness and screen readers.

const NS = 'http://www.w3.org/2000/svg';

export function renderMap(svg, { places, roads }, statusOf, onSelect, selectedId = null) {
  const lats = places.map((p) => p.lat), lons = places.map((p) => p.lon);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const k = Math.cos(((minLat + maxLat) / 2) * Math.PI / 180);
  const W = 1000, pad = 20;
  const scale = (W - 2 * pad) / ((maxLon - minLon) * k);
  const H = (maxLat - minLat) * scale + 2 * pad;
  const X = (lon) => pad + (lon - minLon) * k * scale;
  const Y = (lat) => pad + (maxLat - lat) * scale;

  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = '';
  const gRoads = el('g', { class: 'roads' });
  for (const line of roads) {
    gRoads.appendChild(el('polyline', { points: line.map(([lon, lat]) => `${X(lon).toFixed(1)},${Y(lat).toFixed(1)}`).join(' ') }));
  }
  svg.appendChild(gRoads);

  const gPlaces = el('g', { class: 'places' });
  for (const p of places) {
    const st = statusOf(p); // { level: 'green'|'red'|'none'|'plant', label }
    const x = X(p.lon), y = Y(p.lat);
    let node;
    if (p.kind === 'plant') {
      node = el('polygon', { points: `${x},${y - 12} ${x + 12},${y} ${x},${y + 12} ${x - 12},${y}`, class: 'plant' });
    } else if (p.priority) {
      node = el('rect', { x: x - 7, y: y - 7, width: 14, height: 14, class: `place st-${st.level}` });
    } else if (!p.served) {
      node = el('circle', { cx: x, cy: y, r: 3, class: 'place unserved' });
    } else {
      node = el('circle', { cx: x, cy: y, r: 5, class: `place st-${st.level}` });
    }
    if (p.id === selectedId) node.classList.add('selected');
    node.setAttribute('tabindex', p.served ? '0' : '-1');
    node.setAttribute('role', p.served ? 'button' : 'img');
    node.setAttribute('aria-label', `${p.name || p.id}: ${st.label}`);
    const title = el('title');
    title.textContent = `${p.name || p.id} — ${st.label}`;
    node.appendChild(title);
    if (p.served && onSelect) {
      node.addEventListener('click', () => onSelect(p));
      node.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(p); } });
    }
    gPlaces.appendChild(node);
  }
  svg.appendChild(gPlaces);
}

function el(tag, attrs = {}) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
}
