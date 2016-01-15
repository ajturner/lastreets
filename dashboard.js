var maps = [];
var cards = [];
var charts = []
$(function(){ 

    $(".gridster ul").gridster({
        widget_margins: [5, 5],
        widget_base_dimensions: [140, 140],
        extra_rows: 10,
        autogrow_cols: true,
        resize: {
        	enabled: false,
        	resize: function() {  charts.forEach(function(card) { card.update() }) },
        	stop: function() {  charts.forEach(function(card) {  card.update() }) }
        }
    });

    function addMapLayer(layer) {
		var newLayer = L.esri.featureLayer({
			url: layer.url,
			simplifyFactor: 0.35,
    		precision: 5,
			style: function () {
			  return { color: "#70ca49", weight: 1 };
			}
		})
		newLayer.on('mouseout', function(e){
		    document.getElementById('filters').innerHTML = 'Click to Filter';
		    // newLayer.resetFeatureStyle(oldId);
		    newLayer.setFeatureStyle(e.layer.feature.id, {
		      color: '#888',
		      weight: 1
		    });
		  });

		  newLayer.on('mouseover', function(e){
		    document.getElementById('filters').innerHTML = e.layer.feature.properties.NAME;
	        e.layer.bringToFront();
		    newLayer.setFeatureStyle(e.layer.feature.id, {
		      color: '#9D78D2',
		      weight: 3
		    });
		  });		
		newLayer.setStyle(function(feature){
			var color = "#BBB";
			switch( feature.properties.STATUS_2) {
				case "Good":
					color = "#00FF00";
					break;
				case "Poor":
					color = "#FF0000";
					break;					
				case "Fair":
					color = "#FF00FF";
					break;
				case "Other":
					color = "#888";
					break;
			}
		  return {
		    color: color,
		    fillOpacity: 0.1,
		    weight: 1
		  };
		})
		newLayer.addTo(maps[0]);    	
		newLayer.bindPopup(function(feature){
			filterCharts(feature.feature)
		});		
    }
    function filterCharts(feature) {
    	var queryGeometry = {rings: feature.geometry.coordinates};
    	document.getElementById("filters").innerHTML = "Filtered by " + feature.properties["NAME"];
    	charts.forEach(function(chart) {
    		// chart.dataset.query.where = ""
			chart.dataset.query.geometry = queryGeometry
    		chart.dataset.query.geometryType = "esriGeometryPolygon"
    		chart.dataset.query.inSR="4326"
    		chart.dataset.query.spatialRel="esriSpatialRelContains"
    		chart.update();
    	})
    }
    function itemUrl(webmapId, format) {
    	var url = "https://www.arcgis.com/sharing/rest/content/items/" + webmapId
    	if(format === undefined || format === null || format == true) {
			url += "?f=json";	
    	} 
		return url
    }
	function webmapUrl(webmapId) {
		return itemUrl(webmapId, false) + "/data?f=json";
    }
    function gistUrl(webmapId) {
		return "https://gist.githubusercontent.com/ajturner/" + webmapId + "/raw/webmap.json";
    }    

	function getParameterByName(name) {
		name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
		var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
		    results = regex.exec(location.search);
		return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
	}
	function getItem(itemId, cb) {
		Cedar.getJson( itemUrl(itemId), cb )
	}
	function getWebmap(itemId, cb) {
		Cedar.getJson(webmapUrl(itemId), cb)
	}
	function zoomMap(map,extent) {
		var bounds = [[extent[0][1],extent[0][0]],[extent[1][1],extent[1][0]]];
		map.fitBounds(bounds).setMaxBounds(bounds);
	}
	function buildMap(err,design) {
		design.operationalLayers.forEach(function(layer) {
			addMapLayer(layer);
		});
	}
	function addMetric(card, index) {
		Cedar.getJson(Cedar._createFeatureServiceRequest(card.style.dataset, card.style.dataset.query), function(err,data){ 
			var value = data.features[0].attributes[card.style.dataset.query.outStatistics[0].outStatisticFieldName];
			document.getElementById("chart" + index).innerHTML = value;
		});
	}	
	function addChart(card, index) {
		var chart = new Cedar(card.style);
	
		charts.push(chart)
		chart.on('update-start', function(err,data) {
			document.getElementById("chart"+index).style.opacity = 0.2;
		});
		chart.on('update-end', function(err,data) {
			document.getElementById("chart"+index).style.opacity = 1.0;
		});
		chart.show({
			elementId: "#chart" + index,
			height2: 200
		});    			
	}
    function addMap(card, index) {
		var map = L.map("chart" + index, {scrollWheelZoom: false}).setView([45.528, -122.680], 13);
		maps.push(map);
		L.esri.basemapLayer("DarkGray").addTo(map);
		getItem(card.style.item, function(err,data) { 
			zoomMap(map, data.extent)
			getWebmap( card.style.item, buildMap )
		})
    }	
    function buildFunction(cardType) {
    	switch(cardType) {
    		case "chart":
    			return addChart;
    			break;
			case "metric":
				return addMetric;
				break;
			case "map":
				return addMap;
				break;
    	}
    }    
    function addCard(card, gridster) {
		cards.push(card)
		var index = cards.length;

    	gridster.add_widget(
    		'<li class="widget cedar-' + card.type +'"><h3 id="chart-title-' + index + '">' + card.title + '</h3><div class="cedar-value ' + card.type + '" id="chart' + index + '" class="chart"></div></li>',
    		card.width, card.height, card.x, card.y);

    	buildFunction(card.type)(card,index);
    }

    function buildCards(dashboard) {
    	var gridster = $(".gridster ul").gridster().data('gridster');

    	dashboard.cards.forEach(function(card) {
    		addCard(card, gridster);
    	});
    }

    var configUrl = 'dashboard_streets.json';
    Cedar.getJson(configUrl, function(err,data) {
    	buildCards(data);	
    })
    addMap();
    
});