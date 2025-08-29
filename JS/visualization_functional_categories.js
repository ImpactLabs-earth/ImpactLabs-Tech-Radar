/**
 * visualization_functional_categories.js
 *
 * Renders a sunburst chart using the "cleaned_categories" column.
 * Depends on D3.js and shared settings in eventHandlers.js.
 */

/**
 * app.renderVisualization2
 *
 * Renders the Categories sunburst chart:
 * - Loads data from CSV and builds a hierarchy using "cleaned_categories".
 * - Loads category descriptions from Category_descriptions.csv.
 * - Draws arcs for each category with a preserved inner radius.
 * - Adds interactive elements like tooltips, company logos, and arc click handlers.
 * - Includes filters for "Industry" and "Region of activity".
 * - Displays an info panel with the visualization name and description upon rendering.
 * - Displays an info panel with category details when clicking an arc.
 * - Features deep dive triangles positioned 5px inside the inner radius, synchronized with arc animations.
 */

app.renderVisualization2 = function () {
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
    d3.selectAll(".deep-dive-glow")
      .interrupt()
      .transition()
      .duration(400)
      .attr("stroke-width", 0);
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

  Promise.all([
    // d3.csv("/data/Updated_Exploded_Tech_Radar_Categories_Data.csv"),
    // d3.csv("/data/Category_descriptions.csv")
    d3.csv("/ImpactLabs-Tech-Radar/data/Updated_Exploded_Tech_Radar_Categories_Data.csv"),
    d3.csv("/ImpactLabs-Tech-Radar/data/Category_descriptions.csv")
  ]).then(function ([data, categoryDescriptions]) {
    data = data.filter(d => d["cleaned_categories"] && d["cleaned_categories"].trim() !== "");

    const categoryDescMap = {};
    categoryDescriptions.forEach(d => {
      categoryDescMap[d["Category"]] = {
        numberOfCompanies: d["Number of companies"],
        oneLiner: d["One liner"],
        ilDefinition: d["IL Definition"]
      };
    });

    const filterColumns = ["Industry", "Region of activity"];
    app.createFilters(filterColumns, data);

    const pbMap = {};
    data.forEach(function (d) {
      const pb = d["cleaned_categories"].trim();
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
        "Region of activity": d["Region of activity"],
        "Industry": d["Industry"],
        words: d["words"] // Include the words column
      });
    });

    Object.keys(pbMap).forEach(pb => {
      if (pbMap[pb].count < 20) {
        console.log(`Excluding category "${pb}" with ${pbMap[pb].count} entries (less than 20)`);
        delete pbMap[pb];
        app.currentListItems = Object.keys(pbMap).sort();
      }
    });

    app.colorScale.domain(Object.keys(pbMap));

    const rootData = { name: "root", children: [{ name: "Categories", children: [] }] };
    Object.keys(pbMap).sort().forEach(function (pb) {
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

    pbNodes.forEach(function (pb, i) {
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

      // TRYING THIS OUT add label outside the arc tangent to arc

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

      //// end of constant category titles 

      if (app.deepDivesMap && app.deepDivesMap[pb.data.name] && app.deepDivesMap[pb.data.name].length > 0) {
        const midAngle = (pb.x0 + pb.x1) / 2;
        const innerRadius = Math.max(pb.y0 - 50, 0);
        const r = innerRadius - 12;
        const x = r * Math.cos(midAngle - Math.PI / 2);
        const y = r * Math.sin(midAngle - Math.PI / 2);
        const rotation = midAngle * 180 / Math.PI;
        const triangle = d3.symbol().type(d3.symbolTriangle).size(50);

        pbGroup.append("path")
          .attr("d", triangle)
          .attr("transform", `translate(${x}, ${y}) rotate(${rotation})`)
          .attr("fill", "none")
          .attr("stroke", sliceColor)
          .attr("stroke-width", 0)
          .attr("class", "deep-dive-glow")
          .style("filter", "url(#glow)");

        pbGroup.append("path")
          .attr("d", triangle)
          .attr("transform", `translate(${x}, ${y}) rotate(${rotation})`)
          .attr("fill", sliceColor)
          .attr("class", "deep-dive-indicator");
      }

      if (pb.data.companies) {
        pb.data.companies.forEach(function (companyObj) {
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

          newImage.node().addEventListener("error", function () {
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
/*         .on("mouseenter", function () {
          if (!d3.select(this).classed("frozen")) {
            d3.select(this).select(".arc-glow")
              .transition()
              .duration(200)
              .attr("stroke-width", 4);
            d3.select(this).select(".deep-dive-glow")
              .transition()
              .duration(200)
              .attr("stroke-width", 2);
            d3.select("#subcat-title")
              .text(pb.data.name)
              .transition()
              .duration(200)
              .style("opacity", 1);
            if (app.currentInfoType === "visualization") {
              d3.select(`#list .list-item[data-pb="${pb.data.name}"]`).classed("highlighted", true);
            }
          }
        }) */
        .on("mouseleave", function () {
          if (!d3.select(this).classed("frozen")) {
            d3.select(this).select(".arc-glow")
              .transition()
              .duration(200)
              .attr("stroke-width", 2);
            d3.select(this).select(".deep-dive-glow")
              .transition()
              .duration(200)
              .attr("stroke-width", 0);
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
              d3.select(`#list .list-item[data-pb="${pb.data.name}"]`).classed("highlighted", false);
            }
          }
        })
        .on("click", function (event) {
          event.stopPropagation();
          app.currentClearPersistent();
          d3.select(this).classed("frozen", true);
          d3.select(this).select(".arc-glow")
            .classed("persistent", true)
            .attr("stroke-width", 4);
          d3.select(this).select(".deep-dive-glow")
            .attr("stroke-width", 2);
          d3.select("#subcat-title")
            .text(pb.data.name)
            .transition()
            .duration(200)
            .style("opacity", 1);

          const categoryData = categoryDescMap[pb.data.name] || {
            numberOfCompanies: "Unknown",
            oneLiner: "No description available",
            ilDefinition: "No definition available"
          };
          app.currentCategoryCompanies = pb.data.companies;
          app.openInfoPanel(
            pb.data.name,
            `<div style="margin: 5px 0;">
              <p style="font-size: 0.9em;"><strong>Number of Companies Mapped:</strong> ${categoryData.numberOfCompanies}</p>
              <p style="font-size: 1.2em; font-weight: bold;">${categoryData.oneLiner}</p>
            </div>
            <div style="border-top: 1px solid #ccc; margin: 10px 0;"></div>
            <p style="margin: 10px 0; font-size: 0.9em;">${categoryData.ilDefinition}</p>`,
            "category",
            pb.data.name
          );
        });

    });

    app.applyFilters(data);
    app.openInfoPanel(
      "ImpactLens Tech Radar - Categories View",
      "This visualization maps companies to technology radar categories, highlighting their roles in various industries and regions.",
      "visualization"
    );
  }).catch(function (error) {
    console.error("Error loading CSV files:", error);
  });
};