require([
    'esri/map',
    'esri/geometry/Point',
    'esri/symbols/SimpleMarkerSymbol',
    'esri/Color',
    'esri/graphic',
    'dojo/request',
    "esri/InfoTemplate",
    "esri/symbols/SimpleLineSymbol",
    "esri/layers/CSVLayer",
    "esri/renderers/SimpleRenderer",
    'dojo/domReady!'
], function (Map, Point, SimpleMarkerSymbol, Color, Graphic, request, InfoTemplate, SimpleLineSymbol, CSVLayer, SimpleRenderer) {

    let lastPoint = null;
    var point = null;
    var stations = [];
    var stationss = [];
    var submitted = false;
    var locations  = [];
    var issues = [];

    var map = new Map("map", {
        center: [21.655, 46.075],
        zoom: 10,
        basemap: "streets"
    });

    /* CSV initializer */
    var csv = new CSVLayer("/csvs/Stations.csv", {});
    var orangeRed = new Color([238, 69, 0, 0.5]);
    var marker = new SimpleMarkerSymbol("solid", 15, null, orangeRed);
    var renderer = new SimpleRenderer(marker);
    csv.setRenderer(renderer);
    var template = new InfoTemplate(
        "${RecordReported}",
        "${WaterbaseID}",
        "${RiverName}",
        "${WaterBodyName}",
        "${CatchmentName}",
        "${Longitude}",
        "${Latitude}",
        "${CatchmentArea}",
        "${PH}",
        "${Salinity}",
        "${Depth}",
        "${Algae}",
        "${Nitrate}",
        "${RefinedOil}",
        "${Tss}",
        "${TDS}"
    );
    csv.setInfoTemplate(template);
    map.addLayer(csv);


    map.on('load', function () {
        var myPoint = new Point(20.92, 46.11);
        var symbol = new SimpleMarkerSymbol().setColor(new Color('blue'));
        var graphic = new Graphic(myPoint, symbol);
        map.graphics.add(graphic);

        locations.push(myPoint);

        myPoint = new Point(22.391111, 46.042222);
        symbol = new SimpleMarkerSymbol().setColor(new Color('blue'));
        graphic = new Graphic(myPoint, symbol);
        map.graphics.add(graphic);

        locations.push(myPoint);

        // drawStations();
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

    var description = null;
    var latitude = null;
    var longitude = null;

    map.on("click", function(evt){

        latitude = evt.mapPoint.getLatitude();
        longitude = evt.mapPoint.getLongitude();
        point = new Graphic(evt.mapPoint, symbol);


        /* For checking not to interfere with existing points */
        var layerCircles = $(".esriMapContainer circle");
        var isInFirstLayer = layerCircles.filter(function(k, v) {return v === evt.target;}).length;
        if (!isInFirstLayer) {
            map.graphics.add(point);

            var form = "<b>Latitude: </b>" + latitude + "<br><br> <b>Longitude: </b>" + longitude + "<br><br><form id='add_point'> Describe issue:<br><input type=" + "'text'" + "class='add_issue'" + "name=" + "'describe'" + "><br><br><input type=" + "'submit'" + " class='submit-incident' value=" + "'Submit'" + "></form> ";

            map.infoWindow.setContent(form);
            map.infoWindow.show(evt.mapPoint);

            if(!submitted)
                removeMapClickBullet();
            submitted = false;
        }
    });

    $(document).on("click", ".submit-incident", function(e) {
        e.preventDefault();

        description = $('.add_issue').val();
        $('.add_issue').val('');
        submitted = true;
        issues.push(point);

        map.graphics.add(point);
    });

    function removeMapClickBullet() {
        if (lastPoint) {
            map.graphics.remove(lastPoint);
        }

        lastPoint = point;
    }

    function drawStations() {
        request("/stations").then(
            function(data){
                var jsonData = JSON.parse(data);
                stations = jsonData;

                _.map(jsonData, function(item) {
                    var myPoint = new Point(item.Longitude, item.Latitude);
                    var symbol = new SimpleMarkerSymbol().setColor(new Color('green'));
                    var graphic = new Graphic(myPoint, symbol);
                    map.graphics.add(graphic);
                    stationss.push(myPoint);
                });
            },
            function(error){
                console.log("An error occurred: " + error);
            }
        );
    }
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