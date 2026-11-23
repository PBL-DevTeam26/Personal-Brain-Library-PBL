export function mapHtml(places){
 const safe=JSON.stringify(places.map(p=>({id:p.id,name:p.name,latitude:Number(p.latitude),longitude:Number(p.longitude)})))
   .replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
 return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>html,body,#map{height:100%;margin:0;background:#d8e3e9}</style></head><body><div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>
  const map=L.map('map').setView([55.6761,12.5683],11);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
  const pts=${safe}; const bounds=[];
  pts.forEach(p=>{if(!Number.isFinite(p.latitude)||!Number.isFinite(p.longitude))return;
    bounds.push([p.latitude,p.longitude]);
    const label=document.createElement('span');label.textContent=p.name;
    L.marker([p.latitude,p.longitude]).addTo(map).bindPopup(label).on('click',()=>window.ReactNativeWebView.postMessage(String(p.id)));});
  if(bounds.length)map.fitBounds(bounds,{padding:[25,25],maxZoom:13});
  </script></body></html>`;
}
