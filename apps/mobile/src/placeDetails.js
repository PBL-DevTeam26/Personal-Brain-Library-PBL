// Only display facts present in the imported OSM record.
const labels={italian:'Italiensk',pizza:'Pizza',pasta:'Pasta',japanese:'Japansk',chinese:'Kinesisk',thai:'Thailandsk',vietnamese:'Vietnamesisk',korean:'Koreansk',asian:'Asiatisk',indian:'Indisk',burger:'Burger',coffee_shop:'Kaffe',danish:'Dansk',regional:'Regionalt',sandwich:'Sandwich',seafood:'Fisk og skaldyr'};
const museumLabels={art:'Kunst',history:'Historie',science:'Videnskab',technology:'Teknologi',archaeological:'Arkæologi'};
export function placeDetails(place){
 const tags=place.raw_tags||{};
 const text=value=>typeof value==='string'?value.trim():'';
 const cuisine=text(tags.cuisine).split(/[;,]/).map(x=>x.trim()).filter(Boolean).map(x=>labels[x]||x).join(', ');
 const museum=text(tags.museum||tags['museum:type']);
 const street=[text(tags['addr:street']),text(tags['addr:housenumber'])].filter(Boolean).join(' ');
 const city=[text(tags['addr:postcode']),text(tags['addr:city'])].filter(Boolean).join(' ');
 const address=[street,city].filter(Boolean).join(', ');
 const diet=[];
 for(const [key,label] of [['diet:vegan','Vegansk'],['diet:vegetarian','Vegetarisk']]){
  if(tags[key]==='yes')diet.push(label+' mulighed');
  if(tags[key]==='only')diet.push('Kun '+label.toLowerCase());
 }
 const rawWebsite=text(tags.website||tags['contact:website']);
 let website=null;
 if(rawWebsite){try{const url=new URL(/^https?:\/\//i.test(rawWebsite)?rawWebsite:(!/^[a-z][a-z\d+.-]*:/i.test(rawWebsite)?'https://'+rawWebsite:''));if(['http:','https:'].includes(url.protocol)&&url.hostname&&!url.username&&!url.password)website=url.href}catch{}}
 const lat=Number(place.latitude),lon=Number(place.longitude);
 const mapUrl=place.latitude!=null&&place.longitude!=null&&Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180?`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`:null;
 return {category:tags.amenity==='cafe'?'Café':place.kind==='restaurant'?'Restaurant':'Museum',cuisine,museum:museumLabels[museum]||museum,address,diet,description:text(place.description)||text(tags['description:da'])||text(tags.description),website,mapUrl,sparse:!cuisine&&!museum&&!diet.length&&!text(place.description)&&!text(tags['description:da'])&&!text(tags.description)};
}
