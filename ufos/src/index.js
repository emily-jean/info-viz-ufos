
// globals
var projection = 0;
var path = 0;
var svg = 0;
var initialData = {};
var sightingsByYearCountData = [];
var intSightingsByYearCountData = {};
var components = [];
var sightings = d3.select(null);
var zoom = true;
var selectedYear = "";


var legend_labels = ["< 50", "50+", "150+", "250+"];
var colorDomain = [50, 150, 250];
var ext_color_domain = [0, 50, 150, 250]
var colorRange = ['#807dba', '#6a51a3', '#54278f', '#3f007d'];

// color for choropleth map and scatter plot
var color = d3.scaleThreshold()
    .domain(colorDomain)
    .range(colorRange);

var mapTooltip = d3.select("body").append("div")
    .attr("class", "tooltipMap")
    .style("opacity", 0);

var comments = d3.select("#comments").append("div")
    .attr("class", "comments");

//make the pie chart all grey
var colorScheme = [
    "#BFBFBF",
    "#BFBFBF",
    "#BFBFBF",
    "#BFBFBF",
    "#BFBFBF",
    "#BFBFBF",
    "#BFBFBF",
    "#BFBFBF",
    "#BFBFBF",
    "#BFBFBF",
    "#BFBFBF",
    "#BFBFBF",
    "#BFBFBF",
    "#BFBFBF",
    "#BFBFBF",
    "#BFBFBF",
    "#BFBFBF",
    "#BFBFBF",
    "#BFBFBF",
    "#BFBFBF",
    "#BFBFBF"];

// This is for translating the abbreviations
// to state names in order to have a key for our
// geojson data / geometries
var allStates =
    ['Arizona',
    'Alabama',
    'Alaska',
    'Arizona',
    'Arkansas',
    'California',
    'Colorado',
    'Connecticut',
    'Delaware',
    'Florida',
    'Georgia',
    'Hawaii',
    'Idaho',
    'Illinois',
    'Indiana',
    'Iowa',
    'Kansas',
    'Kentucky',
    'Kentucky',
    'Louisiana',
    'Maine',
    'Maryland',
    'Massachusetts',
    'Michigan',
    'Minnesota',
    'Mississippi',
    'Missouri',
    'Montana',
    'Nebraska',
    'Nevada',
    'New Hampshire',
    'New Jersey',
    'New Mexico',
    'New York',
    'North Carolina',
    'North Dakota',
    'Ohio',
    'Oklahoma',
    'Oregon',
    'Pennsylvania',
    'Rhode Island',
    'South Carolina',
    'South Dakota',
    'Tennessee',
    'Texas',
    'Utah',
    'Vermont',
    'Virginia',
    'Washington',
    'West Virginia',
    'Wisconsin',
    'Wyoming'
];

var allStates =
    ['Arizona',
        'Alabama',
        'Alaska',
        'Arizona',
        'Arkansas',
        'California',
        'Colorado',
        'Connecticut',
        'Delaware',
        'Florida',
        'Georgia',
        'Hawaii',
        'Idaho',
        'Illinois',
        'Indiana',
        'Iowa',
        'Kansas',
        'Kentucky',
        'Kentucky',
        'Louisiana',
        'Maine',
        'Maryland',
        'Massachusetts',
        'Michigan',
        'Minnesota',
        'Mississippi',
        'Missouri',
        'Montana',
        'Nebraska',
        'Nevada',
        'New Hampshire',
        'New Jersey',
        'New Mexico',
        'New York',
        'North Carolina',
        'North Dakota',
        'Ohio',
        'Oklahoma',
        'Oregon',
        'Pennsylvania',
        'Rhode Island',
        'South Carolina',
        'South Dakota',
        'Tennessee',
        'Texas',
        'Utah',
        'Vermont',
        'Virginia',
        'Washington',
        'West Virginia',
        'Wisconsin',
        'Wyoming'
    ];



/**
 * Initialize.
 * Loads the data, processes it, then creates map and charts
 */
// function init() {
//     loadData();
// }


/**
 * Loads the data.
 * https://gist.githubusercontent.com/mbostock/4090846/raw/d534aba169207548a8a3d670c9c2cc719ff05c47/us.json
 */
//function loadData() {
    d3.queue()   // queue function loads all external data files asynchronously
        .defer(d3.csv, "./data/scrubbed.csv", function (d) {
            if (d.state !== "" && d.country !== "") {

                var state = abbrState(d.state, 'name');

                return {
                    year: d.year,
                    city: d.city,
                    stateAbbr: d.state.toUpperCase(),
                    state: state,
                    shape: d.shape,
                    latitude: +d.latitude,
                    longitude: +d.longitude,
                    datetime: d.datetime,
                    country: d.country,
                    durationsec: +d.durationsec,
                    durationhours: d.durationhours,
                    comments: d.comments,
                    dateposted: d.dateposted
                    // filtered: false TODO
                }
            }
        })  // and associated data in csv file
        .defer(d3.json, './us-states.json') // our geometries
        .await(processData);   // once all files are loaded, call the processData function passing
                               // the loaded objects as arguments
//}

/**
 * Process the data.
 * @param error
 * @param topo
 * @param data
 */
function processData(error,results,topo) {
    if (error) {
        throw error
    }

    initialData = results;
    intSightingsByYearCountData = aggregationsByYear(initialData);
    area_chart(initialData);
    barChart(initialData);
    var features = topo.features

    components = [
        choropleth(features), // draw map
        scatterplot(onBrush)
    ]

    function update() {
        intSightingsByYearCountData = aggregationsByYear(initialData);
        components.forEach(function (component) {
            component(features)
        })
    }

    // TODO
    function onBrush(x0, x1, y0, y1) {
        var clear = x0 === x1 || y0 === y1;
        sightingsByYearCountData.forEach(function (d) {
            var flatAggregations = [];
            var yearAggrs = d.values;
            for (var i = 0; i < yearAggrs.length; i++){
                var obj = yearAggrs[i];
                var name = obj.key;

                flatAggregations.push({
                    state: name,
                    sightingCountsByState: obj.value.sightingCountsByState,
                    avgDurationSecs: obj.value.avgDurationSecs
                    // filtered: obj.value.filtered
                });
            }

            flatAggregations.forEach(function(state) {
                state.filtered = clear ? false
                    : state.avgDurationSecs < x0 || state.avgDurationSecs > x1 ||
                    state.sightingCountsByState < y0 || state.sightingCountsByState > y1
            });

        })

        update()
    }

    /**
     * Update the map if slider is moved
     */
    d3.select("#slider").on("input", function() {
        //get the current year
        selectedYear = getCurrentYear();
        $( "#selectedStates" ).empty();
        addSightingsByYear();
        update();
    });

    update()
    addSightingsByYear();
}




/**
 * Get the roll up aggregations of the number of sightings by state
 * for the selected year and the roll up average of duration (in seconds)
 * for the years sightings by state.
 * @param data
 */
function aggregationsByYear(data) {

    // roll up the counts by year per state
    // key: year, values {key: state, value: count }
    var listOfStates = [];
    var aggregations = d3.nest()
        .key(
            function(d){
                return d.year;
            }
        )
        .key(
            function(d){
                listOfStates.push({name: d.state});
                return d.state;
            }
        )
        .rollup(
            function(values) {
                var s = d3.sum(values, function(v) {
                    return v.durationsec;
                });

                return {
                    sightingCountsByState: values.length,
                    avgDurationSecs: (s / values.length)
                };
            }
        )
        .entries(data);

    //filter our data: get aggre data per state by year
    sightingsByYearCountData = aggregations.filter(
        function(d) {
            if(d.key == getCurrentYear()) {
                //console.log(d)
                return d;
            }
        }
    );

    // add empty states & sightings set to 0
    var statesToAdd = [];
    allStates.forEach(function (stateName) {
        if(findKey(listOfStates,stateName) !== 'undefined') {
            statesToAdd.push(stateName);
        }
    });

    statesToAdd.forEach(function(name){
        var emptyState = {
            'key': name,
            'value': {
                'avgDurationSecs': 0, 'sightingCountsByState': 0
            }};
        sightingsByYearCountData[0].values.push(emptyState);
    });

    // flatten the rolled up values from d3
    var flatAggregations = [];
    var yearAggrs = sightingsByYearCountData[0].values
    for (var i = 0; i < yearAggrs.length; i++){
        var obj = yearAggrs[i];
        var name = obj.key;

        flatAggregations.push({
            state: name,
            sightingCountsByState: obj.value.sightingCountsByState,
            avgDurationSecs: obj.value.avgDurationSecs
            // filtered: false
        });
    }

    return flatAggregations;

    function findKey(obj, value){
        var key = "";
        _.find(obj, function(v, k) {
            if (v === value) {
                key = k;
                return true;
            } else {
                return false;
            }
        });

        return key;
    }
}

/**************************************************************
 * MAP
 *************************************************************/
/**
 * Create the choropleth map
 * @param topo
 * @returns {update}
 */
function choropleth(features) { //topo
    var width = 750;
    var height = 450;

    projection = d3.geoAlbersUsa()
    //.translate([width/2, height/2]) // translate to center of screen
    //.scale([1000]); // scale things down so see entire US
        .scale([width * 1.25])
        .translate([width / 2, height / 2])

    // convert GeoJSON to SVG paths. Tell path generator to use albersUsa projection
    path = d3.geoPath().projection(projection)

    // create svg variable for map
    svg = d3.select('#map')
        .append('svg')
        .attr('width', width)
        .attr('height', height)


    // adding legend for our Choropleth
    var legend = svg.selectAll("g.legend")
        .data(ext_color_domain)
        .enter().append("g")
        .attr('transform', 'translate(650,0)')
        .attr("class", "legend");

    var ls_w = 18, ls_h = 18;

    legend.append("rect")
        .attr("x", 18)
        .attr("y", function(d, i){ return height - (i*ls_h) - 2*ls_h;})
        .attr("width", ls_w)
        .attr("height", ls_h)
        .style("fill", function(d, i) { return color(d); })
        .style("opacity", 0.8);

    legend.append("text")
        .attr("x", 50)
        .attr("y", function(d, i){ return height - (i*ls_h) - ls_h - 4;})
        .text(function(d, i){ return legend_labels[i]; });

    // draw the map
    var states = svg.selectAll('path')
        .data(features)  // bind data to these non-existent objects
        .enter()
        .append('path') // prepare data to be appended to paths
        .attr('d', path) // create them using the svg path generator defined above
        .style('stroke', '#fff')
        .style('stroke-width', 1);

    var padding = 20;

    states.on("click", function (d) {
        //console.log(d)
        if(zoom) {
            projection.fitExtent([[padding,padding], [width-padding, height-padding]], d);
            path.projection(projection);
        } else {
            projection = d3.geoAlbersUsa()
                .scale([width * 1.25])
                .translate([width / 2, height / 2])
            path.projection(projection);
        }

        states.attr('d', path)

        sightings.attr("cx", function(d) {
            try {
                return projection([d.longitude, d.latitude])[0];
            } catch (e) {
                // do nothing for now
            }
        }).attr("cy", function(d){
            try {
                return projection([d.longitude, d.latitude])[1];
            } catch (e) {
                // do nothing for now
            }
        });
        zoom = !zoom;
    });

    return function update(data) {
        svg.selectAll('path')
            .style('fill', function (d) {
                var sightingCountsByState = getPropertyOfAggrObject(d.properties.name, "sightingCountsByState")

                return sightingCountsByState == 0 ? '#000' : color(sightingCountsByState);
            })
    }
}

/**
 * Fills the map with locations of the sightings by year
 */
function addSightingsByYear() {

    //remove all current sightings for updateCommands
    d3.selectAll(".sightings").remove();

    //get the current year
    selectedYear = getCurrentYear();

    //filter our data: get sightings by year
    var sightingsByYear = initialData.filter(
        function(d) {
            if(d.country === "us") {
                return d.year === selectedYear;
            }
        }
    );

    //populate map with sightings by year (dots)
    sightings = svg.selectAll(".sightings")
        .data(sightingsByYear).enter()
        .append("circle")
        .attr("cx", function(d) {
            try {
                return projection([d.longitude, d.latitude])[0];
            } catch (e) {
                // do nothing for now
            }
        })
        .attr("cy", function(d){

            try {
                return projection([d.longitude, d.latitude])[1];
            } catch (e) {
                // do nothing for now
            }
        })
        .attr("r", 2)
        .attr("fill", 2)
        .attr("class", "sightings");

    // hover over / on demand details
    sightings.on("mouseover", function(d) {
            mapTooltip.transition()
                .duration(250)
                .style("opacity", 1);

            var upperCity = d.city.charAt(0).toUpperCase() + d.city.substr(1);
            mapTooltip.html(upperCity + ", " + d.state + "</br>" +
                "<strong>Shape: </strong>" + d.shape + "</br>" +
                "<strong>Description: </strong>" + d.comments + "</br>" +
                "<strong>Duration (sec): </strong>" + d.durationsec)
                .style("left", (d3.event.pageX + 15) + "px")
                .style("top", (d3.event.pageY - 28) + "px");

            comments.transition()
                .duration(250)
                .style("opacity", 1);

            comments.html("<strong>Comments:</strong> " +d.comments);
        }
    );

    sightings.on("mouseout", function(d){
            mapTooltip.transition()
                .duration(250)
                .style("opacity", 0);

            comments.transition()
                .duration(250)
                .style("opacity", 0);
        }
    );

    updateHeaders(selectedYear, sightingsByYear);
    updatePieChart("#chart", colorScheme, sightingsByYear);
}

/**
 * Updates the year and count texts
 * @param year
 * @param data
 */
function updateHeaders(year, data){
    //update year text
    d3.select(".year").text("Year: " + year);
    d3.select("#yearText").text(year);

    //get number of sightings in that year
    var countByYear = d3.nest()
        .key(
            function(d){
                return d.year;
            }
        )
        .rollup(
            function(values){
                return values.length;
            }
        )
        .entries(data);

    //update number of sightings text
    d3.select(".count").text(
        function(d, i){
            if(countByYear[i] == undefined)
                return "Sightings: 0";
            return "Sightings: " + countByYear[i].value
        }
    );
}

/**************************************************************
 * SCATTER PLOT
 *************************************************************/
function scatterplot(onBrush) {
    var margin = { top: 10, right: 52, bottom: 33, left: 75 }
    var swidth = 380 - margin.left - margin.right;
    var sheight = 250 - margin.top - margin.bottom;

    var x = d3.scaleLinear()
        .range([0, swidth])
    var y = d3.scaleLinear()
        .range([sheight, 0])

    var xAxis = d3.axisBottom()
        .scale(x)
    var yAxis = d3.axisLeft()
        .scale(y)

    // TODO - uncomment for brushing btwn scatter and map
    // var brush = d3.brush()
    //     .extent([[0, 0], [swidth, sheight]])
    //      .on('start brush', function () {
    //          var selection = d3.event.selection
    //          var x0 = x.invert(selection[0][0])
    //          var x1 = x.invert(selection[1][0])
    //          var y0 = y.invert(selection[1][1])
    //          var y1 = y.invert(selection[0][1])
    //
    //          onBrush(x0, x1, y0, y1)
    //      })

    var svg = d3.select('#scatterplot')
        .append('svg')
        .attr('width', swidth + margin.left + margin.right)
        .attr('height', sheight + margin.top + margin.bottom)
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')

    var bg = svg.append('g')
    var gx = svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + sheight + ')')
    var gy = svg.append('g')
        .attr('class', 'y axis')

    /*gx.append('text')
        .attr('x', swidth)
        .attr('y', 35)
        .style('text-anchor', 'end')
        .style('fill', '#000')
        .style('font-weight', 'bold')
        .text('average duration (seconds)')*/


    gy.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', 0)
        .attr('y', -40)
        .style('text-anchor', 'end')
        .style('fill', '#000')
        .style('font-weight', 'bold')
        .text('# of sightings')

    // TODO - uncomment for brushing btwn scatter and map
    //code for brushing on scatter plot to pie chart
    // svg.append('g')
    //     .attr('class', 'brush')
    //     .call(brush)

    svg.append("g")
        .call(d3.brush()
            .extent([[0, 0], [swidth, sheight]])
            .on("brush", brushed)
            .on("end", brushended));

    function brushed() {
        var s = d3.event.selection,
            x0 = s[0][0],
            y0 = s[0][1],
            dx = s[1][0] - x0,
            dy = s[1][1] - y0;

        var selectedStates = [];

        svg.selectAll('circle')
            .style("fill", function (d) {

                var state = getPropertyOfAggrObject(d.properties.name, "state")
                var sightingCountsByState = getPropertyOfAggrObject(d.properties.name, "sightingCountsByState")
                var avgDurationSecs = getPropertyOfAggrObject(d.properties.name, "avgDurationSecs")

                if (x(avgDurationSecs) >= x0 && x(avgDurationSecs) <= x0 + dx && y(sightingCountsByState) >= y0 && y(sightingCountsByState) <= y0 + dy) {
                    selectedStates.push(state);
                    return "grey"; }
                else {
                    return "none";
                }
            });

        selectedYear = getCurrentYear();
        var sightingsByYear = initialData.filter(
            function(d) {
                if(d.country == "us" && d.year == selectedYear) {
                    for (var i=0; i< selectedStates.length ; i++) {
                        if (selectedStates[i]== d.state) {
                            return true;
                        }
                    }
                }
            }
        );

        updatePieChart("#chart", colorScheme, sightingsByYear);
    }

    function brushended() {
        if (!d3.event.selection) {
            svg.selectAll('circle')
                .style("fill", "none");

            selectedYear = getCurrentYear();
            var sightingsByYear = initialData.filter(
                function(d) {
                    if(d.country === "us" && d.year === selectedYear ) {
                        return true
                    }
                }
            );

            $( "#selectedStates" ).empty();
            updatePieChart("#chart", colorScheme, sightingsByYear);
        } else {
            var s = d3.event.selection,
                x0 = s[0][0],
                y0 = s[0][1],
                dx = s[1][0] - x0,
                dy = s[1][1] - y0;

            var selectedStates = [];

            svg.selectAll('circle')
                .style("fill", function (d) {
                    var avgDurationSecs = getPropertyOfAggrObject(d.properties.name, "avgDurationSecs")
                    var sightingCountsByState = getPropertyOfAggrObject(d.properties.name, "sightingCountsByState")
                    var state = getPropertyOfAggrObject(d.properties.name, "state")

                    if (x(avgDurationSecs) >= x0 && x(avgDurationSecs) <= x0 + dx && y(sightingCountsByState) >= y0 && y(sightingCountsByState) <= y0 + dy) {
                        if($.inArray(state, selectedStates)) {
                            selectedStates.push(state);
                        }
                        return "grey";
                    } else {
                        return "none";
                    }
                });


            selectedYear = getCurrentYear();
            var sightingsByYear = initialData.filter(
                function(d) {
                    if(d.country === "us" && d.year === selectedYear) {
                        for (var i=0; i < selectedStates.length ; i++) {
                            if (selectedStates[i]=== d.state) {
                                return true;
                            }
                        }
                    }
                }
            );

            var unique = [...new Set(sightingsByYear.map(item => item.stateAbbr))];
            unique.forEach(function(nameAbbr) {
                $("#selectedStates").append( " " + nameAbbr ) ;
            })

        }

    }

    // TODO update with scatterplot circle fill
    return function update(data) {
        x.domain(d3.extent(data, function (d) {
            return getPropertyOfAggrObject(d.properties.name, "avgDurationSecs")
            //return d.avgDurationSecs
        })).nice()
        y.domain(d3.extent(data, function (d) {
            return getPropertyOfAggrObject(d.properties.name, "sightingCountsByState")
            //return d.sightingCountsByState
        })).nice()

        gx.call(xAxis)
            .selectAll("text")
            .attr("y", 0)
            .attr("x", 9)
            .attr("dy", ".35em")
            .attr("transform", "rotate(32)")
            .style("text-anchor", "start");

        gy.call(yAxis)

        var bgRect = bg.selectAll('rect')
            .data(d3.pairs(d3.merge([[y.domain()[0]], color.domain(), [y.domain()[1]]])))
        bgRect.exit().remove()
        bgRect.enter().append('rect')
            .attr('x', 0)
            .attr('width', swidth)
            .merge(bgRect)
            .attr('y', function (d) {
                return y(d[1])
            })
            .attr('height', function (d) {
                return y(d[0]) - y(d[1])
            })
            .style('fill', function (d) {
                return color(d[0])
            })

        var circle = svg.selectAll('circle')
            .data(data, function (d) {
                return getPropertyOfAggrObject(d.properties.name, "state")
                //return d.state
            })
        circle.exit().remove()
        circle.enter().append('circle')
            .attr('r', 4)
            .style('stroke', '#fff')
            .merge(circle)
            .attr('cx', function (d) {

                return x(getPropertyOfAggrObject(d.properties.name, "avgDurationSecs"))
            })
            .attr('cy', function (d) {
                return y(getPropertyOfAggrObject(d.properties.name, "sightingCountsByState"))
            })
            .style('fill', function (d) {
                return color(getPropertyOfAggrObject(d.properties.name, "sightingCountsByState"))
            })
            //TODO
            .style('opacity', function (d) {
                return getPropertyOfAggrObject(d.properties.name, "filtered") ? 0.5 : 1
                //return d.filtered ? 0.5 : 1
            })
            .style('stroke-width', function (d) {
                return getPropertyOfAggrObject(d.properties.name, "filtered") ? 1 : 2
                //return d.filtered ? 1 : 2
            })
    }
}

/**
 * Get the current year the user has selected
 * @returns {*}
 */
function getCurrentYear() {
    return document.getElementById("slider").value;
}

/**
 * This function is needed in order to index the aggregated
 * data so that we are separating the geojson from our data.
 * @returns {desired property}
 */
function getPropertyOfAggrObject(stateName, propName) {
    var result = intSightingsByYearCountData.filter(function(obj) {
        return obj.state === stateName;
    });
    var prop = result.map(a => a[propName]);
    return prop[0]
}


/**************************************************************
 * PIE CHART
 *************************************************************/

/**
 * Updates the pie chart on slider.
 * @param domElementToAppendTo
 * @param scheme
 * @param sightings
 */
function updatePieChart(domElementToAppendTo, scheme, sightings){
    // clearing DOM elements
    d3.selectAll(".tooltipChart").remove();
    d3.selectAll(".rect").remove();
    d3.selectAll(".arc").remove();
    d3.select(domElementToAppendTo).select("svg").remove();

    var countByShape = d3.nest()
        .key(
            function(d){
                return d.shape;
            }
        )
        .rollup(
            function(values){
                return values.length;
            }
        )
        .entries(sightings);

    // init the counts to 0
    var shapesData = [
        {label:"changing",	value: 0},
        {label:"chevron",	value: 0},
        {label:"cigar",		value: 0},
        {label:"circle",	value: 0},
        {label:"cone",		value: 0},
        {label:"cross",		value: 0},
        {label:"cylinder",	value: 0},
        {label:"diamond",	value: 0},
        {label:"disk",		value: 0},
        {label:"egg",		value: 0},
        {label:"fireball",	value: 0},
        {label:"flask",		value: 0},
        {label:"formation",	value: 0},
        {label:"oval",	    value: 0},
        {label:"rectangle",	value: 0},
        {label:"sphere",	value: 0},
        {label:"teardrop",	value: 0},
        {label:"triangle",	value: 0},
        {label:"other",		value: 0},
        {label:"unknown",	value: 0},
        {label:"light",	    value: 0}
    ];

    //update values for shapesData
    for(var i = 0; i < countByShape.length; i++){
        for(var j = 0; j < shapesData.length; j++){
            if(countByShape[i].key == shapesData[j].label){
                shapesData[j].value = countByShape[i].value;
                continue;
            }
        }
    }

    var margin = {top: 50, bottom: 50, left: 50, right: 50};
    var width = 300 - margin.left - margin.right, height = width, radius = Math.min(width, height) / 2;

    shapesData.forEach(
        function(item){
            item.enabled = true;
        }
    );

    var color = d3.scaleOrdinal().range(scheme);
    var chart = d3.select(domElementToAppendTo)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

    var arc = d3.arc()
        .outerRadius(radius - 10)
        .innerRadius(35);

    var pie = d3.pie()
        .sort(null)
        .value(function(d) { return d.value; });

    var tooltip = d3.select(domElementToAppendTo)
        .append('div')
        .attr('class', 'tooltipChart');

    tooltip.append('div')
        .attr('class', 'label');

    tooltip.append('div')
        .attr('class', 'count');

    tooltip.append('div')
        .attr('class', 'percent');

    var g = chart.selectAll('.arc')
        .data(pie(shapesData))
        .enter().append('g')
        .attr("class", "arc");

    g.append("path")
        .attr('d', arc)
        .attr('fill',
            function(d, i) {
                return color(d.data.label);
            }
        )
        .each(
            function(d){
                this._current = d;
            }
        );

    g.on('mouseover',
        function(d){
            var total = d3.sum(shapesData.map(
                function(d){
                    if(d.enabled)
                        return d.value;
                    return 0;
                }
            ));

            var percent = Math.round(1000 * d.data.value / total) / 10;
            tooltip.select('.label').html(d.data.label.toUpperCase()).style('color','#bdbdbd');
            tooltip.select('.count').html(d.data.value);
            tooltip.select('.percent').html(percent + '%');

            tooltip.style('display', 'block');
            tooltip.style('opacity',2);

            d3.select(this)
                .interrupt()
                .transition()
                .duration(300)
                .ease(d3.easeCubic)
                .attr('transform', 'scale(1.05)')


        }
    );

    g.on('mousemove',
        function(d){
            tooltip.style('top', (d3.event.layerY + 10) + 'px')
                .style('left', (d3.event.layerX - 25) + 'px');
        }
    );

    g.on('mouseout',
        function(){
            tooltip.style('display', 'none');
            tooltip.style('opacity',0);

            d3.select(this)
                .interrupt()
                .transition()
                .duration(300)
                .ease(d3.easeCubic)
                .attr('transform', 'scale(1)')
                .style('filter', 'none')
        }
    );

}

/*****************************************************************
 * Brushing area chart
 ************************************************************ */

function area_chart(data) {

    // aggregate counts
    var us_data = data.filter(
        function (d) {
            return (d.country == "us")
        }
    );

    var countByYear = d3.nest()
        .key(
            function (d) {
                return d.year;
            }
        )
        .rollup(
            function (values) {
                return values.length;
            }
        )
        .entries(us_data);

    var amargin = {top: 20, right: 20, bottom: 110, left: 50},
        amargin2 = {top: 430, right: 20, bottom: 30, left: 40},
        awidth = 960 - amargin.left - amargin.right,
        aheight = 500 - amargin.top - amargin.bottom,
        aheight2 = 500 - amargin2.top - amargin2.bottom;

    var x = d3.scaleLinear().range([0, awidth]),
        x2 = d3.scaleLinear().range([0, awidth]),
        y = d3.scaleLinear().range([aheight, 0]),
        y2 = d3.scaleLinear().range([aheight2, 0]);

    var xAxis = d3.axisBottom(x).tickFormat(d3.format("d")),
        xAxis2 = d3.axisBottom(x2).tickFormat(d3.format("d")),
        yAxis = d3.axisLeft(y);

    var brush = d3.brushX()
        .extent([[0, 0], [awidth, aheight2]])
        .on("brush", brushed);


    var svg = d3.select("#area_chart").append("svg")
        .attr("width", awidth + amargin.left + amargin.right)
        .attr("height", aheight + amargin.top + amargin.bottom);
    var zoom = d3.zoom()
        .scaleExtent([1, Infinity])
        .translateExtent([[0, 0], [awidth, aheight]])
        .extent([[0, 0], [awidth, aheight]])
        .on("zoom", zoomed);

    var area = d3.area()
        .curve(d3.curveMonotoneX)
        .x(function(d) { return x(d.key); })
        .y0(aheight)
        .y1(function(d) { return y(d.value); });

    var area2 = d3.area()
        .curve(d3.curveMonotoneX)
        .x(function(d) { return x2(d.key); })
        .y0(aheight2)
        .y1(function(d) { return y2(d.value); });


    svg.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", awidth)
        .attr("height", aheight);

    var focus = svg.append("g")
        .attr("class", "focus")
        .attr("transform", "translate(" + amargin.left + "," + amargin.top + ")");

    var context = svg.append("g")
        .attr("class", "context")
        .attr("transform", "translate(" + amargin2.left + "," + amargin2.top + ")");

    y.domain(d3.extent(countByYear, function (d) {
        return d.value;
    }));
    x.domain(d3.extent(countByYear, function (d) {
        return d.key;
    }));
    x2.domain(x.domain());
    y2.domain(y.domain());

    focus.append("path")
        .datum(countByYear)
        .attr("class", "area")
        .attr("d", area);

    focus.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + aheight + ")")
        .call(xAxis);

    axisofy = focus.append("g")
        .attr("class", "axis axis--y")
        .call(yAxis);

    axisofy.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', 0)
        .attr('y', 10)
        .style('text-anchor', 'end')
        //.style('fill', '#000')
        .style('font-weight', 'bold')
        .text('sightings count');

    context.append("path")
        .datum(countByYear)
        .attr("class", "area")
        .attr("d", area2);

    context.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + aheight2 + ")")
        .call(xAxis2);

    context.append("g")
        .attr("class", "brush")
        .call(brush)
        .call(brush.move, x.range());

    svg.append("rect")
        .attr("class", "zoom")
        .attr("width", awidth)
        .attr("height", aheight)
        .attr("opacity", 0)
        .attr("transform", "translate(" + amargin.left + "," + amargin.top + ")")
        .call(zoom);


    function brushed() {
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") {
            return; // ignore brush-by-zoom
        }
        var s = d3.event.selection || x2.range();
        x.domain(s.map(x2.invert, x2));
        focus.select(".area").attr("d", area);
        focus.select(".axis--x").call(xAxis);
        svg.select(".zoom").call(zoom.transform, d3.zoomIdentity
            .scale(awidth / (s[1] - s[0]))
            .translate(-s[0], 0));
    }

    function zoomed() {
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return; // ignore zoom-by-brush
        var t = d3.event.transform;
        x.domain(t.rescaleX(x2).domain());
        focus.select(".area").attr("d", area);
        focus.select(".axis--x").call(xAxis);
        context.select(".brush").call(brush.move, x.range().map(t.invertX, t));
    }

}


/*****************************************************************
 * Bar chart
 ************************************************************ */
function barChart(data) {

    var us_data = data.filter(
        function (d) {
            return (d.country == "us")
        }
    );

    var keyValsCountByState = d3.nest()
        .key(
            function (d) {
                return d.stateAbbr;
            }
        )
        .rollup(
            function (values) {
                return values.length;
            }
        )
        .entries(us_data);


    var countByState = [];
    for (var i = 0; i < keyValsCountByState.length; i++) {
        var obj = keyValsCountByState[i];
        countByState.push({
            state: obj.key,
            value: obj.value
        });
    }

    var countByState = _.sortBy(countByState, 'state');

    var margin = {top: 20, right: 20, bottom: 30, left: 50},
        width = 1000 - margin.left - margin.right,
        height = 100 - margin.top - margin.bottom;

    var tooltip = d3.select("body").append("div").attr("class", "barToolTip");

    var x = d3.scaleBand().rangeRound([0, width]).padding(0.1),
        y = d3.scaleLinear().rangeRound([height, 0]);

    var svg = d3.select("#barChart").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    var g = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    x.domain(countByState.map(function (d) {
        return d.state;
    }));
    y.domain([0, d3.max(countByState, function (d) {
        return d.value;
    })]);

    g.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x));

    g.append("g")
        .attr("class", "axis axis--y")
        .call(d3.axisLeft(y).ticks(3).tickFormat(function (d) {
            return d;
        }).tickSizeInner([-width]))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", "0.71em")
        .attr("text-anchor", "end");

    g.selectAll(".bar")
        .data(countByState)
        .enter().append("rect")
        .attr("x", function (d) {
            return x(d.state);
        })
        .attr("y", function (d) {
            return y(d.value);
        })
        .attr("width", x.bandwidth())
        .attr("height", function (d) {
            return height - y(d.value);
        })
        .attr("class", "bar")
        .on("mousemove", function (d) {
            tooltip
                .style("left", d3.event.pageX - 50 + "px")
                .style("top", d3.event.pageY - 70 + "px")
                .style("display", "inline-block")
                .html((d.value));
        })
        .on("mouseout", function (d) {
            tooltip.style("display", "none");
        });
}
