import React from 'react';
import { View,Text,Pressable,StyleSheet,ScrollView,ActivityIndicator } from 'react-native';
export const colors={bg:'#0e1726',card:'#18253a',text:'#ecf3fc',muted:'#9badc4',accent:'#9de9b2',border:'#2b3950'};
export const s=StyleSheet.create({
 screen:{flex:1,backgroundColor:colors.bg},pad:{padding:18,gap:12,paddingBottom:38},
 heading:{color:colors.text,fontSize:26,fontWeight:'800',marginBottom:8},
 subtitle:{color:colors.muted,fontSize:15,lineHeight:23},
 card:{backgroundColor:colors.card,borderRadius:14,padding:16,gap:9,borderWidth:1,borderColor:colors.border},
 title:{color:colors.text,fontSize:18,fontWeight:'700'},text:{color:colors.text,fontSize:15},
 button:{padding:14,borderRadius:12,backgroundColor:colors.accent,alignItems:'center'},
 buttonText:{color:'#102018',fontSize:15,fontWeight:'800'},
 choice:{padding:16,borderWidth:1,borderColor:colors.border,borderRadius:12,backgroundColor:colors.card},
 choiceSelected:{borderColor:colors.accent,backgroundColor:'#244438'},
 choiceText:{color:colors.text,fontSize:15},
});
export function Page({children}){return <ScrollView style={s.screen} contentContainerStyle={s.pad}>{children}</ScrollView>}
export function Panel({children}){return <View style={s.card}>{children}</View>}
export function Action({title,onPress,disabled=false}){return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[s.button,disabled&&{opacity:0.45}]}><Text style={s.buttonText}>{title}</Text></Pressable>}
export function Loading(){return <View style={{padding:40}}><ActivityIndicator color={colors.accent}/></View>}
export function ErrorText({message}){return message?<Text style={{color:'#ffb3aa',lineHeight:22}}>{message}</Text>:null}
