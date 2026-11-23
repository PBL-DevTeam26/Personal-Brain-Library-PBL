import React from 'react';
import {Text,Linking} from 'react-native';
import {Action,s} from './ui';
import {placeDetails} from './placeDetails';
export function PlaceDetails({place,onError}){
 const info=placeDetails(place);
 const open=async url=>{try{await Linking.openURL(url)}catch{onError('Kunne ikke åbne linket. Prøv igen.')}};
 return <>
  <Text style={s.subtitle}>{info.category}</Text>
  {info.cuisine?<Text style={s.text}>Køkken: {info.cuisine}</Text>:null}
  {info.museum?<Text style={s.text}>Museumstype: {info.museum}</Text>:null}
  {info.address?<Text style={s.text}>Adresse: {info.address}</Text>:null}
  {info.diet.length?<Text style={s.text}>{info.diet.join(' · ')}</Text>:null}
  {info.description?<Text style={s.text}>{info.description}</Text>:null}
  {info.sparse?<Text style={s.subtitle}>Vi har kun få oplysninger om stedet. Spring gerne over, hvis du ikke kan vurdere det.</Text>:null}
  {info.mapUrl?<Action title="Vis placering i OpenStreetMap" onPress={()=>open(info.mapUrl)}/>:null}
  {info.website?<Action title="Besøg stedets hjemmeside" onPress={()=>open(info.website)}/>:null}
  <Text style={s.subtitle}>Kilde: OpenStreetMap. Oplysninger kan være ufuldstændige eller forældede.</Text>
 </>;
}
