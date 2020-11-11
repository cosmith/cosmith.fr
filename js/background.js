function drawBackground() {
  // get page size
  const el = document.documentElement,
    body = document.getElementsByTagName("body")[0],
    pageWidth = window.innerWidth || el.clientWidth || body.clientWidth,
    pageHeight = window.innerHeight || el.clientHeight || body.clientHeight;

  let data = [];
  // select a random scale in [50, 200]
  const scale = 50 + Math.random() * 150;

  let x = 0,
    y = 0;

  // clear background
  document.getElementById("background").innerHTML = "";

  const svg = d3
    .select("#background")
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%");

  // avoid text
  const text = d3.selectAll(".text");
  let dims = [];
  text.each(function (d, i) {
    dims.push(text[0][i].getBoundingClientRect());
  });

  const line = d3.svg
    .line()
    .x(function (d) {
      return d.x;
    })
    .y(function (d) {
      return d.y;
    })
    .interpolate("basis");

  svg.append("path").attr("class", "line").attr("d", line(data));

  function update() {
    generateData(10);

    const path = svg.selectAll(".line").data([data]).attr("d", line);

    // update existing
    path.attr("class", "line");

    // enter
    path
      .enter()
      .append("path")
      .data(data)
      .attr("class", "line")
      .attr("d", line);

    // enter + update
    path.transition().ease("linear").duration(200).attr("d", line);
  }

  // is the path over the text?
  function overText(x, y) {
    let over = false;
    const margin = 30;
    for (let i = 0; i < dims.length; i++) {
      over =
        over ||
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
    let result = (0.5 - Math.random()) * scale;
    result = Math.max(-scale, Math.min(init + result, max));

    return result;
  }

  function generateData(count) {
    for (let i = 0; i < count; i++) {
      pushData();
    }
  }

  function pushData() {
    let newX = rand(x, pageWidth);
    let newY = rand(y, pageHeight);

    while (overText(newX, newY)) {
      newX = rand(x, pageWidth);
      newY = rand(y, pageHeight);
    }
    x = newX;
    y = newY;

    data.push({ x: x, y: y });
  }

  generateData(2000);
  update();
}

window.onresize = drawBackground;
drawBackground();
