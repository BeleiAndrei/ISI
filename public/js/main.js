require([
    "dojo/parser",
    "dojo/ready",
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "dojo/dom",
    "esri/map",
    "esri/urlUtils",
    "esri/arcgis/utils",
    "esri/dijit/Legend",
    "esri/dijit/Scalebar",
    'esri/graphic',
    'esri/symbols/SimpleMarkerSymbol',
    "esri/symbols/SimpleLineSymbol",
    'esri/Color',
    'dojo/request',
    'esri/geometry/Point',
    "dojo/domReady!"
], function (
    parser,
    ready,
    BorderContainer,
    ContentPane,
    dom,
    Map,
    urlUtils,
    arcgisUtils,
    Legend,
    Scalebar,
    Graphic,
    SimpleMarkerSymbol,
    SimpleLineSymbol,
    Color,
    request,
    Point
) {
    ready(function () {

        var map = null;
        var description = null;
        var latitude = 45.4353208;
        var longitude = 28.0079945;
        var submitted = false;
        let lastPoint = null,
            point = null,
            lastClickedPoint = null;
        var issues = [];
        let hotspots = [];
        let incidents = [];
        var limits = [];
        var allPoints = [];

        parser.parse();

        //if accessing webmap from a portal outside of ArcGIS Online, uncomment and replace path with portal URL
        //arcgisUtils.arcgisUrl = "https://pathto/portal/sharing/content/items";
        arcgisUtils.createMap("81138e27937b44d1a5b009fa63f2233c", "map", {
            mapOptions: {
                center: [28.0079945, 45.4353208],
                zoom:13
            }}).then(function (response) {
            //update the app
            dom.byId("title").innerHTML = response.itemInfo.item.title;
            dom.byId("subtitle").innerHTML = response.itemInfo.item.snippet;

            map = response.map;

            //add the scalebar
            var scalebar = new Scalebar({
                map: map,
                scalebarUnit: "english"
            });

            //add the legend. Note that we use the utility method getLegendLayers to get
            //the layers to display in the legend from the createMap response.

            var legendLayers = arcgisUtils.getLegendLayers(response);
            var legendDijit = new Legend({
                map: map,
                layerInfos: legendLayers
            }, "legend");
            
            legendDijit.startup();

            request.get("/hotspots", {
                handleAs: "json"
            }).then(function(dataLocations) {
                for (let i = 0; i < dataLocations.length; i++) {
                    hotspots.push(dataLocations[i]);
                }
                console.log("Hotspots: ", dataLocations)
            })

            handleMapExtraActions(map);
            displayAllIncidents();
        });

        var symbol = new SimpleMarkerSymbol(
            SimpleMarkerSymbol.STYLE_CIRCLE,
            12,
            new SimpleLineSymbol(
                SimpleLineSymbol.STYLE_NULL,
                new Color([247, 34, 101, 0.9]),
                1
            ),
            new Color([207, 34, 171, 0.5])
        );

        function handleMapExtraActions(map) {

            var myPoint = new Point(28.0079945, 45.4353208);
            var symbol0 = new SimpleMarkerSymbol().setColor(new Color('blue'));
            var graphic = new Graphic(myPoint, symbol0);
            map.graphics.add(graphic);
            limits.push({name: "Semlac", longitude: 21.108430175781148, latitude: 46.27374974057721});

            myPoint = new Point(22.352631835936794, 46.00922633069789);
            symbol0 = new SimpleMarkerSymbol().setColor(new Color('blue'));
            graphic = new Graphic(myPoint, symbol0);
            map.graphics.add(graphic);
            limits.push({name: "Petris", longitude: 22.352631835936794, latitude: 46.00922633069789});

            toggleNitrateLayer();
            toggleCatchmentLayer();
            toggleRefinedLayer();

            map.on("click", function(evt){

                latitude = evt.mapPoint.getLatitude();
                longitude = evt.mapPoint.getLongitude();
                //console.log(latitude);
                lastPoint = new Graphic(evt.mapPoint, symbol);

                /* For checking not to interfere with existing points */
                var layerCircles = $(".esriMapContainer circle");
                var isInFirstLayer = layerCircles.filter(function(k, v) {return v === evt.target;}).length;

                var customLayer = $("#map_graphics_layer circle");
                var isInCustomLayer = customLayer.filter(function(k, v) {return v === evt.target;}).length;

                if (!isInFirstLayer) {

                    if (!isAuthenticated()) return;
                    var form = "<b>Latitude: </b>" + latitude + 
                               "<br><br> <b>Longitude: </b>" + longitude + 
                               "<br><br><form id='add_point'> "+
                                    "Describe issue:<br>" + 
                                        "<input type=" + "'text'" + "class='add_issue add_description'" + "name=" + "'describe'" + "><br><br>" +
                                    "PM10 level:<br>" +
                                        "<input type=" + "'text'" + "class='add_issue add_pm10'" + "name=" + "'pm10'" + "><br><br>" + 
                                    "SO2 level:<br>" +
                                        "<input type=" + "'text'" + "class='add_issue add_so2'" + "name=" + "'so2'" + "><br><br>" + 
                                    "O3 level:<br>" +
                                        "<input type=" + "'text'" + "class='add_issue add_o3'" + "name=" + "'o3'" + "><br><br>" + 
                                    "NO2 level:<br>" +
                                        "<input type=" + "'text'" + "class='add_issue add_no2'" + "name=" + "'no2'" + ">" + 
                                    "<br><br><input type=" + "'submit'" + " class='submit-incident' value=" + "'Submit'" + ">" + 
                               "</form> ";

                    map.infoWindow.setContent(form);
                    if (!isHotspot(latitude, longitude)) {
                        map.infoWindow.show(evt.mapPoint);
                    }
                }

                var customLayer = $("#map_graphics_layer circle");
                var isInCustomLayer = customLayer.filter(function(k, v) {return v === evt.target;}).length;
                if (isInCustomLayer) {
                    var ok = false;
                    var i = 0;
                    for (i = 0; i < incidents.length; i++) {
                        if((incidents[i].Latitude <= (latitude + 0.003) && incidents[i].Latitude >= (latitude - 0.003))
                            && (incidents[i].Longitude <= (longitude + 0.003) && incidents[i].Longitude >= (longitude - 0.003))) {
                            ok = true;
                            break;
                        }
                    }

                    var form = null;
                    if (ok === true) {

                        var isAdmin = $("#user_logout").data("isadmin");
                        var markAsSolvedButton = isAdmin ? "<button class='mark-as-solved btn btn-warning' data-id='" + incidents[i].ID +
                            "'>Mark as verified</button>" : "";

                        form =  "<b>Latitude: </b>" + incidents[i].Latitude + 
                                "<br><br> <b>Longitude: </b>" + incidents[i].Longitude +
                                "<br><br> <b>PM10 Level: </b>" + incidents[i].PM10 +
                                "<br><br> <b>SO2 Level: </b>" + incidents[i].SO2 + 
                                "<br><br> <b>O3 Level: </b>" + incidents[i].O3 +
                                "<br><br> <b>NO2 Level: </b>" + incidents[i].NO2 +
                                "<br><br>  <b>Reporter: </b>" + incidents[i].Name + "</b>" +
                                "<br><br>  <b>Issue Description: </b>" + incidents[i].Description + "</b>" +
                                "<br><br> <b>Added: </b>" + incidents[i].Timestamp+ "</b><br>" + markAsSolvedButton;

                        lastClickedPoint = evt.target;
                    } else if((limits[0].latitude <= (latitude + 0.013) && limits[0].latitude >= (latitude - 0.013))
                        && (limits[0].longitude <= (longitude + 0.013) && limits[0].longitude >= (longitude - 0.013)))
                    {
                        form = "<b>Latitude: </b>" + limits[0].latitude + "<br><br> <b>Longitude: </b>" + limits[0].longitude + "<br><br>  <b><u>Location:</u> </b><i>" + limits[0].name + "</i></b>";
                    } else if((limits[1].latitude <= (latitude + 0.013) && limits[1].latitude >= (latitude - 0.013))
                        && (limits[1].longitude <= (longitude + 0.013) && limits[1].longitude >= (longitude - 0.013)))
                    {
                        form = "<b>Latitude: </b>" + limits[1].latitude + "<br><br> <b>Longitude: </b>" + limits[1].longitude + "<br><br>  <b><u>Location:</u> </b><i>" + limits[1].name + "</i></b>";
                    }

                    map.infoWindow.setContent(form);
                    if (!isHotspot(latitude, longitude)) {
                        map.infoWindow.show(evt.mapPoint);
                    }
                }
            });
        }

        $(document).on("click", ".submit-incident", function(e) {
            e.preventDefault();

            description = $('.add_description').val();
            pm10 = $('.add_pm10').val();
            so2 = $('.add_so2').val();
            o3 = $('.add_o3').val();
            no2 = $('.add_no2').val();

            request.post("/incidents", {
                data: {
                    description: description,
                    longitude: longitude,
                    latitude: latitude,
                    pm10: pm10,
                    so2: so2,
                    o3: o3,
                    no2: no2
                }
            }).then(function(text){
                incidents.push({
                    Description: description,
                    Longitude: longitude,
                    Latitude: latitude,
                    PM10: pm10,
                    SO2: so2,
                    O3: o3,
                    NO2: no2,
                    Name: $("#user_logout").data("username")
                });

                map.graphics.add(lastPoint);
                allPoints.push(lastPoint);
                map.infoWindow.hide();
            });
        });

        $(document).on("click", ".mark-as-solved", function(e) {
            let $el = $(e.target);
            let id = $el.data("id");

            request.post("/solve", {
                data: {
                    id: id
                }
            }).then(function(){

                map.graphics.remove(lastClickedPoint);
                $(lastClickedPoint).remove();
                lastClickedPoint = null;

                $(".esriPopup.esriPopupVisible").removeClass("esriPopupVisible").addClass("esriPopupHidden");
            });
        });

        function isHotspot(longitude, latitude) {
            let isHotspot = false;
            let radius = 0.025;
            for (let i = 0; i < hotspots.length; i++) {
                if((latitude <= (hotspots[i].latitude + radius) && latitude >= (hotspots[i].latitude - radius))
                            && (longitude <= (hotspots[i].longitude + radius) && longitude >= (hotspots[i].longitude - radius))) {
                    
                }
            }
            return isHotspot;
        }

        function toggleNitrateLayer() {

            $("#legend_csv_9245_0_fc_csv_9245_0").click(function () {

                hideAll();
                $("#csv_9245_0_layer").css("display", "block");
            });
        }

        function toggleCatchmentLayer() {

            $("#legend_csv_565_0_fc_csv_565_0").click(function () {

                hideAll();
                $("#csv_565_0_layer").css("display", "block");
            });
        }

        function toggleRefinedLayer() {

            $("#legend_csv_5278_0_fc_csv_5278_0").click(function () {

                hideAll();
                $($("#map_defaultBasemap").next()[0]).css("display", "block")
            });

        }

        function hideAll() {
            $($("#map_defaultBasemap").next()[0]).css("display", "none");
            $("#csv_565_0_layer").css("display", "none");
            $("#csv_9245_0_layer").css("display", "none");
        }

        function displayAllIncidents() {
            request.get("/incidents", {
                handleAs: "json"
            }).then(function(data){
                
                let incidentPoint;
                data.map(function(entry) {
                    let pollutionLevel = (entry.PM10 + entry.SO2 + entry.O3 + entry.NO2) / 4;
                    let redValue = (255 * (pollutionLevel / 10)) % 255;
                    let greenValue = 255 - redValue;
                    incidentPoint = new Point(entry.Longitude, entry.Latitude);
                    var symbol = new SimpleMarkerSymbol().setColor(new Color([redValue, greenValue, 0, 1]));
                    var graphic = new Graphic(incidentPoint, symbol);
                    map.graphics.add(graphic);
                    incidents.push(entry);
                    allPoints.push(graphic);
                });
            });
        }

        function isAuthenticated() {
            return $("#user_logout").length;
        }
    });

});

(function () {
    var login = new Login();
    var register = new Register();
    login.initialize();
    register.initialize();


    $("#user_logout").on("click", function(e) {
        $.ajax({
            url: "logout",
            method: "POST",
            success: _.bind(function() {
                $(".invalid-data").addClass("hidden");

                window.location.reload();

            }, this),
            error: function(res, err) {
                console.log("Fail logout");
            }
        });
    });
})($);