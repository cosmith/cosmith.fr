// Sorry if I made your browser slow :(
// I like to play with d3...

;(function() {

var data = [];
// select a random scale in [50, 200]
var scale = 50 + Math.random() * 150;
// select a random interpolation method
var interpolation = ["basis", "linear", "step-after"][Math.floor(Math.random() * 3)];
var x = 0,
    y = 0;

var svg = d3.select(".background").append("svg")
    .attr("width", "100%")
    .attr("height", "100%");

var text = d3.selectAll(".text");
var dims = [];
text.each(function (d, i) {
    dims.push(text[0][i].getBoundingClientRect());
});

var line = d3.svg.line()
    .x(function (d) { return d.x; })
    .y(function (d) { return d.y; })
    .interpolate(interpolation);

svg.append("path")
    .attr("class", "line")
    .attr("d", line(data));

function update() {
    generateData(10);

    var path = svg.selectAll(".line")
        .data([data])
        .attr("d", line);

    // update existing
    path.attr("class", "line");

    // enter
    path.enter()
        .append("path")
        .data(data)
        .attr("class", "line")
        .attr("d", line);

    // enter + update
    path.transition()
        .ease("linear")
        .duration(200)
        .attr("d", line);
}

// is the path over the text?
function overText(x, y) {
    var over = false;
    var margin = 30;
    for (var i = 0; i < dims.length; i++) {
        over = over ||
            (x > dims[i].left - margin &&
             x < dims[i].right + margin &&
             y > dims[i].top - margin &&
             y < dims[i].bottom + margin);
    }
    // fuzzy borders
    over = over && Math.random() > 0.25;
    return over;
}

function rand(init, max) {
    var newval = (0.5 - Math.random()) * scale;
    newval = Math.max(-scale, Math.min(init + newval, max));
    
    return newval;
}

function generateData(count) {
    for (var i = count; i > 0; --i) {
        pushData();
    }
}

function pushData() {
    var newX = rand(x, document.width);
    var newY = rand(y, document.height);

    while (overText(newX, newY)) {
        newX = rand(x, document.width);
        newY = rand(y, document.height);
    }
    x = newX;
    y = newY;

    data.push({x: x, y: y});
}

generateData(2000);
update();

})();