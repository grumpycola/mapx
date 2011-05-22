/*
 * Copyright (c) 2011  renardi[at]rdacorp[dot]com  (http://mobile.rdacorp.com)
 * Licensed under the MIT License
 * 
 * This is sample demo of Google Map, Twitter Search, Backbone framework 
 *
 */
$(function(){

	var NewYorkLocation = new google.maps.LatLng( 40.69847032728747, -73.9514422416687 );

	function getTweetUrl( position, radius ) {
		return "http://search.twitter.com/search.json?geocode=" + position.lat() + "," + position.lng() + "," + radius + "mi&callback=?";
	}
	
	//----------------------------------------
	
	var AppData = Backbone.Model.extend({
		defaults: {
			location: NewYorkLocation,
			radius: 10,  // default to 10 miles
			centered: false
		}
	});

	//----------------------------------------

	var MapView = {
		map: null, 
		model: null, 
		markers: [], 
		geocoder: new google.maps.Geocoder(),

		setup: function( options ) {
			// init model
			this.model = options.model;
			// bind following methods to context of this obj
			_.bindAll(this, 'render', 'query');
			// get current location
			var position = this.model.get("location");
			// create the map
			var opts = {
				zoom: 8,
				center: position,
				mapTypeId: google.maps.MapTypeId.ROADMAP
			};
			this.map = new google.maps.Map(document.getElementById("map-canvas"), opts);
			// bind any model changes
			this.model.bind('change', this.render);
			// additional behaviors
			var self = this;
			// - bind the map click event
			google.maps.event.addListener(this.map, 'click', function(event) {
				self.model.set({"location": event.latLng, "centered": false});
			});		
			//
			this.render();
			// done
			return this;
		},
				
		render: function() {
			// clear previous markers/overlays
			_.each(this.markers, function(item) {
				item.setMap(null);
			});
			this.markers.length = 0;
			this.markers = [];
			// get current parameters
			var position = this.model.get("location"),
			    radius = this.model.get("radius"),
				centered = this.model.get("centered");
			// add a new marker
			var marker = new google.maps.Marker({
				position: position, 
				map: this.map,
				animation: google.maps.Animation.DROP,	
				title: position.lat() + "," + position.lng()
			});
			this.markers.push(marker);
			// draw new circle
			var circle = new google.maps.Circle({
				strokeColor: "#FF0000",
				strokeOpacity: 0.8,
				strokeWeight: 2,
				fillColor: "#FF0000",
				fillOpacity: 0.35,				
				map: this.map,
				center: position,
				radius: radius * 1609.344   // miles to meters
			});					
			circle.bindTo('center', marker, 'position');
			this.markers.push(circle);
			// centered it when asked
			if (centered) { this.map.setCenter(position); }				
			return this;
		},
		
		query: function( address ) {
			var self = this;
			this.geocoder.geocode( {'address': address}, function(results, status) {
				if (status === "OK") {
					var position = results[0].geometry.location;
					if (position) {	
						self.model.set({"location": position, "centered": true});
					}
				} else {
					alert("Geocode was not successful for the following reason: " + status);
				}
			});		
		}

	};

	//----------------------------------------

	var TweetView = Backbone.View.extend({
		className: 'row',
		template: $('#tweet-template'),
		initialize: function() {
		  _.bindAll(this, 'render');
		},
		render: function() {
			$(this.el).html(this.template.mustache(this.model));
			return this;
		}
	});
	
	//----------------------------------------

	var PaneView = Backbone.View.extend({
		el: $('#pane-container'),
		
		events: {
			"click a.toggle": "toggle"
		},
		
		initialize: function() {
			_.bindAll(this, 'render', 'getScrollPane', 'toggle', 'renderTweets', 'renderAbout');
			// re-render if there is a change
			this.model.bind('change', this.render);
			// additional behaviours
			var self = this;			
			// - when window is resized, recalc pane
			$(window).resize(function() {
				self.getScrollPane().reinitialise();
			});
			// - when user modify the radius
			$('.editable').editable(function(value, settings) {
				// if not int, then return previous result
				if (value != parseInt(value, 10)) {
					return self.model.get("radius");
				}
				// updates with new values, and trigger render
				self.model.set({"radius": value, "centered": false});
				return (value);
			  }, { 
				type: 'text',
				submit: 'OK',
				width: '30px'
			});	
			//
			this.render();
			// done
			return this;
		},
		
		getScrollPane: function() {
			return $('.scroll-pane').jScrollPane({scrollbarWidth:3}).data('jsp');
		},
		
		render: function() {
			var self = this,
			    position = this.model.get("location"),
				radius = this.model.get("radius");
			// display the tweet pane
			$("#tweets").css({'display': 'block', 'height': '100%'});				
			// display the current location
			$("#current-location").html("Location: " + position.lat() + ", " + position.lng());
			// hide the rows
			$("#rows").slideUp('fast', function() {
				// get the data
				var url = getTweetUrl( position, radius );
                $.getJSON(url, function(data) {
					// clear 
					$("#rows").html('');
					// append each tweet
					if (data && data.results.length > 0) {
						var $rows = $("#rows");
						_.each(data.results, function(item) {
							var rowView = new TweetView({model: item});
							$(rowView.render().el).prependTo($rows);
						});
					} else {
						// show there are no tweets at this location
						$("#rows").html('<div class="row"><div class="thumb"></div><div class="details">There is no tweet at this location.</div><div>');
					}
					// show the results
					$('#rows').slideDown('fast', function() {
						// resize the scroll pane
						var pane = self.getScrollPane();
						pane.scrollTo(0,0);
						pane.reinitialise();
						// 
						$('#load').fadeOut('fast');
					});
				});
			});
			// show loading
			$("#load").remove();
			$("#rows-content").append('<span id="load">Loading....</span>');
			$("#load").fadeIn();
			//
			return this;
		},
		
		toggle: function() {
			var self = this;
			$('.toggle').fadeOut('fast');
			$('#pane-content').toggle(300, function() {
				$('.toggle').toggleClass("active"); 
				$('.toggle').fadeIn('fast');
				var pane = self.getScrollPane();
				pane.reinitialise();
			});
		},

		renderTweets: function() {
			$("#about").slideUp("fast", function() {
				$("#tweets").css({'display': 'block', 'height': '100%'});
				$("#tweets").slideDown("fast", function() { 
					$("#about").css('display', 'none');
				});
			});
		},
		
		renderAbout: function() {
			$("#tweets").slideToggle("fast", function() {
				$("#about").css('display', 'block');
				$("#about").slideDown("fast", function() { 
					$("#tweets").css('display', 'none');
				});
			});
		}
		
	
	});
	
	//----------------------------------------

	var HeaderView = Backbone.View.extend({
		el: $('header'),
		
		events: {
			"keypress #query-address": "query"
		},
		
		initialize: function() {
			_.bindAll(this, "query");
			return this;
		},

		query: function(e) {
			if (e.keyCode !== 13) { return; }
			e.preventDefault();
			var input = $('#query-address');
			var address = input.val();
			if (address) { 
				MapView.query( address ); 
			} else {
				input.val('');
			}
		}
	});
		
	//----------------------------------------

	
	var App = Backbone.Controller.extend({	
		appData: null, 
		paneView: null,
		headerView: null, 

	    routes: {
	        "":       "index",
			"tweets": "gotoTweets",
			"about":  "gotoAbout"
	    },
		
		initialize: function() {
			this.appData = new AppData();
			//
			MapView.setup({model: this.appData});
			this.headerView = new HeaderView({view: this});
			this.paneView = new PaneView({model: this.appData});
			// 
			return this;		
		},
		
	    index: function() {
			// display the current location
			var position = NewYorkLocation;
			if (navigator.geolocation) {
				navigator.geolocation.getCurrentPosition(function(position) {
					position = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
				});
			}
			this.appData.set({"location": position, "centered": true});
		},
		
		gotoTweets: function() {
			this.paneView.renderTweets();
		},
		
		gotoAbout: function() {
			this.paneView.renderAbout();
		}

	});

	//----------------------------------------
	
	var app = new App();
	Backbone.history.start();

});