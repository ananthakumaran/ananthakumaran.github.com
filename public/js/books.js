/* global _, d3, $, moment, books, linkToBook, Intl, tippy */

var compactBooks = window.matchMedia("(max-width: 48em)");

function tickCount(width) {
  return Math.max(2, Math.floor(width / 55));
}

function yearTicks(range, width) {
  var count = Math.min(tickCount(width), Math.max(1, range[1].year() - range[0].year()));
  return d3.ticks(range[0].year(), range[1].year(), count).map(function (value) {
    return range[0].clone().year(value).startOf("year");
  });
}

function year(string) {
  var n = parseInt(string, 10);
  return moment(new Date(n, 0, 1));
}

function spineTitle(title) {
  var label = title.replace(/(?:\s+(?:\([^()]*\)|\[[^\[\]]*\]))+\s*$/, "").trim() || title;
  return label.length >= 30 ? label.replace(/:\s+.*$/, "").trim() || label : label;
}

var read = _.filter(books, function (book) {
  return !!book["Date Read"] && book["Exclusive Shelf"] == "read";
});
read = _.sortBy(
  _.map(read, function (book) {
    var pageCount = parseInt(book["Number of Pages"], 10);
    if (_.isNaN(pageCount)) {
      pageCount = 0;
    }
    var added = moment(book["Date Added"], "YYYY/MM/DD");
    var read = moment(book["Date Read"], "YYYY/MM/DD");
    var started =
      read.diff(added, "days") > 360
        ? read.clone().subtract(360, "days")
        : added;
    return {
      title: book["Title"].split(/[:([]/)[0].trim(),
      fullTitle: book["Title"],
      spineTitle: spineTitle(book["Title"]),
      pageCount: pageCount,
      added: added,
      started: started,
      read: read,
      published: year(book["Original Publication Year"] || book["Year Published"]),
      rating: parseInt(book["My Rating"]),
      averageRating: parseFloat(book["Average Rating"]),
      author: book["Author"],
      id: book["Book Id"],
      spineColor: /^#[\da-f]{6}$/i.test(book["Spine Color"] || "")
        ? book["Spine Color"]
        : "#75695b",
      spineTextColor: /^#[\da-f]{6}$/i.test(book["Spine Text Color"] || "")
        ? book["Spine Text Color"] : null,
      bookshelves: book["Bookshelves"].split(", "),
    };
  }),
  "read",
);

var shelves = _.chain(read)
  .map("bookshelves")
  .flatten()
  .uniq()
  .without("", "own")
  .sort()
  .value();

var shelfColor = (function () {
  var color = d3
    .scaleSequential(d3.interpolateRainbow)
    .domain([0, shelves.length]);

  return function (shelf) {
    return color(shelves.indexOf(shelf));
  };
})();

function setCounter(name, value) {
  var node = document.querySelector(".counter." + name);
  node.innerHTML = value.toLocaleString();
}

function add(a, b) {
  return a + b;
}

function direction(a, b) {
  if (a > b) {
    return "up";
  } else {
    return "down";
  }
}

function color(rating) {
  return ["", "#fef0d9", "#fdcc8a", "#fc8d59", "#e34a33", "#b30000"][rating];
}

function spineLabelColor(value, preferred) {
  function luminance(color) {
    var rgb = d3.rgb(color);
    var channels = [rgb.r, rgb.g, rgb.b].map(function (channel) {
      channel = Math.max(0, Math.min(255, channel)) / 255;
      return channel <= 0.04045
        ? channel / 12.92
        : Math.pow((channel + 0.055) / 1.055, 2.4);
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  }
  var background = luminance(value);
  function contrast(color) {
    var foreground = luminance(color);
    return (Math.max(background, foreground) + 0.05) /
      (Math.min(background, foreground) + 0.05);
  }
  var darkContrast = contrast("#000000");
  var lightContrast = contrast("#ffffff");
  var target = Math.min(7, Math.max(darkContrast, lightContrast));
  var ink = preferred || value;
  if (preferred && contrast(ink) >= target) return ink;
  // Old/missing color data still gets readable ink without inventing a new hue.
  var adjust = d3.interpolateRgb(ink, darkContrast >= lightContrast ? "#000000" : "#ffffff");
  for (var step = 0; step <= 100; step++) {
    var shade = adjust(step / 100);
    if (contrast(shade) >= target) return shade;
  }
  return adjust(1);
}

function connect(x1, x2, y1, y2, state) {
  var line = d3.line().curve(function (context) {
    var step = d3.curveStep(context);
    var d = direction(y1, y2);
    if (
      !state._t ||
      Math.floor(y1) == Math.floor(y2) ||
      (state._t >= 0.8 && d == "down") ||
      (state._t <= 0.3 && d === "up") ||
      state.d !== d
    ) {
      if (d === "down") {
        state._t = 0.3;
      } else {
        state._t = 0.8;
      }
    } else {
      if (d === "down") {
        state._t += 0.2;
      } else {
        state._t -= 0.2;
      }
    }
    state.d = d;
    step._t = state._t;
    return step;
  });
  return line([
    [x1, y1],
    [x2, y2],
  ]);
}

function layout(read, y, singleColumn) {
  var points = _.map(read, function (r, i) {
    var h = r.cardHeight;
    return { x: singleColumn || i % 2 == 0 ? 0 : 5000, y: y(r.read), height: h };
  });

  var simulation = d3
    .forceSimulation(points)
    .force(
      "x",
      d3
        .forceX(function (d) {
          return d.x;
        })
        .strength(1),
    )
    .force(
      "y",
      d3
        .forceY(function (d) {
          return d.y;
        })
        .strength(0.01),
    )
    .force(
      "collide",
      d3
        .forceCollide(function (d) {
          return d.height / 2;
        })
        .strength(0.9)
        .iterations(5),
    )
    .stop();

  for (var i = 0; i < 500; ++i) simulation.tick();

  for (i = 0; i < read.length; i++) {
    read[i].y1 = points[i].y;
    read[i].y = y(read[i].read);
  }

  if (singleColumn) {
    // Force collisions are approximate; enforce the actual spine heights and gaps.
    var ordered = _.sortBy(read, "y1");
    for (var j = 1; j < ordered.length; j++) {
      var previous = ordered[j - 1];
      var current = ordered[j];
      current.y1 = Math.max(current.y1, previous.y1 + (previous.cardHeight + current.cardHeight) / 2);
    }
  }
}

setCounter("read", read.length);
setCounter("author", _.uniq(_.map(read, "author")).length);
setCounter("pages", _.reduce(_.map(read, "pageCount"), add, 0));

function bookPreviewContent(book, showCover) {
  var popup = d3.select(document.createElement("div")).attr("class", "book-preview")
    .classed("book-preview--text-only", !showCover);
  if (showCover) {
    var cover = popup.append("a").attr("class", "book-preview-cover")
      .attr("href", linkToBook(book)).attr("target", "_blank")
      .attr("rel", "noopener noreferrer")
      .attr("aria-label", "View " + book.fullTitle + " on Goodreads");
    var image = cover.append("img").attr("alt", "");
    var missingCover = cover.append("span").text("No cover available").property("hidden", true);
    var fallback = "/public/covers/" + book.id + ".jpg";
    image.on("error", function () {
      if (this.getAttribute("src") !== fallback) {
        this.setAttribute("src", fallback);
        return;
      }
      image.style("visibility", "hidden");
      missingCover.property("hidden", false);
    }).attr("src", "/public/covers/" + book.id + ".avif");
  }
  var details = popup.append("div").attr("class", "book-preview-details");
  details.append("h3").text(book.fullTitle);
  details.append("p").attr("class", "book-preview-author").text(book.author);
  function number(parent, value) {
    return parent.append("span").attr("class", "book-preview-number").text(value);
  }
  var rating = details.append("p").attr("class", "book-preview-rating");
  if (book.rating > 0) {
    number(rating, stars(book.rating)).attr("aria-label", book.rating + " out of 5 stars");
  }
  if (book.averageRating > 0) {
    var average = rating.append("span").attr("class", "book-preview-average");
    average.append("span").text((book.rating > 0 ? " · " : "") + "Goodreads ");
    number(average, book.averageRating.toFixed(2));
  }
  if (book.pageCount > 0 || book.published.isValid()) {
    var metadata = details.append("p").attr("class", "book-preview-meta");
    if (book.pageCount > 0) {
      number(metadata, book.pageCount.toLocaleString());
      metadata.append("span").text(" pages");
    }
    if (book.published.isValid()) {
      metadata.append("span").text((book.pageCount > 0 ? " · " : "") + "Published " + book.published.format("YYYY"));
    }
  }
  details.append("p").attr("class", "book-preview-meta").text("Read " + book.read.format("D MMM YYYY"));
  var bookShelves = _.uniq(book.bookshelves).filter(function (shelf) {
    return shelves.indexOf(shelf) !== -1;
  });
  if (bookShelves.length) {
    var shelfInfo = details.append("p").attr("class", "book-preview-shelves");
    bookShelves.forEach(function (shelf) {
      shelfInfo.append("span").attr("class", "book-preview-shelf").text(shelf);
    });
  }

  return popup.node();
}

var bookPreviews = new Set();
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    bookPreviews.forEach(function (preview) {
      preview.clearDelayTimeouts();
      preview.hide();
    });
  }
});

function attachPreviews(nodes, renderContent) {
  var fresh = nodes.filter(function (node) {
    if (!node._tippy) return true;
    node._tippy.clearDelayTimeouts();
    node._tippy.hide();
    node._tippy.setContent("");
    return false;
  });
  tippy(fresh, {
    content: "",
    theme: "book-preview",
    placement: "bottom",
    maxWidth: 380,
    delay: [250, 150],
    duration: [120, 80],
    interactive: true,
    interactiveBorder: 12,
    trigger: "mouseenter focus click",
    touch: true,
    appendTo: function () { return document.body; },
    aria: { content: "describedby", expanded: false },
    popperOptions: {
      modifiers: [
        { name: "flip", options: { fallbackPlacements: ["top", "right", "left"] } },
        { name: "preventOverflow", options: { padding: 12 } },
      ],
    },
    onCreate: function (instance) {
      bookPreviews.add(instance);
      var dot = instance.reference.querySelector("circle");
      if (dot) {
        // Keep the generous Voronoi hover area, but position the card by the dot.
        instance.setProps({ getReferenceClientRect: function () { return dot.getBoundingClientRect(); } });
      }
    },
    onDestroy: function (instance) { bookPreviews.delete(instance); },
    onShow: function (instance) {
      tippy.hideAll({ exclude: instance, duration: 0 });
      if (instance.props.content === "") {
        instance.setContent(renderContent(instance.reference.__data__));
      }
    },
  });
}

function attachBookPreviews(nodes, showCover) {
  attachPreviews(nodes, function (d) {
    return bookPreviewContent(d.data || d, showCover);
  });
}

function attachBookChartPreviews(cells) {
  cells.attr("tabindex", 0).attr("role", "img")
    .attr("aria-label", function (d) { return d.data.fullTitle + " by " + d.data.author; });
  attachBookPreviews(cells.nodes(), true);
}

function authorPreviewContent(author) {
  var popup = d3.select(document.createElement("div"))
    .attr("class", "book-preview book-preview--text-only book-preview--author");
  var details = popup.append("div").attr("class", "book-preview-details");
  var heading = details.append("h3").attr("class", "book-preview-author").text(author[0]);
  heading.append("span").attr("class", "book-preview-number").text(" (" + author[1].length + ")");
  details.append("ul").attr("class", "book-preview-book-list")
    .selectAll("li").data(author[1]).enter().append("li")
    .text(function (book) { return book.fullTitle; });
  return popup.node();
}

function timeline() {
  var node = document.getElementById("timeline");
  var singleColumn = compactBooks.matches;
  var margin = { top: 20, right: 0, bottom: 50, left: singleColumn ? 60 : 80 };
  var width = node.parentNode.clientWidth - margin.left - margin.right - (singleColumn ? 8 : 0);
  var domain = d3.extent(_.map(read, "read"));
  var height = (domain[1] - domain[0]) / 15000000 * (singleColumn ? 2 : 1);
  var svg = d3
    .select("#timeline")
    // Extend the viewport without moving or resizing the spines.
    .attr("width", width + margin.left + margin.right + 8)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var lighting = [
    { name: "highlight", depth: 6, color: "#fff", opacities: [1, 0], bottom: false },
    { name: "shade", depth: 9, color: "#000", opacities: [0, 1], bottom: true },
  ];
  var defs = d3.select(node).append("defs");
  lighting.forEach(function (light) {
    var gradient = defs.append("linearGradient")
      .attr("id", "timeline-spine-" + light.name)
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", "0%").attr("y2", "100%");
    gradient.selectAll("stop").data(light.opacities).enter().append("stop")
      .attr("offset", function (d, i) { return i ? "100%" : "0%"; })
      .attr("stop-color", light.color)
      .attr("stop-opacity", function (d) { return d; });
  });

  var y = d3.scaleLinear().domain(domain).range([height, 0]);
  var x = singleColumn ? 0 : width / 2;

  var ticks = [];
  var start = domain[0].clone();
  while (start <= domain[1]) {
    ticks.push(start.clone());
    start.add(1, "month");
  }

  var axis = d3
    .axisLeft(y)
    .tickValues(ticks)
    .tickSize(-(x + 10))
    .tickFormat(function (x) {
      return moment(x).format("MMM YYYY");
    });

  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", "translate(-10,0)")
    .call(axis);

  svg
    .selectAll(".line")
    .data([0])
    .enter()
    .append("line")
    .attr("x1", x)
    .attr("x2", x)
    .attr("y1", y(domain[0]))
    .attr("y2", y(domain[1]));

  var cardWidth = singleColumn ? width - 24 : width / 2 - 30;
  var thickness = d3.scaleSqrt().domain([0, 1200]).range([20, 36]).clamp(true);
  var lineHeight = 15;
  var textWidth = Math.max(1, cardWidth - 24);
  var measurement = svg.append("g").attr("class", "book-spine").attr("visibility", "hidden");
  var measureLabel = measurement.append("text").attr("class", "spine-label");
  function fits(text) {
    measureLabel.text(text);
    return measureLabel.node().getComputedTextLength() <= textWidth;
  }
  function wrapTitle(title) {
    var lines = [];
    var line = "";
    title.trim().split(/\s+/).forEach(function (word) {
      var candidate = line ? line + " " + word : word;
      if (fits(candidate)) {
        line = candidate;
        return;
      }
      if (line) lines.push(line);
      if (fits(word)) {
        line = word;
        return;
      }
      // Even a long unbroken word must remain visible, without ellipses.
      line = "";
      Array.from(word).forEach(function (character) {
        if (line && !fits(line + character)) {
          lines.push(line);
          line = character;
        } else {
          line += character;
        }
      });
    });
    if (line) lines.push(line);
    return lines;
  }
  read.forEach(function (book, i) {
    book.spineWidth = cardWidth;
    book.spineLines = wrapTitle(book.spineTitle);
    book.spineHeight = Math.max(singleColumn ? 34 : 0, thickness(book.pageCount), book.spineLines.length * lineHeight + 14);
    book.cardHeight = book.spineHeight + 12;
    var column = singleColumn ? 24 : (i % 2 == 0 ? 0 : width / 2 + 30);
    book.x = margin.left + column + (cardWidth - book.spineWidth) / 2;
  });
  measurement.remove();


  function describeBook(d) {
    return d.read.format("D MMM YYYY") + "  " + stars(d.rating) +
      "  " + d.fullTitle + " - " + d.author;
  }

  var card = svg
    .selectAll(".book-spine")
    .data(read)
    .enter()
    .append("g")
    .attr("class", "book-spine")
    .attr("role", "link")
    .attr("tabindex", 0)
    .attr("aria-label", describeBook)
    .on("click", function (d) {
      if (tippy.currentInput.isTouch) return;
      window.open(linkToBook(d), "_blank");
    })
    .on("keydown", function (d) {
      if (d3.event.key === "Enter" || d3.event.key === " ") {
        d3.event.preventDefault();
        window.open(linkToBook(d), "_blank");
      }
    });

  attachBookPreviews(card.nodes(), true);
  card
    .append("rect")
    .attr("class", "spine-body")
    .attr("rx", 2)
    .attr("width", function (d) { return d.spineWidth; })
    .attr("height", function (d) { return d.spineHeight; })
    .attr("fill", function (d) { return d.spineColor; })
    .attr("stroke", function (d) { return d3.interpolateRgb(d.spineColor, "#000")(0.12); });
  // Fixed-depth edge lighting, rather than a gradient stretched over tall spines.
  lighting.forEach(function (light) {
    card.append("rect")
      .attr("class", "spine-lighting")
      .attr("rx", 2)
      .attr("width", function (d) { return d.spineWidth; })
      .attr("height", light.depth)
      .attr("y", function (d) { return light.bottom ? d.spineHeight - light.depth : 0; })
      .attr("fill", "url(#timeline-spine-" + light.name + ")")
      .attr("opacity", function (d) {
        // Perceptual lightness: pale covers need less lighting, dark covers more.
        var darkness = 1 - Math.max(0, Math.min(1, d3.lab(d.spineColor).l / 100));
        return light.bottom ? 0.08 + 0.20 * darkness : 0.06 + 0.24 * darkness;
      })
      .style("--spine-dark-opacity", function (d) {
        var lightness = Math.max(0, Math.min(1, d3.lab(d.spineColor).l / 100));
        return light.bottom ? 0.14 + 0.20 * lightness : 0.04 + 0.08 * (1 - lightness);
      })
      .attr("pointer-events", "none")
      .attr("aria-hidden", "true");
  });
  card
    .append("text")
    .attr("class", "spine-label")
    .attr("x", 12)
    .attr("y", function (d) {
      return d.spineHeight / 2 - (d.spineLines.length - 1) * lineHeight / 2;
    })
    .attr("fill", function (d) { return spineLabelColor(d.spineColor, d.spineTextColor); })
    .selectAll("tspan")
    .data(function (d) { return d.spineLines; })
    .enter()
    .append("tspan")
    .attr("x", 12)
    .attr("dy", function (d, i) { return i === 0 ? 0 : lineHeight; })
    .text(function (d) { return d; });

  layout(read, y, singleColumn);

  // Collision resolution can move cards beyond either end of the date range.
  margin.top = Math.max(
    margin.top,
    d3.max(read, function (d) {
      return d.cardHeight / 2 - d.y1;
    }),
  );
  margin.bottom = Math.max(
    margin.bottom,
    d3.max(read, function (d) {
      return d.y1 + d.cardHeight / 2 - height;
    }),
  );
  d3.select("#timeline").attr("height", height + margin.top + margin.bottom);
  svg.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  card.attr("transform", function (d) {
    return "translate(" + (d.x - margin.left) + "," +
      (d.y1 - d.spineHeight / 2) + ")";
  });

  var leftState = {};
  var rightState = {};
  var edges = svg
    .selectAll(".edge")
    .data(read)
    .enter()
    .append("path")
    .attr("class", "edge")
    .style("stroke", function (d) {
      return d3.interpolateRgb(d.spineColor, "#000")(0.12);
    })
    .attr("d", function (d, i) {
      if (!singleColumn && i % 2 == 0) {
        return connect(x, d.x + d.spineWidth - margin.left, d.y, d.y1, leftState);
      } else {
        return connect(x, d.x - margin.left, d.y, d.y1, rightState);
      }
    });

  svg
    .selectAll(".dot")
    .data(read)
    .enter()
    .append("circle")
    .attr("class", "dot")
    .attr("r", 3)
    .attr("cx", x)
    .attr("cy", function (d) { return y(d.read); })
    .style("fill", function (d) {
      return d3.interpolateRgb(d.spineColor, "#000")(0.12);
    });
}

function stars(n) {
  var result = "";
  for (var i = 0; i < 5; i++) {
    if (i < n) {
      result += "★";
    } else {
      result += "☆";
    }
  }
  return result;
}

function timelineSmall(id, range) {
  var node = document.getElementById(id);
  var margin = { top: 0, right: 18, bottom: 20, left: 18 };
  var width =
    parseInt(
      window.getComputedStyle(node.parentNode).getPropertyValue("width"),
    ) -
    margin.right -
    margin.left;
  var height = compactBooks.matches ? 100 : 70;
  var svg = d3
    .select(node)
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var readInRange = _.filter(read, function (b) {
    return b.read >= range[0] && b.read < range[1];
  });
  var domain = d3.extent(_.map(readInRange, "read"));
  var x = d3.scaleLinear().domain(range).rangeRound([0, width]);

  var simulation = d3
    .forceSimulation(readInRange)
    .force(
      "x",
      d3
        .forceX(function (d) {
          return x(d.read);
        })
        .strength(1),
    )
    .force("y", d3.forceY(height / 2))
    .force("collide", d3.forceCollide(3))
    .stop();

  for (var i = 0; i < 120; ++i) simulation.tick();

  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", "translate(0," + height + ")")
    .call(
      d3
        .axisBottom(x)
        .tickValues(yearTicks(domain, width))
        .tickFormat(function (x) {
          return moment(x).format("YYYY");
        }),
    );

  var cell = svg
    .append("g")
    .attr("class", "cells")
    .selectAll("g")
    .data(
      d3
        .voronoi()
        .extent([
          [-margin.left, -margin.top],
          [width + margin.right, height + margin.top],
        ])
        .x(function (d) {
          return d.x;
        })
        .y(function (d) {
          return d.y;
        })
        .polygons(readInRange).filter(Boolean),
    )
    .enter()
    .append("g");

  cell
    .append("circle")
    .attr("r", 2)
    .style("fill", function (d) {
      return color(d.data.rating);
    })
    .attr("cx", function (d) {
      return d.data.x;
    })
    .attr("cy", function (d) {
      return d.data.y;
    });

  cell.append("path").attr("d", function (d) {
    return "M" + d.join("L") + "Z";
  });

  attachBookChartPreviews(cell);
}

function distribution() {
  var node = document.getElementById("rating-distribution");
  var margin = { top: 20, right: 10, bottom: 30, left: 20 };
  var width =
    parseInt(
      window.getComputedStyle(node.parentNode).getPropertyValue("width"),
    ) -
    margin.right -
    margin.left;
  var height = 100;
  var svg = d3
    .select(node)
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var distribution = _.mapValues(_.groupBy(read, "rating"), function (l) {
    return l.length;
  });

  var x = d3
    .scaleLinear()
    .domain([0, _.max(_.values(distribution))])
    .rangeRound([0, width]);

  var y = d3
    .scaleBand()
    .domain(_.chain(distribution).keys().reverse().value())
    .range([0, height])
    .round(true)
    .padding([0.1]);

  var xAxis = d3.axisBottom().scale(x).ticks(tickCount(width));

  var yAxis = d3.axisLeft().scale(y);

  svg
    .selectAll(".bar")
    .data(_.toPairs(distribution))
    .enter()
    .append("rect")
    .attr("class", "bar")
    .style("fill", function (d) {
      return color(parseInt(d[0], 10));
    })
    .attr("x", x(0))
    .attr("y", function (d) {
      return y(d[0]);
    })
    .attr("width", function (d) {
      return Math.abs(x(d[1]) - x(0));
    })
    .attr("height", y.bandwidth());

  svg
    .append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

  svg
    .append("g")
    .attr("class", "y axis")
    .attr("transform", "translate(" + x(0) + ",0)")
    .call(yAxis);
}

function timelinePublications(id, height, domain) {
  var node = document.getElementById(id);
  var margin = { top: 0, right: 20, bottom: 20, left: 20 };
  if (compactBooks.matches) height = Math.round(height * 1.4);
  var width =
    parseInt(
      window.getComputedStyle(node.parentNode).getPropertyValue("width"),
    ) -
    margin.right -
    margin.left;
  var svg = d3
    .select(node)
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var published = _.filter(read, function (b) {
    return (
      b.published.isValid() &&
      b.published >= domain[0] &&
      b.published < domain[1]
    );
  });
  var x = d3.scaleLinear().domain(domain).range([0, width]);

  var simulation = d3
    .forceSimulation(published)
    .force(
      "x",
      d3
        .forceX(function (d) {
          return x(d.published);
        })
        .strength(1),
    )
    .force("y", d3.forceY(height / 2))
    .force("collide", d3.forceCollide(3))
    .stop();

  for (var i = 0; i < 500; ++i) simulation.tick();

  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", "translate(0," + height + ")")
    .call(
      d3.axisBottom(x).tickValues(yearTicks(domain, width)).tickFormat(function (x) {
        return moment(x).format("YYYY");
      }),
    );

  var polygons = d3
    .voronoi()
    .extent([
      [-margin.left, -margin.top],
      [width + margin.right, height + margin.top],
    ])
    .x(function (d) {
      return d.x;
    })
    .y(function (d) {
      return d.y;
    })
    .polygons(published).filter(Boolean);

  var cell = svg
    .append("g")
    .attr("class", "cells")
    .selectAll("g")
    .data(polygons)
    .enter()
    .append("g");

  cell
    .append("circle")
    .attr("r", 2)
    .style("fill", function (d) {
      return color(d.data.rating);
    })
    .attr("cx", function (d) {
      return d.data.x;
    })
    .attr("cy", function (d) {
      return d.data.y;
    });

  cell.append("path").attr("d", function (d) {
    return "M" + d.join("L") + "Z";
  });

  attachBookChartPreviews(cell);
}

function pageCount() {
  var node = document.getElementById("page-count");
  var margin = { top: 20, right: 20, bottom: 30, left: 10 };
  var width =
    parseInt(
      window.getComputedStyle(node.parentNode).getPropertyValue("width"),
    ) -
    margin.right -
    margin.left;
  var height = compactBooks.matches ? 130 : 100;
  var svg = d3
    .select(node)
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var readWithCount = _.filter(read, function (b) {
    return b.pageCount > 0;
  });
  var domain = [0, _.max(_.map(readWithCount, "pageCount"))];
  var x = d3.scaleLinear().domain(domain).rangeRound([0, width]).nice();

  var simulation = d3
    .forceSimulation(readWithCount)
    .force(
      "x",
      d3
        .forceX(function (d) {
          return x(d.pageCount);
        })
        .strength(1),
    )
    .force("y", d3.forceY(height / 2))
    .force("collide", d3.forceCollide(3))
    .stop();

  for (var i = 0; i < 120; ++i) simulation.tick();

  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x).ticks(tickCount(width)));

  var cell = svg
    .append("g")
    .attr("class", "cells")
    .selectAll("g")
    .data(
      d3
        .voronoi()
        .extent([
          [-margin.left, -margin.top],
          [width + margin.right, height + margin.top],
        ])
        .x(function (d) {
          return d.x;
        })
        .y(function (d) {
          return d.y;
        })
        .polygons(readWithCount).filter(Boolean),
    )
    .enter()
    .append("g");

  cell
    .append("circle")
    .attr("r", 2)
    .style("fill", function (d) {
      return color(d.data.rating);
    })
    .attr("cx", function (d) {
      return d.data.x;
    })
    .attr("cy", function (d) {
      return d.data.y;
    });

  cell.append("path").attr("d", function (d) {
    return "M" + d.join("L") + "Z";
  });

  attachBookChartPreviews(cell);
}

function pagePerYear() {
  var distribution = _.mapValues(
    _.groupBy(read, function (b) {
      return b.read.year();
    }),
    function (l) {
      return _.reduce(_.map(l, "pageCount"), add, 0);
    },
  );

  var node = document.getElementById("page-per-year");
  var margin = { top: 20, right: 20, bottom: 30, left: 40 };
  var width =
    parseInt(
      window.getComputedStyle(node.parentNode).getPropertyValue("width"),
    ) -
    margin.right -
    margin.left;
  var height = _.size(distribution) * 11;
  var svg = d3
    .select(node)
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


  var x = d3
    .scaleLinear()
    .domain([0, _.max(_.values(distribution))])
    .rangeRound([0, width])
    .nice();

  var y = d3
    .scaleBand()
    .domain(_.chain(distribution).keys().reverse().value())
    .range([0, height])
    .round(true)
    .padding([0.1]);

  var xAxis = d3.axisBottom().scale(x).ticks(tickCount(width)).tickFormat(d3.formatPrefix("1.0", 1e3));

  var yAxis = d3.axisLeft().scale(y);

  svg
    .selectAll(".bar")
    .data(_.toPairs(distribution))
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", x(0))
    .attr("y", function (d) {
      return y(d[0]);
    })
    .attr("width", function (d) {
      return Math.abs(x(d[1]) - x(0));
    })
    .attr("height", y.bandwidth());

  svg
    .append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

  svg
    .append("g")
    .attr("class", "y axis")
    .attr("transform", "translate(" + x(0) + ",0)")
    .call(yAxis);
}

function bookPerYear() {

  var distribution = _.mapValues(
    _.groupBy(read, function (b) {
      return b.read.year();
    }),
    function (l) {
      return l.length;
    },
  );

  var node = document.getElementById("book-per-year");
  var margin = { top: 20, right: 20, bottom: 30, left: 40 };
  var width =
    parseInt(
      window.getComputedStyle(node.parentNode).getPropertyValue("width"),
    ) -
    margin.right -
    margin.left;
  var height = _.size(distribution) * 11;
  var svg = d3
    .select(node)
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


  var x = d3
    .scaleLinear()
    .domain([0, _.max(_.values(distribution))])
    .rangeRound([0, width])
    .nice();

  var y = d3
    .scaleBand()
    .domain(_.chain(distribution).keys().reverse().value())
    .range([0, height])
    .round(true)
    .padding([0.1]);

  var xAxis = d3.axisBottom().scale(x).ticks(tickCount(width));

  var yAxis = d3.axisLeft().scale(y);

  svg
    .selectAll(".bar")
    .data(_.toPairs(distribution))
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", x(0))
    .attr("y", function (d) {
      return y(d[0]);
    })
    .attr("width", function (d) {
      return Math.abs(x(d[1]) - x(0));
    })
    .attr("height", y.bandwidth());

  svg
    .selectAll(".count")
    .data(_.toPairs(distribution))
    .enter()
    .append("text")
    .attr("class", "count")
    .attr("dy", "0.32em")
    .attr("dx", "-0.2em")
    .attr("x", function (d) {
      return x(d[1]);
    })
    .attr("y", function (d) {
      return y(d[0]) + y.bandwidth() / 2;
    })
    .text(function (d) {
      return d[1];
    });

  svg
    .append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

  svg
    .append("g")
    .attr("class", "y axis")
    .attr("transform", "translate(" + x(0) + ",0)")
    .call(yAxis);
}

function covers(id, list) {
  var node = document.getElementById(id);
  var container = d3.select(node);
  var data = _.chain(list)
    .sortBy("averageRating")
    .reverse()
    .groupBy("rating")
    .values()
    .reverse()
    .value();
  var cardGroup = container.selectAll(".book-group").data(data);

  var enter = cardGroup.enter().append("div").attr("class", "book-group");

  enter
    .append("div")
    .attr("class", "star")
    .text(function (d) {
      return stars(d[0].rating);
    });

  cardGroup.select(".star").text(function (d) {
    return stars(d[0].rating);
  });

  var card = cardGroup
    .merge(enter)
    .selectAll(".book-cover")
    .data(function (d, i) {
      return d;
    });

  var entered = card.enter().append("a").attr("class", "book-cover");
  entered.append("img")
    .attr("loading", "lazy")
    .attr("decoding", "async")
    .on("error", function (d) {
      var fallback = "/public/covers/" + d.id + ".jpg";
      if (this.getAttribute("src") !== fallback) {
        this.setAttribute("src", fallback);
      }
    });

  var all = card.merge(entered)
    .attr("href", linkToBook)
    .attr("target", "_blank")
    .attr("rel", "noopener noreferrer")
    .attr("title", null)
    .on("click", function (d) {
      d3.event.preventDefault();
      window.open(linkToBook(d), "_blank");
    })
    .attr("aria-label", function (d) { return d.fullTitle + " by " + d.author; });
  all.select("img")
    .attr("src", function (d) { return "/public/covers/" + d.id + ".avif"; })
    .attr("alt", function (d) { return d.fullTitle; });
  attachBookPreviews(all.nodes(), false);

  function destroyPreview() {
    if (this._tippy) this._tippy.destroy();
  }
  card.exit().each(destroyPreview).remove();
  cardGroup.exit().selectAll(".book-cover").each(destroyPreview);
  cardGroup.exit().remove();
}

function tags() {
  var node = document.getElementById("tags");
  var selectNode = document.getElementById("filter-select");
  var allTags = [];
  allTags.push({name: 'all', tag: 'None', books: read});
  for (var s of shelves) {
    allTags.push({name: s, tag: 'Shelf', books: read.filter(b => _.includes(b.bookshelves, s))});
  }

  _.chain(read)
    .groupBy(b => b.read.year())
    .each((books, year) => allTags.push({name: year.toString(), books, tag: 'Read Year'}))
    .value()

  _.chain(read)
    .groupBy(b => b.author)
    .each((books, author) => {
      if (books.length > 2) {
        allTags.push({name: author, books, tag: 'Author'});
      }
    })
    .value()

  _.chain(read)
    .filter(b => b.published.isValid())
    .groupBy(b => `${Math.floor(b.published.year() / 10) * 10}s`)
    .each((books, decade) => {
      allTags.push({name: decade, books, tag: 'Published Decade'});
    })
    .value()

  const pageCounts = read.map(b => b.pageCount);

  const bins = d3.histogram()
        .domain(d3.extent(pageCounts))
        .thresholds(10)(pageCounts);

  _.chain(read)
    .filter(b => b.pageCount > 0)
    .groupBy(b => {
      const bin = bins.find(bin => b.pageCount >= bin.x0 && b.pageCount <= bin.x1);
      return `${bin.x0} - ${bin.x1}`;
    })
    .each((books, range) => {
      allTags.push({name: range, books, tag: 'Page Count'});
    })
    .value()



  d3.select(selectNode)
    .selectAll("option")
    .data(_.uniq(_.map(allTags, d => d.tag)))
    .enter()
    .append("option")
    .attr("value", d => d)
    .text(d => d);

  const collator = new Intl.Collator(undefined, {
    numeric: true
  });

  d3.select(selectNode)
    .on('change', function(event) {
      const selected = d3.select(this).property("value");
      const selection = d3.select(node)
            .selectAll(".tag")
            .data(allTags.filter(d => d.tag == selected).sort((a, b) => collator.compare(a.name, b.name)));

      selection.exit().remove();

      selection
        .enter()
        .append("a")
        .attr("class", "tag")
        .on("click", function (d) {
          d3.select(node).selectAll(".tag").classed("active", false);
          d3.select(this).classed("active", true);
          covers("covers", d.books);
        })
        .merge(selection)
        .html(function (d) {
          return d.name + ' <span class="tag-count">' + d.books.length + "</span>";
        });

        d3.select(node).selectAll(".tag").filter(":last-child").dispatch("click");
    });

  selectNode.value = 'None';
  selectNode.dispatchEvent(new Event('change'));
}

function bookPerShelf() {
  var node = document.getElementById("book-per-shelf");
  var margin = { top: 20, right: 20, bottom: 30, left: 120 };
  var width =
    parseInt(
      window.getComputedStyle(node.parentNode).getPropertyValue("width"),
    ) -
    margin.right -
    margin.left;
  var height = 200;
  var svg = d3
    .select(node)
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var distribution = _.chain(read)
    .map("bookshelves")
    .flatten()
    .without("", "own")
    .groupBy()
    .mapValues(function (l) {
      return l.length;
    })
    .value();

  var x = d3
    .scaleLinear()
    .domain([0, _.max(_.values(distribution))])
    .rangeRound([0, width])
    .nice();

  var y = d3
    .scaleBand()
    .domain(_.chain(distribution).keys().reverse().value())
    .range([0, height])
    .round(true)
    .padding([0.2]);

  var xAxis = d3.axisBottom().scale(x).ticks(tickCount(width));

  var yAxis = d3.axisLeft().scale(y);

  svg
    .selectAll(".bar")
    .data(_.toPairs(distribution))
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", x(0))
    .attr("y", function (d) {
      return y(d[0]);
    })
    .style("fill", function (d) {
      return shelfColor(d[0]);
    })
    .attr("width", function (d) {
      return Math.abs(x(d[1]) - x(0));
    })
    .attr("height", y.bandwidth());

  svg
    .selectAll(".count")
    .data(_.toPairs(distribution))
    .enter()
    .append("text")
    .attr("class", "count")
    .attr("dy", "0.32em")
    .attr("dx", "0.2em")
    .attr("x", function (d) {
      return x(d[1]);
    })
    .attr("y", function (d) {
      return y(d[0]) + y.bandwidth() / 2;
    })
    .text(function (d) {
      return d[1];
    });

  svg
    .append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

  svg
    .append("g")
    .attr("class", "y axis")
    .attr("transform", "translate(" + x(0) + ",0)")
    .call(yAxis);
}

function timelineShelf(id, range) {
  var node = document.getElementById(id);
  var margin = { top: 5, right: 15, bottom: 20, left: 15 };
  var width =
    parseInt(
      window.getComputedStyle(node.parentNode).getPropertyValue("width"),
    ) -
    margin.right -
    margin.left;
  var height = 80;
  var svg = d3
    .select(node)
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var base = _.chain(shelves)
    .map(function (shelf) {
      return [shelf, 0];
    })
    .fromPairs()
    .value();

  var ticks = [];
  var start = range[0].clone();
  while (start <= range[1]) {
    ticks.push(start.clone());
    start.add(1, "month");
  }

  var data = _.chain(ticks)
    .map(function (month) {
      var distribution = _.chain(read)
        .filter(function (b) {
          return (
            month.isSame(b.read, "month") || month.isBetween(b.started, b.read)
          );
        })
        .map(function (b) {
          var shelves = _.without(b.bookshelves, "", "own");
          var generic = ["non-fiction", "fiction", "programming"];
          while (generic.length > 0 && shelves.length > 1) {
            shelves = _.without(shelves, generic.shift());
          }
          return shelves;
        })
        .flatten()
        .groupBy()
        .mapValues(function (l) {
          return l.length;
        })
        .value();
      distribution.month = month;
      return _.extend({}, base, distribution);
    })
    .value();

  var stack = d3
    .stack()
    .keys(shelves)
    .order(d3.stackOrderInsideOut)
    .offset(d3.stackOffsetExpand);

  var series = stack(data);

  var x = d3.scaleLinear().domain(range).range([0, width]);

  var xAxis = d3
    .axisBottom(x)
    .tickValues(yearTicks(range, width))
    .tickFormat(function (x) {
      return moment(x).format("YYYY");
    });

  function stackMax(layer) {
    return d3.max(layer, function (d) {
      return d[1];
    });
  }

  function stackMin(layer) {
    return d3.min(layer, function (d) {
      return d[0];
    });
  }

  var y = d3
    .scaleLinear()
    .domain([d3.min(series, stackMin), d3.max(series, stackMax)])
    .range([height, 0]);

  var area = d3
    .area()
    .x(function (d) {
      return x(d.data.month);
    })
    .y0(function (d) {
      return y(d[0]);
    })
    .y1(function (d) {
      return y(d[1]);
    })
    .curve(d3.curveStepAfter);

  svg
    .append("g")
    .selectAll("path")
    .data(series)
    .enter()
    .append("path")
    .attr("d", area)
    .style("fill", function (d) {
      return shelfColor(d.key);
    })
    .append("title")
    .text(function (d) { return d.key; });

  svg
    .append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);
}

function authors() {
  var node = document.getElementById("authors");
  var margin = { top: 30, right: 20, bottom: 30, left: 20 };
  var width =
    parseInt(
      window.getComputedStyle(node.parentNode).getPropertyValue("width"),
    ) -
    margin.right -
    margin.left;
  var height = compactBooks.matches ? 140 : 100;
  var svg = d3
    .select(node)
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var authors = _.groupBy(read, "author");

  var domain = d3.extent(_.chain(authors).values().map("length").value());
  var x = d3.scaleLinear().domain(domain).rangeRound([0, width]);

  var radius = d3.scaleLinear().domain(domain).range([1, 10]);

  var data = _.toPairs(authors);
  var simulation = d3
    .forceSimulation(data)
    .force(
      "x",
      d3
        .forceX(function (d) {
          return x(d[1].length);
        })
        .strength(1),
    )
    .force("y", d3.forceY(height / 2))
    .force(
      "collide",
      d3.forceCollide().radius(function (d) {
        return radius(d[1].length) + 1;
      }),
    )
    .stop();

  for (var i = 0; i < 120; ++i) simulation.tick();

  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x).ticks(tickCount(width)));

  var count = _.chain(authors).values().groupBy("length").value();
  svg
    .append("g")
    .attr("class", "axis top")
    .attr("transform", "translate(0,10)")
    .call(
      d3.axisTop(x).ticks(tickCount(width)).tickFormat(function (x) {
        return count[x] ? count[x].length : 0;
      }),
    );

  var cell = svg
    .append("g")
    .attr("class", "cells")
    .selectAll("g")
    .data(
      d3
        .voronoi()
        .extent([
          [-margin.left, -margin.top],
          [width + margin.right, height + margin.top],
        ])
        .x(function (d) {
          return d.x;
        })
        .y(function (d) {
          return d.y;
        })
        .polygons(data).filter(Boolean),
    )
    .enter()
    .append("g");

  cell
    .append("circle")
    .attr("r", function (d) {
      return radius(d.data[1].length);
    })
    .style("fill", color(3))
    .attr("cx", function (d) {
      return d.data.x;
    })
    .attr("cy", function (d) {
      return d.data.y;
    });

  cell.append("path").attr("d", function (d) {
    return "M" + d.join("L") + "Z";
  });

  cell.attr("tabindex", 0).attr("role", "img")
    .attr("aria-label", function (d) { return d.data[0] + ", " + d.data[1].length + " books"; });
  attachPreviews(cell.nodes(), function (d) { return authorPreviewContent(d.data); });
}

var renderedChartSize;

function renderCharts() {
  var stats = document.getElementById("reading-stats");
  var spine = document.getElementById("reading-timeline");
  var size = [stats.clientWidth, spine.clientWidth, compactBooks.matches].join(":");
  if (size === renderedChartSize) return;
  renderedChartSize = size;

  // Keep the cover selection; only rebuild charts whose geometry depends on width.
  bookPreviews.forEach(function (preview) {
    if (preview.reference.ownerSVGElement) preview.destroy();
  });
  d3.selectAll(".books svg").selectAll("*").remove();

  var nextYear = (new Date().getFullYear() + 1).toString();
  var breakAt = year("1970");
  timeline();
  timelineSmall("timeline-small-1", [year("2009"), year("2017")]);
  timelineSmall("timeline-small-2", [year("2017"), year(nextYear)]);
  distribution();
  timelinePublications("timeline-publication-too-old", 30, [year("-1000"), year("1800")]);
  timelinePublications("timeline-publication-old", 50, [year("1800"), breakAt.clone()]);
  timelinePublications("timeline-publication-current", 75, [breakAt.clone(), moment()]);
  pageCount();
  pagePerYear();
  bookPerYear();
  authors();
  bookPerShelf();
  timelineShelf("timeline-shelf-1", [year("2009"), year("2017")]);
  timelineShelf("timeline-shelf-2", [year("2017"), year(nextYear)]);
}

renderCharts();
tags();
window.addEventListener("resize", _.debounce(renderCharts, 200));
