app.renderVisualization2 = function() {
    app.visContainer.selectAll("*").interrupt().remove();
    const globalPlacedPoints = [];
    Math.seedrandom(33);
    const pointRadius = 2; // Override default
    const logoSize = 10;   // Override default
  
    function clearPersistent() {
      d3.selectAll(".company-logo").classed("selected", false);
      d3.selectAll(".company-circle").classed("selected", false);
      d3.selectAll(".arc-glow")
        .classed("persistent", false)
        .interrupt()
        .transition()
        .duration(400)
        .attr("stroke-width", 2);
      d3.selectAll(".subcat-group")
        .classed("persistent", false)
        .interrupt()
        .transition()
        .duration(400)
        .style("opacity", 0)
        .on("end", function() { d3.select(this).style("pointer-events", "none"); });
      d3.selectAll(".macro-group").classed("frozen", false);
      d3.selectAll(".subcat-group-item").classed("frozen", false);
      d3.selectAll(".macro-label").classed("hovered", false);
      d3.select("#subcat-title")
        .interrupt()
        .transition()
        .duration(400)
        .style("opacity", 0);
    }
    app.currentClearPersistent = clearPersistent;
  
    function attachCompanyEventHandlers(selection, companyObj) {
      selection
        .on("mouseover", function(event) {
          d3.select("#tooltip")
            .style("display", "block")
            .text(companyObj.company);
        })
        .on("mousemove", function(event) {
          d3.select("#tooltip")
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY + 10) + "px");
        })
        .on("mouseout", function() {
          d3.select("#tooltip").style("display", "none");
        })
        .on("click", function(event) {
          event.stopPropagation();
          clearPersistent();
          d3.select(this).classed("selected", true);
          const subcatGroupItem = d3.select(this.parentNode);
          subcatGroupItem.classed("frozen", true);
          subcatGroupItem.select(".arc-glow")
            .classed("persistent", true)
            .transition().duration(400)
            .attr("stroke-width", 4);
          const parentSubcatGroup = d3.select(this.parentNode.parentNode);
          parentSubcatGroup.classed("persistent", true)
            .interrupt()
            .style("opacity", 1)
            .style("pointer-events", "auto");
          const macroGroup = d3.select(this.parentNode.parentNode.parentNode);
          macroGroup.classed("frozen", true);
          macroGroup.select(".arc-glow")
            .classed("persistent", true)
            .transition().duration(400)
            .attr("stroke-width", 4);
          macroGroup.select(".macro-label").classed("hovered", true);
          subcatGroupItem.each(function(d) {
            d3.select("#subcat-title")
              .interrupt()
              .transition()
              .duration(200)
              .style("opacity", 1)
              .text(d.data.name);
          });
          app.openInfoPanel(companyObj.company, companyObj.summary, companyObj.logo, "", "");
        });
    }
  
    function getNonOverlappingPoint(arc, baseMarginFactor, placedPoints) {
      let currentMarginFactor = baseMarginFactor;
      const maxAdjustments = 5;
      for (let adjust = 0; adjust < maxAdjustments; adjust++) {
        const maxAttempts = 50;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          let radialStart = arc.y0, radialEnd = arc.y1;
          if (arc.depth === 2) {
            radialStart = arc.y0 + app.ringGap;
            radialEnd = arc.y1 + app.ringGap - app.outerLeafReduction;
          }
          let safeRadialStart = radialStart + currentMarginFactor * pointRadius;
          let safeRadialEnd   = radialEnd - currentMarginFactor * pointRadius;
          if (safeRadialEnd <= safeRadialStart) {
            safeRadialStart = radialStart + (radialEnd - radialStart) * 0.3;
            safeRadialEnd = radialStart + (radialEnd - radialStart) * 0.7;
          }
          let avgRadius = (safeRadialStart + safeRadialEnd) / 2;
          let safeAngularMargin = currentMarginFactor * (pointRadius / avgRadius);
          let safeAngleStart = arc.x0 + safeAngularMargin;
          let safeAngleEnd   = arc.x1 - safeAngularMargin;
          if (safeAngleEnd <= safeAngleStart) {
            const angleDiff = arc.x1 - arc.x0;
            safeAngleStart = arc.x0 + angleDiff * 0.3;
            safeAngleEnd = arc.x0 + angleDiff * 0.7;
          }
          const angle = safeAngleStart + Math.random() * (safeAngleEnd - safeAngleStart);
          const r = safeRadialStart + Math.random() * (safeRadialEnd - safeRadialStart);
          const x = r * Math.cos(angle - Math.PI / 2);
          const y = r * Math.sin(angle - Math.PI / 2);
          let collision = placedPoints.some(pt => {
            const dx = pt.x - x, dy = pt.y - y;
            return Math.sqrt(dx * dx + dy * dy) < (2 * pointRadius + 1);
          });
          if (!collision) return { x, y };
        }
        currentMarginFactor *= 0.9;
      }
      console.warn("Could not find a non-overlapping point for arc", arc);
      const angle = arc.x0 + Math.random() * (arc.x1 - arc.x0);
      let radialStart = arc.y0, radialEnd = arc.y1;
      if (arc.depth === 2) {
         radialStart = arc.y0 + app.ringGap;
         radialEnd = arc.y1 + app.ringGap - app.outerLeafReduction;
      }
      const r = radialStart + Math.random() * (radialEnd - radialStart);
      return { x: r * Math.cos(angle - Math.PI / 2), y: r * Math.sin(angle - Math.PI / 2) };
    }
  
    // d3.csv("/data/Updated_Exploded_Tech_Radar_Categories_Data.csv").then(function(data) {
    d3.csv("/ImpactLabs-Tech-Radar/data/Updated_Exploded_Tech_Radar_Categories_Data.csv").then(function(data) {
      const rootData = { name: "root", children: [] };
      const macroMap = {};
  
      data.forEach(function(d) {
        const macro = d["macro category"] ? d["macro category"].trim().toLowerCase() : "unknown";
        const sub = d["cleaned_categories"] ? d["cleaned_categories"].trim().toLowerCase() : "unknown";
        if (!macroMap[macro]) { macroMap[macro] = {}; }
        if (!macroMap[macro][sub]) { macroMap[macro][sub] = { count: 0, companies: [] }; }
        macroMap[macro][sub].count++;
        macroMap[macro][sub].companies.push({
          company: d["Company"],
          summary: d["Summary"],
          // logo: d["URL"] ? d["URL"].replace(/\/+$/, "") + "/favicon.ico" : ""
          logo: d["URL"] ? d["URL"].replace(/\/+$/, "") + "/ImpactLabs-Tech-Radar/favicon.ico" : ""
        });
      });
  
      Object.keys(macroMap).sort().forEach(function(macro) {
        const macroNode = { name: macro, children: [] };
        Object.keys(macroMap[macro]).sort().forEach(function(sub) {
          macroNode.children.push({
            name: sub,
            value: macroMap[macro][sub].count,
            companies: macroMap[macro][sub].companies
          });
        });
        rootData.children.push(macroNode);
      });
  
      app.colorScale.domain(Object.keys(macroMap));
  
      const root = d3.hierarchy(rootData)
                     .sum(d => d.value !== undefined ? Math.max(d.value, 10) : 0)
                     .sort((a, b) => b.value - a.value);
  
      const partition = d3.partition().size([2 * Math.PI, app.radius]);
      partition(root);
  
      root.descendants().forEach(d => {
        if (d.depth === 1 && !d.data.companies) {
          d.data.companies = [];
          if (d.children) {
            d.children.forEach(child => {
              if (child.data.companies) {
                d.data.companies = d.data.companies.concat(child.data.companies);
              }
            });
          }
        }
      });
  
      const arcGenerator = d3.arc()
                             .startAngle(d => d.x0)
                             .endAngle(d => d.x1)
                             .innerRadius(d => d.depth === 2 ? d.y0 + app.ringGap : d.y0)
                             .outerRadius(d => d.depth === 2 ? d.y1 + app.ringGap - app.outerLeafReduction : d.y1)
                             .padAngle(0.02)
                             .cornerRadius(10);
  
      const invisibleArcGenerator = d3.arc()
                                      .startAngle(d => d.x0)
                                      .endAngle(d => d.x1)
                                      .innerRadius(d => d.y0)
                                      .outerRadius(d => d.y1);
  
      const macroNodes = root.descendants().filter(d => d.depth === 1);
      const macroContainer = app.visContainer.append("g").attr("class", "macro-container");
  
      macroNodes.forEach(function(macro, i) {
        const sliceColor = app.colorScale(macro.data.name);
        const macroGroup = macroContainer.append("g")
          .attr("class", "macro-group")
          .attr("data-macro", macro.data.name);
  
        let targetDatum = macro;
        if (macro.children && macro.children.length > 0) {
          targetDatum = Object.assign({}, macro);
          targetDatum.y1 = d3.max(macro.children, child => child.y1) + app.ringGap;
        }
  
        macroGroup.append("path")
          .attr("class", "arc-glow")
          .attr("d", arcGenerator(macro))
          .attr("fill", "none")
          .attr("stroke", sliceColor)
          .attr("stroke-width", 2)
          .attr("stroke-linejoin", "round")
          .style("filter", "url(#glow)");
  
        macroGroup.append("path")
          .attr("class", "arc")
          .attr("d", arcGenerator(macro))
          .attr("fill", sliceColor)
          .attr("fill-opacity", 0.6)
          .attr("stroke", sliceColor)
          .attr("stroke-width", 1);
  
        const macroPointsGroup = macroGroup.append("g")
          .attr("class", "macro-points-group")
          .attr("data-macro", macro.data.name);
  
        if (macro.data.companies) {
          macro.data.companies.forEach(function(companyObj) {
            let candidate = getNonOverlappingPoint(macro, app.marginFactor, globalPlacedPoints);
            globalPlacedPoints.push(candidate);
            macroPointsGroup.append("circle")
              .attr("class", "macro-shadow")
              .attr("cx", candidate.x)
              .attr("cy", candidate.y)
              .attr("r", pointRadius + 1);
          });
        }
  
        const invisibleTarget = macroGroup.append("path")
          .attr("class", "invisible-target")
          .attr("d", invisibleArcGenerator(targetDatum))
          .style("fill", "transparent")
          .style("pointer-events", "none");
  
        macroGroup.append("path")
          .attr("class", "macro-text-path")
          .attr("id", "macro-text-path-" + i)
          .attr("d", function() {
            const midRadius = (macro.y0 + macro.y1) / 2;
            const startAngle = macro.x0 - Math.PI / 2;
            const endAngle = macro.x1 - Math.PI / 2;
            const startX = midRadius * Math.cos(startAngle);
            const startY = midRadius * Math.sin(startAngle);
            const endX = midRadius * Math.cos(endAngle);
            const endY = midRadius * Math.sin(endAngle);
            const deltaAngle = macro.x1 - macro.x0;
            const largeArcFlag = (deltaAngle > Math.PI) ? 1 : 0;
            return `M ${startX} ${startY} A ${midRadius} ${midRadius} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
          })
          .style("fill", "none")
          .style("stroke", "none");
  
        const textElement = macroGroup.append("text")
          .attr("class", "macro-label")
          .attr("text-anchor", "middle")
          .attr("alignment-baseline", "middle")
          .style("font-family", "'Roboto', sans-serif")
          .style("fill", "#ffffff");
  
        const macroName = macro.data.name;
        const midAngleRad = (macro.x0 + macro.x1) / 2;
        const midAngleDegrees = midAngleRad * 180 / Math.PI;
  
        const textPath = textElement.append("textPath")
          .attr("xlink:href", "#macro-text-path-" + i)
          .attr("startOffset", "50%");
  
        if (midAngleDegrees >= 90 && midAngleDegrees <= 270) {
          macroName.split("").forEach(function(letter) {
            const tspan = textPath.append("tspan").text(letter);
            requestAnimationFrame(() => {
              const bbox = tspan.node().getBBox();
              const cx = bbox.x + bbox.width / 2;
              const cy = bbox.y + bbox.height / 2;
              tspan.style("transform-origin", `${cx}px ${cy}px`)
                   .style("transform", "scale(-1, -1)");
            });
          });
        } else {
          textPath.text(macroName);
        }
  
        macroGroup.on("mouseenter", function() {
          d3.select(this).select(".macro-label").classed("hovered", true);
          if (!d3.select(this).select(".arc-glow").classed("persistent")) {
            d3.select(this).select(".subcat-group")
              .transition()
              .duration(400)
              .style("opacity", 1)
              .on("end", function() { d3.select(this).style("pointer-events", "auto"); });
            invisibleTarget.transition()
              .duration(400)
              .on("end", function() { d3.select(this).style("pointer-events", "auto"); });
            d3.select(this).select(".arc-glow")
              .transition()
              .duration(400)
              .attr("stroke-width", 4);
          }
        }).on("mouseleave", function() {
          if (!d3.select(this).classed("frozen")) {
            d3.select(this).select(".macro-label").classed("hovered", false);
          }
          if (!d3.select(this).select(".arc-glow").classed("persistent")) {
            d3.select(this).select(".subcat-group")
              .transition()
              .duration(400)
              .style("opacity", 0)
              .on("end", function() { d3.select(this).style("pointer-events", "none"); });
            invisibleTarget.transition()
              .duration(400)
              .on("end", function() { d3.select(this).style("pointer-events", "none"); });
            d3.select(this).select(".arc-glow")
              .transition()
              .duration(400)
              .attr("stroke-width", 2);
          }
        });
  
        const subcatGroup = macroGroup.append("g")
          .attr("class", "subcat-group")
          .style("opacity", 0)
          .style("pointer-events", "none");
  
        if (macro.children) {
          macro.children.forEach(function(subcat) {
            const subcatGroupItem = subcatGroup.append("g")
              .attr("class", "subcat-group-item")
              .datum(subcat);
            subcatGroupItem.append("path")
              .attr("class", "arc-glow")
              .attr("d", arcGenerator(subcat))
              .attr("fill", "none")
              .attr("stroke", sliceColor)
              .attr("stroke-width", 2)
              .attr("stroke-linejoin", "round")
              .style("filter", "url(#glow)");
            subcatGroupItem.append("path")
              .attr("class", "arc")
              .attr("d", arcGenerator(subcat))
              .attr("fill", sliceColor)
              .attr("fill-opacity", 0.6)
              .attr("stroke", sliceColor)
              .attr("stroke-width", 1);
  
            if (subcat.data.companies) {
              subcat.data.companies.forEach(function(companyObj) {
                let candidate = getNonOverlappingPoint(subcat, app.marginFactor, globalPlacedPoints);
                globalPlacedPoints.push(candidate);
                let newImage = subcatGroupItem.append("image")
                  .attr("class", "company-logo")
                  .attr("xlink:href", companyObj.logo)
                  .attr("width", logoSize)
                  .attr("height", logoSize)
                  .attr("x", candidate.x - logoSize / 2)
                  .attr("y", candidate.y - logoSize / 2);
                attachCompanyEventHandlers(newImage, companyObj);
                newImage.node().addEventListener("error", function() {
                  d3.select(this).remove();
                  let fallbackCircle = subcatGroupItem.append("circle")
                    .attr("class", "company-circle")
                    .attr("cx", candidate.x)
                    .attr("cy", candidate.y)
                    .attr("r", pointRadius)
                    .style("fill", "rgba(200,200,200,0.5)");
                  attachCompanyEventHandlers(fallbackCircle, companyObj);
                });
              });
            }
  
            subcatGroupItem.on("mouseenter", function() {
              d3.select("#subcat-title")
                .text(subcat.data.name)
                .transition()
                .duration(200)
                .style("opacity", 1);
              if (!d3.select(this).select(".arc-glow").classed("persistent")) {
                d3.select(this).select(".arc-glow")
                  .transition()
                  .duration(200)
                  .attr("stroke-width", 4);
              }
            }).on("mouseleave", function() {
              if (!d3.select(this).classed("frozen")) {
                var frozenSubcat = d3.selectAll(".subcat-group-item.frozen");
                if (!frozenSubcat.empty()) {
                  var frozenName = frozenSubcat.datum().data.name;
                  d3.select("#subcat-title")
                    .text(frozenName)
                    .transition()
                    .duration(200)
                    .style("opacity", 1);
                } else {
                  d3.select("#subcat-title")
                    .transition()
                    .duration(400)
                    .style("opacity", 0);
                }
              }
              if (!d3.select(this).select(".arc-glow").classed("persistent")) {
                d3.select(this).select(".arc-glow")
                  .transition()
                  .duration(400)
                  .attr("stroke-width", 2);
              }
            });
          });
        }
      });
    }).catch(function(error) {
      console.error("Error loading CSV file:", error);
    });
  };