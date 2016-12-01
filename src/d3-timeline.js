// vim: ts=2 sw=2
(function () {
  d3.timeline = function() {
    var hover = function () {},
        mouseover = function () {},
        mouseout = function () {},
        labelmouseover = function () {},
        labelmouseout = function () {},
        click = function () {},
        scroll = function () {},
        labelFunction = function(label) { return label; },
        navigateLeft = function () {},
        navigateRight = function () {},
        orient = "bottom",
        width = null,
        height = null,
        rowSeparatorsColor = null,
        backgroundColor = null,
        tickFormat = { format: d3.time.format("%I %p"),
          tickTime: d3.time.hours,
          tickInterval: 1,
          tickSize: 6,
          tickValues: null
        },
        colorCycle = d3.scale.category20(),
        colorPropertyName = null,
        beginning = 0,
        labelMargin = 0,
        ending = 0,
        startDatePosition = 0,
        margin = {left: 30, right:30, top: 30, bottom:30},
        rotateTicks = false,
        itemHeight = 20,
        itemMargin = 5,
        navMargin = 60,
        showTimeAxis = true,
        showAxisTop = false,
        showTodayLine = false,
        timeAxisTick = false,
        timeAxisTickFormat = {stroke: "stroke-dasharray", spacing: "4 10"},
        showTodayFormat = {marginTop: 25, marginBottom: 0, width: 1, color: colorCycle},
        showBorderLine = false,
        showBorderFormat = {marginTop: 25, marginBottom: 0, width: 1, color: colorCycle},
        showAxisHeaderBackground = false,
        showAxisNav = false,
        showAxisCalendarYear = false,
        axisBgColor = "white",
        chartData = {};

    function appendTimeAxis(g, xAxis, yPosition) {
      if (showAxisHeaderBackground){ appendAxisHeaderBackground(g, 0, 0); }

      if (showAxisNav){ appendTimeAxisNav(g) };

      var axis = g.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(" + 0 + "," + yPosition + ")")
        .call(xAxis);
    }

    function appendTimeAxisCalendarYear(nav) {
      var calendarLabel = beginning.getFullYear();

      if (beginning.getFullYear() != ending.getFullYear()) {
        calendarLabel = beginning.getFullYear() + "-" + ending.getFullYear()
      }

      nav.append("text")
        .attr("transform", "translate(" + 20 + ", 0)")
        .attr("x", 0)
        .attr("y", 14)
        .attr("class", "calendarYear")
        .text(calendarLabel)
      ;
    };
    function appendTimeAxisNav(g) {
      var timelineBlocks = 6;
      var leftNavMargin = (margin.left - navMargin);
      var incrementValue = (width - margin.left)/timelineBlocks;
      var rightNavMargin = (width - margin.right - incrementValue + navMargin);

      var nav = g.append('g')
          .attr("class", "axis")
          .attr("transform", "translate(0, 20)")
        ;

      if (showAxisCalendarYear) { appendTimeAxisCalendarYear(nav) };

      nav.append("text")
        .attr("transform", "translate(" + leftNavMargin + ", 0)")
        .attr("x", 0)
        .attr("y", 14)
        .attr("class", "chevron")
        .text("<")
        .on("click", function () {
          return navigateLeft(beginning, chartData);
        })
      ;

      nav.append("text")
        .attr("transform", "translate(" + rightNavMargin + ", 0)")
        .attr("x", 0)
        .attr("y", 14)
        .attr("class", "chevron")
        .text(">")
        .on("click", function () {
          return navigateRight(ending, chartData);
        })
      ;
    };

    function appendAxisHeaderBackground(g, xAxis, yAxis) {
      g.insert("rect")
        .attr("class", "timeline-background")
        .attr("x", xAxis)
        .attr("width", width)
        .attr("y", yAxis)
        .attr("height", itemHeight)
        .attr("fill", axisBgColor);
    };

    function appendTimeAxisTick(g, xAxis, maxStack) {
      g.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(" + 0 + "," + (margin.top + (itemHeight + itemMargin) * maxStack) + ")")
        .attr(timeAxisTickFormat.stroke, timeAxisTickFormat.spacing)
        .call(xAxis.tickFormat("").tickSize(-(margin.top + (itemHeight + itemMargin) * (maxStack - 1) + 3), 0, 0));
    };

    function timeline(gParent) {
      var g = gParent.append("g");
      var gParentSize = gParent[0][0].getBoundingClientRect();

      var gParentItem = d3.select(gParent[0][0]);

      var yAxisMapping = {},
        maxStack = 1,
        minTime = 0,
        maxTime = 0;

      setWidth();

      // check how many stacks we're gonna need
      // do this here so that we can draw the axis before the graph
      g.each(function (d, i) {
        d.forEach(function (datum, index) {

          // create y mapping for stacked graph
          yAxisMapping[index] = maxStack++;

          minTime = d3.min(datum.times, function (time) { return time.starting_time; });
          maxTime = d3.max(datum.times, function (time) { return time.ending_time; });
        });
      });

      // figure out beginning and ending times if they are unspecified
      if (!beginning) beginning = minTime;
      if (!ending) ending = maxTime;

      var scaleFactor = (width - margin.left - margin.right) / (ending - beginning);

      // draw the axis
      var xScale = d3.time.scale()
        .domain([beginning, ending])
        .range([margin.left, width - margin.right]);

      var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient(orient)
        .tickFormat(tickFormat.format)
        .tickSize(tickFormat.tickSize);

      if (tickFormat.tickValues != null) {
        xAxis.tickValues(tickFormat.tickValues);
      } else {
        xAxis.ticks(tickFormat.numTicks || tickFormat.tickTime, tickFormat.tickInterval);
      }

      function drawChart(g, d) {
        g.selectAll('g').data(d).enter()
          .append('g')
          .each(function (datum, index) {
            var data = datum.times;

            gLine = d3.select(this)
              .attr("transform", "translate(0 " + (itemHeight + itemMargin) * yAxisMapping[index] + ")")
              .attr("class", "timeline-series timeline-series-" + (datum.class || index));

            // issue warning about using id per data set. Ids should be individual to data elements
            if (typeof(datum.id) != "undefined") {
              console.warn("d3Timeline Warning: Ids per dataset is deprecated in favor of a 'class' key. Ids are now per data element.");
            }

            if (backgroundColor) {
              gLine.append("rect")
                .attr("class", "timeline-background")
                .attr("width", "100%")
                .attr("height", itemHeight)
                .attr("fill", backgroundColor instanceof Function ? backgroundColor(datum, index) : backgroundColor);
            }

            gLine.selectAll('.timeline-bar').data(data).enter()
              .append('rect')
              .attr("class", "timeline-bar")
              .attr("x", getXPos)
              .attr("width", function (d, i) {
                return (d.ending_time - d.starting_time) * scaleFactor;
              })
              .attr("height", itemHeight)
              .attr("fill", function(d, i){
                var dColorPropName;
                if (d.color) return d.color;
                if (colorPropertyName){
                  dColorPropName = d[colorPropertyName];
                  if ( dColorPropName ) {
                    return colorCycle( dColorPropName );
                  } else {
                    return colorCycle( datum[colorPropertyName] );
                  }
                }
                return colorCycle(index);
              })
              .on("mousemove", function (d, i) {
                hover(d, index, datum);
              })
              .on("mouseover", function (d, i) {
                mouseover(d, i, datum);
              })
              .on("mouseout", function (d, i) {
                mouseout(d, i, datum);
              })
              .on("click", function (d, i) {
                click(d, index, datum);
              })
              .attr("id", function(d, i) {
                // use deprecated id field
                if (datum.id && !d.id) {
                  return 'timelineItem_'+datum.id;
                }

                return d.id ? d.id : "timelineItem_"+index+"_"+i;
              });

            gLine.selectAll('.timeline-text').data(data).enter()
              .append("text")
              .attr("class", "timeline-text")
              .attr("x", getXTextPos)
              .attr("y", itemHeight*0.75)
              .text(function(d) {
                return d.label;
              })
              .attr("text-anchor", function (d) {
                return d.alignLabel == "center" ? "middle" : "start";
              });

            if (rowSeparatorsColor) {
              gLine.append("svg:line")
                .attr("class", "row-separator")
                .attr("x2", "100%")
                .attr("y1", itemHeight + itemMargin / 2)
                .attr("y2", itemHeight + itemMargin / 2)
                .attr("stroke-width", 1)
                .attr("stroke", rowSeparatorsColor);
            }
          });
      }

      function drawLabel(g, d) {
        g.selectAll('g').data(d).enter()
          .append('g')
          .each(function (datum, index) {
            var data = datum.times;

            gLine = d3.select(this)
              .attr("transform", "translate(0 " + (itemHeight + itemMargin) * yAxisMapping[index] + ")")
              .attr("class", "timeline-series timeline-series-" + (datum.class || index));

            // add the label
            if (datum.label != null) {
              var fullItemHeight = itemHeight + itemMargin;

              gLine.append("text")
                .attr("class", "timeline-label")
                .attr("transform", "translate(" + labelMargin + "," + (fullItemHeight/2) + ")")
                .text(labelFunction(datum.label))
                .on("click", function (d, i) { click(d, index, datum); })
                .on("mouseover", function (d, i) {
                  labelmouseover(d, i, datum);
                })
                .on("mouseout", function (d, i) {
                  labelmouseout(d, i, datum);
                });
            }

            if (datum.icon != null) {
              gLine.append("image")
                .attr("class", "timeline-label")
                .attr("xlink:href", datum.icon)
                .attr("width", "100%")
                .attr("height", itemHeight)
                .on("click", function (d, i) { click(d, index, datum); })
                .on("labelmouseover", function (d, i) {
                  labelmouseover(d, i, datum);
                })
                .on("labelmouseout", function (d, i) {
                  labelmouseout(d, i, datum);
                });
            }
          });
      }

      // draw the chart
      g.each(function(d, i) {
        g.append('svg')
          .attr('width', width - margin.right - margin.left)
          .attr('x', margin.left)
          .attr('y', margin.top)
          .attr('class', 'timeline-series-block')
          .call(drawChart, d);
        g.append('svg')
          .attr('width', margin.left)
          .attr('x', 0)
          .attr('y', margin.top)
          .attr('class', 'timeline-label-block')
          .call(drawLabel, d);
      });

      var belowLastItem = (margin.top + (itemHeight + itemMargin) * maxStack);
      var aboveFirstItem = margin.top;
      var timeAxisYPosition = showAxisTop ? aboveFirstItem : belowLastItem;
      if (showTimeAxis) { appendTimeAxis(g, xAxis, timeAxisYPosition); }
      if (timeAxisTick) { appendTimeAxisTick(g, xAxis, maxStack); }

      if (width > gParentSize.width) {
        var move = function() {
          var x = Math.min(0, Math.max(gParentSize.width - width, d3.event.translate[0]));
          zoom.translate([x, 0]);
          g.attr("transform", "translate(" + x + ",0)");
          scroll(x*scaleFactor, xScale);
        };

        var zoom = d3.behavior.zoom().x(xScale).on("zoom", move);

        gParent
          .attr("class", "scrollable")
          .call(zoom);


        if (startDatePosition && beginning <= startDatePosition && startDatePosition <= ending) {
          var x = - (getXPos({starting_time: startDatePosition}) - margin.left);
          zoom.translate([x, 0]);
          g.attr("transform", "translate(" + x + ",0)");
          scroll(x*scaleFactor, xScale);
        }
      }

      if (rotateTicks) {
        g.selectAll(".tick text")
          .attr("transform", function(d) {
            return "rotate(" + rotateTicks + ")translate("
              + (this.getBBox().width / 2 + 10) + "," // TODO: change this 10
              + this.getBBox().height / 2 + ")";
          });
      }

      var gSize = g[0][0].getBoundingClientRect();
      setHeight();

      if (showBorderLine) {
        g.each(function (d, i) {
          d.forEach(function (datum) {
            var times = datum.times;
            times.forEach(function (time) {
              appendLine(xScale(time.starting_time), showBorderFormat);
              appendLine(xScale(time.ending_time), showBorderFormat);
            });
          });
        });
      }

      if (showTodayLine) {
        var todayLine = xScale(new Date());
        appendLine(todayLine, showTodayFormat);
      }

      function getXPos(d, i) {
        return (d.starting_time - beginning) * scaleFactor;
      }

      function getXTextPos(d, i) {
        var startingPos = (d.starting_time - beginning) * scaleFactor;
        var endingPos = (d.ending_time - beginning) * scaleFactor;
        if (d.alignLabel == "center") {
          return startingPos + (endingPos - startingPos) / 2;
        } else {
          return startingPos + 5;
        }
      }

      function setHeight() {
        if (!height && !gParentItem.attr("height")) {
          if (itemHeight) {
            // set height based off of item height
            height = gSize.height + gSize.top - gParentSize.top + margin.bottom;
            // set bounding rectangle height
            d3.select(gParent[0][0]).attr("height", height);
          } else {
            throw "height of the timeline is not set";
          }
        } else {
          if (!height) {
            height = gParentItem.attr("height");
          } else {
            gParentItem.attr("height", height);
          }
        }
      }

      function setWidth() {
        if (!width && !gParentSize.width) {
          try {
            width = gParentItem.attr("width");
            if (!width) {
              throw "width of the timeline is not set. As of Firefox 27, timeline().with(x) needs to be explicitly set in order to render";
            }
          } catch (err) {
            console.log( err );
          }
        } else if (!(width && gParentSize.width)) {
          try {
            width = gParentItem.attr("width");
          } catch (err) {
            console.log( err );
          }
        }
        // if both are set, do nothing
      }

      function appendLine(lineScale, lineFormat) {
        gParent.append("svg:line")
          .attr("x1", lineScale)
          .attr("y1", lineFormat.marginTop)
          .attr("x2", lineScale)
          .attr("y2", height - lineFormat.marginBottom)
          .style("stroke", lineFormat.color)//"rgb(6,120,155)")
          .style("stroke-width", lineFormat.width);
      }
    }

    // SETTINGS

    timeline.margin = function (p) {
      if (!arguments.length) return margin;
      margin = p;
      return timeline;
    };

    timeline.orient = function (orientation) {
      if (!arguments.length) return orient;
      orient = orientation;
      return timeline;
    };

    timeline.itemHeight = function (h) {
      if (!arguments.length) return itemHeight;
      itemHeight = h;
      return timeline;
    };

    timeline.minHeightByLabel = function (h) {
      if (!arguments.length) return minHeightByLabel;
      minHeightByLabel = h;
      return timeline;
    };

    timeline.itemMargin = function (h) {
      if (!arguments.length) return itemMargin;
      itemMargin = h;
      return timeline;
    };

    timeline.navMargin = function (h) {
      if (!arguments.length) return navMargin;
      navMargin = h;
      return timeline;
    };

    timeline.height = function (h) {
      if (!arguments.length) return height;
      height = h;
      return timeline;
    };

    timeline.width = function (w) {
      if (!arguments.length) return width;
      width = w;
      return timeline;
    };

    timeline.labelFormat = function(f) {
      if (!arguments.length) return labelFunction;
      labelFunction = f;
      return timeline;
    };

    timeline.tickFormat = function (format) {
      if (!arguments.length) return tickFormat;
      tickFormat = format;
      return timeline;
    };

    timeline.hover = function (hoverFunc) {
      if (!arguments.length) return hover;
      hover = hoverFunc;
      return timeline;
    };

    timeline.mouseover = function (mouseoverFunc) {
      if (!arguments.length) return mouseover;
      mouseover = mouseoverFunc;
      return timeline;
    };

    timeline.mouseout = function (mouseoutFunc) {
      if (!arguments.length) return mouseout;
      mouseout = mouseoutFunc;
      return timeline;
    };

    timeline.labelmouseover = function (labelmouseoverFunc) {
      if (!arguments.length) return labelmouseover;
      labelmouseover = labelmouseoverFunc;
      return timeline;
    };

    timeline.labelmouseout = function (labelmouseoutFunc) {
      if (!arguments.length) return labelmouseout;
      labelmouseout = labelmouseoutFunc;
      return timeline;
    };

    timeline.click = function (clickFunc) {
      if (!arguments.length) return click;
      click = clickFunc;
      return timeline;
    };

    timeline.scroll = function (scrollFunc) {
      if (!arguments.length) return scroll;
      scroll = scrollFunc;
      return timeline;
    };

    timeline.colors = function (colorFormat) {
      if (!arguments.length) return colorCycle;
      colorCycle = colorFormat;
      return timeline;
    };

    timeline.beginning = function (b) {
      if (!arguments.length) return beginning;
      beginning = b;
      return timeline;
    };

    timeline.ending = function (e) {
      if (!arguments.length) return ending;
      ending = e;
      return timeline;
    };

    timeline.labelMargin = function (m) {
      if (!arguments.length) return labelMargin;
      labelMargin = m;
      return timeline;
    };

    timeline.rotateTicks = function (degrees) {
      if (!arguments.length) return rotateTicks;
      rotateTicks = degrees;
      return timeline;
    };

    timeline.showBorderLine = function () {
      showBorderLine = !showBorderLine;
      return timeline;
    };

    timeline.showBorderFormat = function(borderFormat) {
      if (!arguments.length) return showBorderFormat;
      showBorderFormat = borderFormat;
      return timeline;
    };

    timeline.showToday = function () {
      showTodayLine = !showTodayLine;
      return timeline;
    };

    timeline.showTodayFormat = function(todayFormat) {
      if (!arguments.length) return showTodayFormat;
      showTodayFormat = todayFormat;
      return timeline;
    };

    timeline.colorProperty = function(colorProp) {
      if (!arguments.length) return colorPropertyName;
      colorPropertyName = colorProp;
      return timeline;
    };

    timeline.rowSeparators = function (color) {
      if (!arguments.length) return rowSeparatorsColor;
      rowSeparatorsColor = color;
      return timeline;

    };

    timeline.background = function (color) {
      if (!arguments.length) return backgroundColor;
      backgroundColor = color;
      return timeline;
    };

    timeline.showTimeAxis = function () {
      showTimeAxis = !showTimeAxis;
      return timeline;
    };

    timeline.showAxisTop = function () {
      showAxisTop = !showAxisTop;
      return timeline;
    };

    timeline.showAxisCalendarYear = function () {
      showAxisCalendarYear = !showAxisCalendarYear;
      return timeline;
    };

    timeline.showTimeAxisTick = function () {
      timeAxisTick = !timeAxisTick;
      return timeline;
    };

    timeline.showTimeAxisTickFormat = function(format) {
      if (!arguments.length) return timeAxisTickFormat;
      timeAxisTickFormat = format;
      return timeline;
    };

    timeline.showAxisHeaderBackground = function(bgColor) {
      showAxisHeaderBackground = !showAxisHeaderBackground;
      if (bgColor) { (axisBgColor = bgColor) };
      return timeline;
    };

    timeline.navigate = function (navigateBackwards, navigateForwards) {
      if (!arguments.length) return [navigateLeft, navigateRight];
      navigateLeft = navigateBackwards;
      navigateRight = navigateForwards;
      showAxisNav = !showAxisNav;
      return timeline;
    };

    timeline.startDatePosition = function(time) {
      if (!arguments.length) return startDatePosition;
      startDatePosition = time;
      return timeline;
    };

    return timeline;
  };
})();
