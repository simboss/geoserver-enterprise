var Styler=Ext.extend(Ext.util.Observable,{map:null,wmsLayerList:null,layerList:null,currentLayer:null,sldManager:null,schemaManager:null,symbolTypes:null,ruleDlg:null,featureDlg:null,getFeatureControl:null,saving:null,windowPositions:{featureDlg:{},ruleDlg:{}},fonts:undefined,constructor:function(config){config=config||{};this.addEvents("layerchanged","ruleadded","ruleremoved","ruleupdated");this.initialConfig=Ext.apply({},config);Ext.apply(this,config);var baseLayers=[new OpenLayers.Layer("None",{isBaseLayer:true})];this.baseLayers=baseLayers.concat(config.baseLayers||[]);Styler.superclass.constructor.call(this);Styler.dispatch([function(done){Ext.onReady(function(){this.createLayout();done();},this);},function(done){this.getLayerList(done);}],function(){this.createLayers();this.getSchemas(this.initEditor.createDelegate(this));},this);},getLayerList:function(callback){this.layerList=[];this.getWMSCapabilities((function(){this.describeLayers(callback);}).createDelegate(this))},describeLayers:function(callback){var config;var candidates=[];for(var i=0,ii=this.wmsLayerList.length;i<ii;++i){config=this.wmsLayerList[i];if(config.styles&&config.styles.length){candidates.push(config.name);}}
var params={SERVICE:"WMS",VERSION:"1.1.1",REQUEST:"DescribeLayer",LAYERS:candidates};var store=new GeoExt.data.WMSDescribeLayerStore({url:"../../../geoserver/wms?"+OpenLayers.Util.getParameterString(params),autoLoad:true,listeners:{load:function(){var config,index;for(var i=0,ii=this.wmsLayerList.length;i<ii;++i){config=this.wmsLayerList[i];index=store.findExact("layerName",config.name);if(index>-1){if(store.getAt(index).get("owsType")==="WFS"){this.layerList.push(config);}}}
callback();},scope:this}});},getWMSCapabilities:function(callback){var namespace=OpenLayers.Util.upperCaseObject(OpenLayers.Util.getParameters(window.location.href)).NAMESPACE;Ext.Ajax.request({url:"../../../geoserver/ows",method:"GET",disableCaching:false,success:this.parseWMSCapabilities,failure:function(){throw("Unable to read capabilities from WMS");},params:Ext.apply(namespace?{NAMESPACE:namespace}:{},{VERSION:"1.1.1",REQUEST:"GetCapabilities",SERVICE:"WMS"}),options:{callback:callback},scope:this});},parseWMSCapabilities:function(response,request){var capabilities=new OpenLayers.Format.WMSCapabilities().read(response.responseXML&&response.responseXML.documentElement?response.responseXML:response.responseText);this.wmsLayerList=capabilities.capability.layers;request.options.callback();},createLayout:function(){Ext.util.Observable.observeClass(gxp.form.ColorField);gxp.form.ColorField.on({render:function(field){var manager=new Styler.ColorManager();manager.register(field);}});this.getFeatureControl=new OpenLayers.Control.GetFeature({});this.getFeatureControl.events.on({"featureselected":function(e){this.showFeatureInfo(this.currentLayer,e.feature);},scope:this});this.mapPanel=new GeoExt.MapPanel({border:true,region:"center",map:{allOverlays:false,controls:[new OpenLayers.Control.Navigation({zoomWheelEnabled:false}),new OpenLayers.Control.PanPanel(),new OpenLayers.Control.ZoomPanel(),this.getFeatureControl],projection:new OpenLayers.Projection("EPSG:900913"),units:"m",theme:null,maxResolution:156543.0339,maxExtent:new OpenLayers.Bounds(-20037508.34,-20037508.34,20037508.34,20037508.34),numZoomLevels:this.numZoomLevels||20},items:[{xtype:"gx_zoomslider",vertical:true,height:100,plugins:new GeoExt.ZoomSliderTip({template:"<div>Zoom Level: {zoom}</div><div>Scale: 1 : {scale}</div>"})}]});this.legendContainer=new Ext.Panel({title:"Legend",height:200,autoScroll:true,items:[{html:""}],bbar:[{text:"Add new",iconCls:"add",disabled:true,handler:function(){var panel=this.getLegend();var Type=OpenLayers.Symbolizer[panel.symbolType];var rule=new OpenLayers.Rule({symbolizers:[new Type()]});panel.rules.push(rule);this.fireEvent("ruleadded",rule);this.showRule(this.currentLayer,rule,panel.symbolType,function(){if(!this.saving){panel.rules.remove(rule);this.fireEvent("ruleremoved",rule);}});},scope:this},{text:"Delete selected",iconCls:"delete",disabled:true,handler:function(){var panel=this.getLegend();var rule=panel.selectedRule;var message="Are you sure you want to delete the "+
panel.getRuleTitle(rule)+" rule?";Ext.Msg.confirm("Delete rule",message,function(yesno){if(yesno=="yes"){panel.rules.remove(rule);panel.selectedRule=null;this.fireEvent("ruleremoved",rule);sldMgr=this.sldManager;sldMgr.saveSld(this.currentLayer,function(){this.ruleDlg.close();this.repaint();},this);}},this);},scope:this}]});this.layersContainer=new Ext.Panel({autoScroll:true,title:"Layers",anchor:"100%, -200"});var westPanel=new Ext.Panel({border:true,layout:"anchor",region:"west",width:250,split:true,collapsible:true,hideCollapseTool:true,collapseMode:"mini",items:[this.layersContainer,this.legendContainer]});var viewport=new Ext.Viewport({layout:"fit",hideBorders:true,items:{layout:"border",deferredRender:false,items:[this.mapPanel,westPanel]}});this.map=this.mapPanel.map;this.map.events.on({zoomend:this.setLegendScale,scope:this});},createLayers:function(){var layers=this.baseLayers.slice();var selected=-1;var selectedName=OpenLayers.Util.getParameters(window.location.href).layer;var alpha=OpenLayers.Util.alphaHack();var config;for(var i=0,ii=this.layerList.length;i<ii;++i){config=this.layerList[i]
if(config.styles&&config.styles.length>0){if(config.name===selectedName){selected=layers.length;}
var llbbox=config.llbbox;llbbox[1]=Math.max(-85.0511,llbbox[1]);llbbox[3]=Math.min(85.0511,llbbox[3]);var maxExtent=OpenLayers.Bounds.fromArray(llbbox).transform(new OpenLayers.Projection("EPSG:4326"),new OpenLayers.Projection("EPSG:900913"));layers.push(new OpenLayers.Layer.WMS(config.title,"../../../geoserver/wms",{layers:config.name,styles:config.styles[0].name,transparent:true,format:"image/png"},{isBaseLayer:false,buffer:0,tileSize:new OpenLayers.Size(512,512),displayOutsideMaxExtent:true,visibility:false,alpha:alpha,maxExtent:maxExtent}));}}
if(selected===-1){selected=layers.length-1;}
this.layerTree=new Ext.tree.TreePanel({border:false,animate:false,plugins:[new GeoExt.plugins.TreeNodeRadioButton({listeners:{radiochange:function(node){this.changeLayer(node);},scope:this}})],loader:new Ext.tree.TreeLoader({applyLoader:false,uiProviders:{layerNodeUI:Ext.extend(GeoExt.tree.LayerNodeUI,new GeoExt.tree.TreeNodeUIEventMixin())}}),root:{nodeType:"async",allowDrop:false,children:[{nodeType:"gx_overlaylayercontainer",allowDrag:false,expanded:true,leaf:false,loader:{baseAttrs:{radioGroup:"active",uiProvider:"layerNodeUI"}}},{nodeType:"gx_baselayercontainer",leaf:false,allowDrag:false,allowDrop:false,loader:{baseAttrs:{allowDrag:false}}}]},enableDD:true,listeners:{dragdrop:function(panel,node){window.setTimeout(this.checkCurrentLayerNode.createDelegate(this));},scope:this},rootVisible:false,lines:false});this.layersContainer.add(this.layerTree);this.layersContainer.doLayout();this.map.addLayers(layers);this.setCurrentLayer(this.map.layers[selected]);},checkCurrentLayerNode:function(){this.layerTree.getRootNode().firstChild.cascade(function(node){var el=node.ui.anchor.previousSibling;if(el&&el.type==="radio"){if(node.layer===this.currentLayer&&!el.checked){el.checked=true;}}},this);},getSchemas:function(callback){this.schemaManager=new Styler.SchemaManager(this.map);this.schemaManager.loadAll(callback);},getStyles:function(callback){this.sldManager=new Styler.SLDManager(this.map);this.sldManager.loadAll(callback);},initEditor:function(){this.symbolTypes={};this.sldManager=new Styler.SLDManager(this.map);this.getFeatureControl.activate();this.setCurrentLayer(this.currentLayer);this.on({"ruleadded":function(){this.refreshLegend();this.refreshFeatureDlg();},"ruleremoved":function(){this.refreshLegend();this.refreshFeatureDlg();},"ruleupdated":function(){this.refreshLegend();this.refreshFeatureDlg();},"layerchanged":function(layer){this.showLegend(layer);},scope:this});this.showLegend(this.currentLayer);},changeLayer:function(node){if(this.currentLayer!=node.layer){this.setCurrentLayer(node.layer);}},setCurrentLayer:function(layer){if(layer!=this.currentLayer){var extent=this.map.getExtent();if(!extent||!layer.maxExtent.containsLonLat(extent.getCenterLonLat())){this.map.zoomToExtent(layer.maxExtent);}
this.currentLayer=layer;if(this.ruleDlg){this.ruleDlg.destroy();delete this.ruleDlg;}
if(this.featureDlg){this.featureDlg.destroy();delete this.featureDlg;}
this.checkCurrentLayerNode();this.fireEvent("layerchanged",this.currentLayer);}
if(layer.getVisibility()===false){layer.setVisibility(true);}
if(this.getFeatureControl.active){this.getFeatureControl.protocol=OpenLayers.Protocol.WFS.fromWMSLayer(layer,{url:"../../../geoserver/ows",geometryName:this.schemaManager.getGeometryName(layer)});}},getRules:function(layer,callback){var rules;var style=this.sldManager.getStyle(layer);if(style){callback.call(this,style.rules);}else{this.sldManager.loadSld(layer,layer.params["STYLES"],function(result){callback.call(this,result.style.rules);}.createDelegate(this));}},showLegend:function(layer){this.removeLegend();this.legendContainer.setTitle("Legend: "+layer.name);var mask=new Ext.LoadMask(this.legendContainer.getEl(),{msg:"Loading ...",removeMask:true});mask.show();Styler.dispatch([function(done,context){this.getSymbolType(layer,function(type){context.symbolType=type;done();});},function(done,context){this.getRules(layer,function(rules){context.rules=rules;done();});}],function(context){if(layer===this.currentLayer){mask.hide();this.addLegend(layer,context.rules,context.symbolType);}},this);},addLegend:function(layer,rules,type){var deleteButton=this.getDeleteButton();var legend=new GeoExt.VectorLegend({rules:rules,symbolType:type,enableDD:false,style:{padding:"10px"},selectOnClick:true,currentScaleDenominator:this.map.getScale(),listeners:{"ruleselected":function(panel,rule){this.showRule(this.currentLayer,rule,panel.symbolType);deleteButton.enable();},"ruleunselected":function(panel,rule){deleteButton.disable();},"rulemoved":function(panel,rule){legend.disable();this.sldManager.saveSld(this.currentLayer,function(){legend.enable();this.repaint();},this);},scope:this}});this.legendContainer.add(legend);this.legendContainer.doLayout();this.getAddButton().enable();},removeLegend:function(){var old=this.getLegend();if(old){this.getAddButton().disable();this.legendContainer.remove(old);}},setLegendScale:function(){var legend=this.getLegend();if(legend&&legend.setCurrentScaleDenominator){legend.setCurrentScaleDenominator(this.map.getScale());}},refreshLegend:function(){var legend=this.getLegend();if(legend){legend.update();}},refreshFeatureDlg:function(){if(this.featureDlg&&!this.featureDlg.hidden){var feature=this.featureDlg.getFeature();this.showFeatureInfo(this.currentLayer,feature);}},setSymbolType:function(layer,type){this.symbolTypes[layer.id]=type;return type;},getSymbolTypeFromFeature:function(feature){return feature.geometry.CLASS_NAME.replace(/OpenLayers\.Geometry\.(Multi)?|String/g,"");},getSymbolType:function(layer,callback){var type=this.symbolTypes[layer.id];if(type){callback.call(this,type);}else{type=this.schemaManager.getSymbolType(layer);if(type){this.setSymbolType(layer,type);callback.call(this,type);}else{this.getOneFeature(layer,function(features){type=this.setSymbolType(layer,this.getSymbolTypeFromFeature(features[0]));callback.call(this,type);});}}},showFeatureInfo:function(layer,feature){if(this.featureDlg){this.featureDlg.destroy();}
this.getRules(layer,function(rules){this.displayFeatureDlg(layer,feature,rules);});},displayFeatureDlg:function(layer,feature,rules){feature.layer=layer;var matchingRules=[];var rule;for(var i=0;i<rules.length;++i){rule=rules[i];if(rule.evaluate(feature)){matchingRules.push(rule);}}
this.featureDlg=new Ext.Window({title:"Feature: "+feature.fid||feature.id,layout:"fit",resizable:false,width:220,x:this.windowPositions.featureDlg.x,y:this.windowPositions.featureDlg.y,items:[{hideBorders:true,border:false,autoHeight:true,items:[{xtype:"gx_vectorlegend",title:"Rules used to render this feature:",bodyStyle:{paddingLeft:"5px"},symbolType:this.getSymbolTypeFromFeature(feature),rules:matchingRules,clickableSymbol:true,listeners:{"symbolclick":function(panel,rule){this.showRule(this.currentLayer,rule,panel.symbolType);},scope:this}},{xtype:"propertygrid",title:"Attributes of this feature:",height:120,source:feature.attributes,autoScroll:true,listeners:{"beforepropertychange":function(){return false;}}}]}],listeners:{"move":function(cp,x,y){this.windowPositions["featureDlg"]={x:x,y:y};},scope:this},getFeature:function(){return feature}});this.featureDlg.show();},showRule:function(layer,rule,symbolType,closeCallback){var newRule=rule.clone();if(this.ruleDlg){this.ruleDlg.destroy();}
this.ruleDlg=new Ext.Window({title:"Style: "+(rule.title||rule.name||"Untitled"),layout:"fit",x:this.windowPositions.ruleDlg.x,y:this.windowPositions.ruleDlg.y,width:315,constrainHeader:true,items:[{xtype:"gx_rulepanel",autoHeight:false,autoScroll:true,rule:newRule,symbolType:symbolType,fonts:this.fonts,nestedFilters:false,scaleLevels:this.map.baseLayer.numZoomLevels,minScaleDenominatorLimit:OpenLayers.Util.getScaleFromResolution(this.map.baseLayer.resolutions[this.map.baseLayer.numZoomLevels-1],this.map.units),maxScaleDenominatorLimit:OpenLayers.Util.getScaleFromResolution(this.map.baseLayer.resolutions[0],this.map.units),scaleSliderTemplate:"<div>{scaleType} Zoom Level: {zoom}</div>"+"<div>Current Map Zoom: {mapZoom}</div>",modifyScaleTipContext:(function(panel,data){data.mapZoom=this.map.getZoom();}).createDelegate(this),attributes:new GeoExt.data.AttributeStore({url:"../../../geoserver/wfs?",baseParams:{version:"1.1.1",request:"DescribeFeatureType",typename:layer.params["LAYERS"]},ignore:{name:this.schemaManager.getGeometryName(layer)}}),pointGraphics:[{display:"circle",value:"circle",mark:true,preview:"theme/img/circle.gif"},{display:"square",value:"square",mark:true,preview:"theme/img/square.gif"},{display:"triangle",value:"triangle",mark:true,preview:"theme/img/triangle.gif"},{display:"star",value:"star",mark:true,preview:"theme/img/star.gif"},{display:"cross",value:"cross",mark:true,preview:"theme/img/cross.gif"},{display:"x",value:"x",mark:true,preview:"theme/img/x.gif"},{display:"custom..."}]}],bbar:["->",{text:"cancel",iconCls:"cancel",handler:function(){this.ruleDlg.close();},scope:this},{text:"save",iconCls:"save",handler:function(){this.saving=true;this.ruleDlg.disable();this.updateRule(rule,newRule);this.sldManager.saveSld(layer,function(){this.ruleDlg.close();this.repaint();this.saving=false;},this);},scope:this}],listeners:{close:function(){this.getLegend().unselect();if(closeCallback){closeCallback.call(this);}},move:function(cp,x,y){this.windowPositions["ruleDlg"]={x:x,y:y};},scope:this}});this.ruleDlg.show();},updateRule:function(rule,newRule){rule.title=newRule.title;rule.symbolizers=newRule.symbolizers;rule.filter=newRule.filter;rule.minScaleDenominator=newRule.minScaleDenominator;rule.maxScaleDenominator=newRule.maxScaleDenominator;this.fireEvent("ruleupdated",rule);},repaint:function(){this.currentLayer.redraw(true);},getOneFeature:function(layer,callback){Ext.Ajax.request({url:"../../../geoserver/wfs?",method:"GET",disableCaching:false,params:{version:"1.0.0",request:"GetFeature",typeName:layer.params["LAYERS"],maxFeatures:"1"},success:function(response){var features=new OpenLayers.Format.GML().read(response.responseXML||response.responseText);if(features.length){callback.call(this,features);}else{throw("Could not load features from the WFS");}},failure:function(response){throw("Could not load features from the WFS");},scope:this});},getLegend:function(){return!!this.legendContainer.items.length&&this.legendContainer.getComponent(0);},getAddButton:function(){return this.legendContainer.getBottomToolbar().items.get(0);},getDeleteButton:function(){return this.legendContainer.getBottomToolbar().items.get(1);}});OpenLayers.DOTS_PER_INCH=25.4/0.28;Ext.namespace("Styler");Styler.ColorManager=function(config){Ext.apply(this,config);};Ext.apply(Styler.ColorManager.prototype,{field:null,init:function(field){this.register(field);},destroy:function(){if(this.field){this.unregister(this.field);}},register:function(field){if(this.field){this.unregister(this.field);}
this.field=field;field.on({focus:this.fieldFocus,destroy:this.destroy,scope:this});},unregister:function(field){field.un("focus",this.fieldFocus,this);field.un("destroy",this.destroy,this);if(Styler.ColorManager.picker&&field==this.field){Styler.ColorManager.picker.un("pickcolor",this.setFieldValue,this);}
this.field=null;},fieldFocus:function(field){if(!Styler.ColorManager.pickerWin){Styler.ColorManager.picker=new Ext.ux.ColorPanel({hidePanel:false,autoHeight:false});Styler.ColorManager.pickerWin=new Ext.Window({title:"Color Picker",layout:"fit",closeAction:"hide",width:405,height:300,plain:true,items:Styler.ColorManager.picker});}
Styler.ColorManager.picker.purgeListeners();this.setPickerValue();Styler.ColorManager.picker.on({pickcolor:this.setFieldValue,scope:this});Styler.ColorManager.pickerWin.show();},setFieldValue:function(picker,color){if(this.field.isVisible()){this.field.setValue("#"+color);}},setPickerValue:function(){var field=this.field;var hex=field.getHexValue?field.getHexValue():field.getValue();if(hex){Styler.ColorManager.picker.setColor(hex.substring(1));}}});Styler.ColorManager.picker=null;Styler.ColorManager.pickerWin=null;Ext.namespace("Styler");Styler.dispatch=function(functions,complete,scope){var requests=functions.length;var responses=0;var storage={};function respond(){++responses;if(responses===requests){complete.call(scope,storage);}}
function trigger(index){window.setTimeout(function(){functions[index].apply(scope,[respond,storage]);});}
for(var i=0;i<requests;++i){trigger(i);}};Styler.SchemaManager=OpenLayers.Class({map:null,attributeStores:null,matchGeomProperty:/^gml:(Multi)?(Point|LineString|Polygon|Curve|Surface|Geometry)PropertyType$/,initialize:function(map){this.map=map;this.attributeStores={};var layer;for(var i=0;i<this.map.layers.length;++i){layer=this.map.layers[i];if(layer instanceof OpenLayers.Layer.WMS){this.attributeStores[layer.id]=new GeoExt.data.AttributeStore({url:layer.url.split("?")[0].replace("/wms","/wfs"),baseParams:{version:"1.1.1",request:"DescribeFeatureType",typename:layer.params["LAYERS"]}});}}},loadAll:function(callback){var loaders=[];for(var id in this.attributeStores){loaders.push(this.createLoader(this.attributeStores[id]));}
Styler.dispatch(loaders,callback);},createLoader:function(store){return function(done){store.load({callback:done});};},getGeometryName:function(layer){var store=this.attributeStores[layer.id];var index=store.find("type",this.matchGeomProperty);var name;if(index>-1){name=store.getAt(index).get("name");}
return name;},getSymbolType:function(layer){var store=this.attributeStores[layer.id];var index=store.find("type",this.matchGeomProperty);var type;if(index>-1){var match=store.getAt(index).get("type").match(this.matchGeomProperty);type=({"Point":"Point","LineString":"Line","Polygon":"Polygon","Curve":"Line","Surface":"Polygon"})[match[2]];}
return type;}});OpenLayers.Renderer.defaultSymbolizer={fillColor:"#808080",fillOpacity:1,strokeColor:"#000000",strokeOpacity:1,strokeWidth:1,strokeDashstyle:"solid",pointRadius:3,graphicName:"square",fontSize:10,fontColor:"#000000",haloColor:"#FFFFFF",haloOpacity:1,haloRadius:1};OpenLayers.Format.SLD.v1.prototype.readers.sld["VendorOption"]=function(node,obj){if(!obj.vendorOptions){obj.vendorOptions=[];}
obj.vendorOptions.push({name:node.getAttribute("name"),value:this.getChildValue(node)});};OpenLayers.Format.SLD.v1.prototype.writers.sld["VendorOption"]=function(option){return this.createElementNSPlus("sld:VendorOption",{attributes:{name:option.name},value:option.value});};OpenLayers.Format.SLD.v1.prototype.readers.sld["Priority"]=function(node,obj){obj.priority=this.readOgcExpression(node);};OpenLayers.Format.SLD.v1.prototype.writers.sld["Priority"]=function(priority){var node=this.createElementNSPlus("sld:Priority");this.writeNode("ogc:Literal",priority,node);return node;};(function(){var writers=OpenLayers.Format.SLD.v1.prototype.writers.sld;var original;original=writers.TextSymbolizer;writers.TextSymbolizer=(function(original){return function(symbolizer){var node=original.apply(this,arguments);if(symbolizer.externalGraphic||symbolizer.graphicName){this.writeNode("Graphic",symbolizer,node);}
if("priority"in symbolizer){this.writeNode("Priority",symbolizer.priority,node);}
return node;};})(original);var modify=["PointSymbolizer","LineSymbolizer","PolygonSymbolizer","TextSymbolizer"];var name;for(var i=0,ii=modify.length;i<ii;++i){name=modify[i];original=writers[name];writers[name]=(function(original){return function(symbolizer){var node=original.apply(this,arguments);var options=symbolizer.vendorOptions;if(options){for(var i=0,ii=options.length;i<ii;++i){this.writeNode("VendorOption",options[i],node);}}
return node;}})(original);}})();Styler.SLDManager=OpenLayers.Class({map:null,layerData:null,initialize:function(map){this.map=map;var layer;this.layers=[];this.layerData={};this.format=new OpenLayers.Format.SLD({multipleSymbolizers:true});for(var i=0;i<this.map.layers.length;++i){layer=this.map.layers[i];if(layer instanceof OpenLayers.Layer.WMS){this.layers.push(layer);}}},loadAll:function(callback){var num=this.layers.length;var loaders=new Array(num);for(var i=0;i<num;++i){loaders[i]=this.createLoader(this.layers[i]);}
Styler.dispatch(loaders,callback);},createLoader:function(layer){return(function(done){this.loadSld(layer,layer.params["STYLES"],done);}).createDelegate(this);},getUrl:function(layer,styleName){var url;if(layer instanceof OpenLayers.Layer.WMS){url=layer.url.split("?")[0].replace("/wms","/rest/styles/"+styleName+".sld");}
return url;},loadSld:function(layer,styleName,callback){Ext.Ajax.request({url:this.getUrl(layer,styleName),method:"GET",success:function(request){var sld=this.format.read(request.responseXML.documentElement?request.responseXML:request.responseText);for(var namedLayer in sld.namedLayers){break;}
this.layerData[layer.id]={style:sld.namedLayers[namedLayer].userStyles[0],sld:sld,styleName:styleName};callback(this.layerData[layer.id]);},scope:this});},saveSld:function(layer,callback,scope){Ext.Ajax.request({url:this.getUrl(layer,this.layerData[layer.id].styleName),method:"PUT",headers:{"Content-Type":"application/vnd.ogc.sld+xml; charset=UTF-8"},xmlData:this.format.write(this.layerData[layer.id].sld),success:function(request){callback.call(scope||this,request);}});},getStyle:function(layer){var data=this.layerData[layer.id];return data&&data.style;}});