/**
 * visualization_planetary_boundaries.js
 *
 * Entry point for rendering the Planetary Boundaries sunburst chart.
 * Depends on D3.js and shared settings in eventHandlers.js.
 */

/**
 * app.renderVisualization1
 *
 * Renders the Planetary Boundaries sunburst chart.
 * - Loads data from CSV and builds hierarchical layout.
 * - Draws arc segments for each boundary category.
 * - Positions data points and logos within arcs.
 * - Handles interactions: tooltips and info panel.
 * - Adds filters for "Tech Radar Categories", "Industry", and "Region of activity".
 * - Displays an info panel with the visualization name and description upon rendering.
 */

app.renderVisualization1 = function() {
  app.visContainer.selectAll("*").interrupt().remove();
  const globalPlacedPoints = [];
  Math.seedrandom(31);

  function clearPersistent() {
    d3.selectAll(".company-logo").classed("selected", false);
    d3.selectAll(".company-circle").classed("selected", false);
    d3.selectAll(".arc-glow")
      .classed("persistent", false)
      .interrupt()
      .transition()
      .duration(400)
      .attr("stroke-width", 2);
    d3.selectAll(".Transversal-group circle")
      .classed("persistent", false)
      .interrupt()
      .transition()
      .duration(400)
      .attr("stroke-width", 2);
    d3.selectAll(".frozen").classed("frozen", false);
    d3.select("#subcat-title")
      .interrupt()
      .transition()
      .duration(400)
      .style("opacity", 0);
  }
  app.currentClearPersistent = clearPersistent;

  function getNonOverlappingPoint(arc, baseMarginFactor, placedPoints) {
    let currentMarginFactor = baseMarginFactor;
    const maxAdjustments = 5;

    for (let adjust = 0; adjust < maxAdjustments; adjust++) {
      const maxAttempts = 50;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        let radialStart = arc.y0;
        let radialEnd = arc.y1;

        if (arc.depth === 2) {
          radialStart = arc.y0 + (app.ringGap || 0);
          radialEnd = arc.y1 + (app.ringGap || 0) - (app.outerLeafReduction || 0);
        }

        let safeRadialStart = radialStart + currentMarginFactor * (app.pointRadius || 10) - 57;
        let safeRadialEnd = radialEnd - currentMarginFactor * (app.pointRadius || 10);

        if (safeRadialEnd <= safeRadialStart) {
          safeRadialStart = radialStart + (radialEnd - radialStart) * 0.3;
          safeRadialEnd = radialStart + (radialEnd - radialStart) * 0.7;
        }

        let avgRadius = (safeRadialStart + safeRadialEnd) / 2;
        let safeAngularMargin = currentMarginFactor * ((app.pointRadius || 10) / avgRadius);
        let safeAngleStart = arc.x0 + safeAngularMargin;
        let safeAngleEnd = arc.x1 - safeAngularMargin;

        if (safeAngleEnd <= safeAngleStart) {
          const angleDiff = arc.x1 - arc.x0;
          safeAngleStart = arc.x0 + angleDiff * 0.3;
          safeAngleEnd = arc.x0 + angleDiff * 0.7;
        }

        const angle = safeAngleStart + Math.random() * (safeAngleEnd - safeAngleStart);
        const r = safeRadialStart + Math.random() * (safeRadialEnd - safeRadialStart);
        const x = r * Math.cos(angle - Math.PI / 2);
        const y = r * Math.sin(angle - Math.PI / 2);

        if (isNaN(x) || isNaN(y)) continue;

        let collision = placedPoints.some(pt => {
          const dx = pt.x - x;
          const dy = pt.y - y;
          return Math.sqrt(dx * dx + dy * dy) < (app.pointSpacing || 12);
        });

        if (!collision) return { x, y };
      }
      currentMarginFactor *= 0.9;
    }

    console.warn("Could not find a non-overlapping point for arc", arc);
    const angle = arc.x0 + Math.random() * (arc.x1 - arc.x0);
    let radialStart = arc.y0;
    let radialEnd = arc.y1;

    if (arc.depth === 2) {
      radialStart = arc.y0 + (app.ringGap || 0);
      radialEnd = arc.y1 + (app.ringGap || 0) - (app.outerLeafReduction || 0);
    }

    const r = radialStart + Math.random() * (radialEnd - radialStart);
    const x = r * Math.cos(angle - Math.PI / 2);
    const y = r * Math.sin(angle - Math.PI / 2);

    return isNaN(x) || isNaN(y) ? { x: 0, y: 0 } : { x, y };
  }

  function getNonOverlappingPointForCircle(R, placedPoints, pointRadius, baseMarginFactor) {
    let currentMarginFactor = baseMarginFactor;
    const maxAdjustments = 5;

    for (let adjust = 0; adjust < maxAdjustments; adjust++) {
      const maxAttempts = 50;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        let radialStart = 0;
        let radialEnd = R;
        let safeRadialStart = radialStart + currentMarginFactor * pointRadius;
        let safeRadialEnd = radialEnd - currentMarginFactor * pointRadius;

        if (safeRadialEnd <= safeRadialStart) {
          safeRadialStart = radialStart + (radialEnd - radialStart) * 0.3;
          safeRadialEnd = radialStart + (radialEnd - radialStart) * 0.7;
        }

        const angle = Math.random() * 2 * Math.PI;
        const r = safeRadialStart + Math.random() * (safeRadialEnd - safeRadialStart);
        const x = r * Math.cos(angle);
        const y = r * Math.sin(angle);

        let collision = placedPoints.some(pt => {
          const dx = pt.x - x;
          const dy = pt.y - y;
          return Math.sqrt(dx * dx + dy * dy) < (app.pointSpacing || 12);
        });

        if (!collision) return { x, y };
      }
      currentMarginFactor *= 0.9;
    }

    console.warn("Could not find a non-overlapping point for circle");
    const angle = Math.random() * 2 * Math.PI;
    const r = Math.random() * R;
    const x = r * Math.cos(angle);
    const y = r * Math.sin(angle);
    return { x, y };
  }

  d3.csv("/data/Updated_DataFrame.csv").then(function(data) {
  // d3.csv("/tech-radar-viz/data/Updated_DataFrame.csv").then(function(data) {
    data = data.filter(d => d["planetary_boundary"] && d["planetary_boundary"].trim() !== "");

    const filterColumns = ["Tech Radar Categories ", "Industry", "Region of activity"];
    app.createFilters(filterColumns, data);

    const pbMap = {};
    data.forEach(function(d) {
      const pb = d["planetary_boundary"].trim();
      if (!pbMap[pb]) {
        pbMap[pb] = { count: 0, companies: [] };
      }
      pbMap[pb].count++;

      let logoUrl = "";
      if (d["URL"]) {
        try {
          const url = new URL(d["URL"]);
          logoUrl = "https://img.logo.dev/" + url.hostname + "?token=pk_TFIsXlOUS8yW9lJ70NaeZA&retina=true";
        } catch (e) {
          console.warn(`Invalid URL for company ${d["Company"]}: ${d["URL"]}`);
        }
      }

      pbMap[pb].companies.push({
        company: d["Company"],
        summary: d["Summary"],
        logo: logoUrl,
        industry: d["Industry"],
        topFunctionalities: d["Top functionalities"],
        yearCreation: d["Year Creation"],
        employeesOnLinkedIn: d["Employees on Linkedin"],
        followersOnLinkedIn: d["Followers on Linkedin"],
        websiteMonthlyVisitors: d["Website Monthly Visitors"],
        url: d["URL"],
        "Tech Radar Categories ": d["Tech Radar Categories "],
        "Region of activity": d["Region of activity"],
        "Industry": d["Industry"],
        words: d["words"] // Include the words column
      });
    });

    const transversalData = pbMap["Transversal"];
    delete pbMap["Transversal"];
    const boundaries = Object.keys(pbMap).sort();
    if (transversalData) {
      boundaries.push("Transversal");
    }
    app.currentListItems = boundaries;

    app.colorScale.domain(Object.keys(pbMap));

    const rootData = { name: "root", children: [{ name: "Planetary Boundaries", children: [] }] };
    Object.keys(pbMap).sort().forEach(function(pb) {
      rootData.children[0].children.push({
        name: pb,
        value: pbMap[pb].count,
        companies: pbMap[pb].companies
      });
    });

    const root = d3.hierarchy(rootData)
      .sum(d => d.value !== undefined ? Math.max(d.value, 10) : 0)
      .sort((a, b) => b.value - a.value);

    const partition = d3.partition().size([2 * Math.PI, app.radius]);
    partition(root);
    const pbNodes = root.descendants().filter(d => d.depth === 2);
    const pbContainer = app.visContainer.append("g").attr("class", "pb-container");

    const arcGen = d3.arc()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .innerRadius(d => Math.max(d.y0 - 50, 0))
      .outerRadius(d => d.y1 + app.ringGap - app.outerLeafReduction)
      .padAngle(0.02)
      .cornerRadius(10);

    pbNodes.forEach(function(pb, i) {
      const pbGroup = pbContainer.append("g")
        .attr("class", "pb-group")
        .attr("data-pb", pb.data.name)
        .datum(pb);

      const sliceColor = app.colorScale(pb.data.name);

      pbGroup.append("path")
        .attr("class", "arc-glow")
        .attr("d", arcGen)
        .attr("fill", "none")
        .attr("stroke", sliceColor)
        .attr("stroke-width", 2)
        .attr("stroke-linejoin", "round")
        .style("filter", "url(#glow)");

      pbGroup.append("path")
        .attr("class", "arc")
        .attr("d", arcGen)
        .attr("fill", sliceColor)
        .attr("fill-opacity", 0)
        .attr("stroke", sliceColor)
        .attr("stroke-width", 1);

    // add label outside the arc tangent to arc

      const labelWidth = pb.data.name.length * 4;
      const labelHeight = 18;

      const midAngle = (pb.x0 + pb.x1) / 2;
      const outerRadius = pb.y1 + app.ringGap;
      const labelRadius = outerRadius + 12; // Fixed distance from arc

      const x = labelRadius * Math.cos(midAngle - Math.PI / 2);
      const y = labelRadius * Math.sin(midAngle - Math.PI / 2);

      const rotation = (midAngle * 180 / Math.PI);
      const vertical = Math.sin(midAngle - Math.PI / 2);
      const shouldFlip = vertical > 0;
      const finalRotation = shouldFlip ? rotation + 180 : rotation;

      // Rectangle with rotation
      pbGroup.append("rect")
        .attr("x", -labelWidth / 2)
        .attr("y", -labelHeight / 2)
        .attr("width", labelWidth)
        .attr("height", labelHeight)
        .attr("rx", 6)
        .attr("ry", 6)
        .attr("class", "arc-label-rect")
        .attr("transform", `translate(${x}, ${y}) rotate(${finalRotation})`);

      pbGroup.select(".arc-label-rect").style("color", sliceColor);

      // Text with same rotation
      pbGroup.append("text")
        .attr("x", 0)
        .attr("y", 0)
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "middle")
        .attr("class", "arc-label")
        .text(pb.data.name)
        .attr("transform", `translate(${x}, ${y}) rotate(${finalRotation})`);

      if (pb.data.companies) {
        pb.data.companies.forEach(function(companyObj) {
          let candidate = getNonOverlappingPoint(pb, app.marginFactor, globalPlacedPoints);
          globalPlacedPoints.push(candidate);

          let newImage = pbGroup.append("image")
            .datum(companyObj)
            .attr("class", "company-logo")
            .attr("xlink:href", companyObj.logo)
            .attr("width", app.logoSize)
            .attr("height", app.logoSize)
            .attr("x", candidate.x - app.logoSize / 2)
            .attr("y", candidate.y - app.logoSize / 2);

          app.attachCompanyEventHandlers(newImage, companyObj);

          newImage.node().addEventListener("error", function() {
            d3.select(this).remove();
            let fallbackCircle = pbGroup.append("circle")
              .datum(companyObj)
              .attr("class", "company-circle")
              .attr("cx", candidate.x)
              .attr("cy", candidate.y)
              .attr("r", app.pointRadius)
              .style("fill", "rgba(200,200,200,0.5)");
            app.attachCompanyEventHandlers(fallbackCircle, companyObj);
          });
        });
      }

      pbGroup
            // adds category titles when hovering over the arc - paused because constant titles are now used
/*       .on("mouseenter", function(event, d) {
        d3.select("#subcat-title")
          .text(d.data.name)
          .transition()
          .duration(200)
          .style("opacity", 1);
        d3.select(this).select(".arc-glow")
          .transition()
          .duration(400)
          .attr("stroke-width", 4);
        if (app.currentInfoType === "visualization") {
          d3.select(`#list .list-item[data-pb="${d.data.name}"]`).classed("highlighted", true);
        }
      }) */
      .on("mouseleave", function() {
        if (!d3.select(this).classed("frozen")) {
          d3.select(this).select(".arc-glow")
            .transition()
            .duration(400)
            .attr("stroke-width", 2);
          var frozen = d3.select(".pb-group.frozen");
          if (!frozen.empty()) {
            d3.select("#subcat-title")
              .text(frozen.attr("data-pb"))
              .transition()
              .duration(200)
              .style("opacity", 1);
          } else {
            d3.select("#subcat-title")
              .transition()
              .duration(400)
              .style("opacity", 0);
          }
          if (app.currentInfoType === "visualization") {
            d3.select(`#list .list-item[data-pb="${d3.select(this).attr("data-pb")}"]`).classed("highlighted", false);
          }
        }
      });
    });

    if (transversalData) {
      const transversalColor = "#ff9800";
      const transversalGroup = app.visContainer.append("g")
        .attr("class", "Transversal-group")
        .attr("data-pb", "Transversal");

      transversalGroup.append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", app.transversalRadius)
        .attr("fill", transversalColor)
        .attr("fill-opacity", 0)
        .attr("stroke", transversalColor)
        .attr("stroke-width", 2)
        .style("filter", "url(#glow)");

      transversalData.companies.forEach(function(companyObj) {
        let candidate = getNonOverlappingPointForCircle(app.transversalRadius, globalPlacedPoints, app.pointRadius, app.marginFactor);
        globalPlacedPoints.push(candidate);

        let newImage = transversalGroup.append("image")
          .datum(companyObj)
          .attr("class", "company-logo")
          .attr("xlink:href", companyObj.logo)
          .attr("width", app.logoSize)
          .attr("height", app.logoSize)
          .attr("x", candidate.x - app.logoSize / 2)
          .attr("y", candidate.y - app.logoSize / 2);

        app.attachCompanyEventHandlers(newImage, companyObj);

        newImage.node().addEventListener("error", function() {
          d3.select(this).remove();
          let fallbackCircle = transversalGroup.append("circle")
            .datum(companyObj)
            .attr("class", "company-circle")
            .attr("cx", candidate.x)
            .attr("cy", candidate.y)
            .attr("r", app.pointRadius)
            .style("fill", "rgba(200,200,200,0.5)");
          app.attachCompanyEventHandlers(fallbackCircle, companyObj);
        });
      });

      transversalGroup
            // adds category titles when hovering over the arc - paused because constant titles are now used
/*       .on("mouseenter", function() {
        d3.select(this).select("circle")
          .transition()
          .duration(400)
          .attr("stroke-width", 4);
        d3.select("#subcat-title")
          .text("Transversal")
          .transition()
          .duration(200)
          .style("opacity", 1);
        if (app.currentInfoType === "visualization") {
          d3.select(`#list .list-item[data-pb="Transversal"]`).classed("highlighted", true);
        }
      }) */
      .on("mouseleave", function() {
        if (!d3.select(this).classed("frozen")) {
          d3.select(this).select("circle")
            .transition()
            .duration(400)
            .attr("stroke-width", 2);
          var frozen = d3.select(".Transversal-group.frozen");
          if (!frozen.empty()) {
            d3.select("#subcat-title")
              .text(frozen.attr("data-pb"))
              .transition()
              .duration(200)
              .style("opacity", 1);
          } else {
            d3.select("#subcat-title")
              .transition()
              .duration(400)
              .style("opacity", 0);
          }
          if (app.currentInfoType === "visualization") {
            d3.select(`#list .list-item[data-pb="Transversal"]`).classed("highlighted", false);
          }
        }
      });
    }

    app.applyFilters(data);
    app.openInfoPanel(
      "ImpactLabs Tech Radar - Planetary Boundary View",
      "This visualization maps companies to planetary boundaries, highlighting their contributions to sustainability across various categories.",
      "visualization"
    );
  }).catch(function(error) {
    console.error("Error loading CSV file:", error);
  });
};