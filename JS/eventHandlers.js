// Create a global storage space called `app` to keep things both charts can use
const app = {}; // `const` means `app` won’t point to a new object, but we can add stuff to it

app.searchTerm = ''; // Store the current search term

// Add titles for the two charts to `app`
app.visualizationTitles = {
  vis1: "ImpactLabs Tech Radar - Planetary Boundary View",
  vis2: "ImpactLabs Tech Radar - Categories View"
};

// Add descriptions for the two charts to `app`
app.visualizationDescriptions = {
  vis1: "This is a placeholder description for the Planetary Boundary View. Replace this with your brief description later.",
  vis2: "This is a placeholder description for the Categories View. Replace this with your brief description later."
};

// Shared constants for chart dimensions and layout
app.width = 800;
app.height = 800;
app.radius = 300;
app.pointRadius = 2;        // Radius for individual data points
app.logoSize = 6.5;         // Logo point size when rendering logos as points
app.ringGap = 7;            // Gap between concentric rings in the sunburst
app.outerLeafReduction = 10;// Shrink leaf nodes slightly for spacing
app.marginFactor = 5.5;     // Margin factor used in layout calculations
app.transversalRadius = 142;// Specific to Visualization 1 layout
app.centerLogoSize = 75;    // Size of the central logo in Visualization 1

// Set up colors for the chart
app.futuristicColors = [
  "#00b894", "#00cec9", "#0984e3", "#6c5ce7",
  "#74b9ff", "#a29bfe", "#55efc4", "#81ecec"
];
app.colorScale = d3.scaleOrdinal().range(app.futuristicColors);

// Set up main SVG canvas and zoom behavior
app.svg = d3.select("#chart");                     // Select the <svg> from index.html
app.zoomGroup = app.svg.append("g");               // Group to apply zoom transforms
app.visContainer = app.zoomGroup.append("g").attr("class", "vis-container"); // Container for all visualization elements

// Configure zoom/pan limits and event handler
app.zoom = d3.zoom()
  .scaleExtent([0.1, 10]) // Allow zoom between 10% and 1000%
  .on("zoom", event => app.zoomGroup.attr("transform", event.transform));

app.svg.call(app.zoom);
// Center the chart on load
app.svg.call(app.zoom.transform, d3.zoomIdentity.translate(window.innerWidth / 3.5, window.innerHeight / 3.6));

// Function to switch between charts with a fade
app.switchVisualization = function (newRenderFunction) {
  d3.select("#info-panel").classed("open", false);
  if (app.zoomContainer) app.zoomContainer.remove();
  app.visContainer.transition()
    .duration(400)
    .style("opacity", 0)
    .on("end", function () {
      app.visContainer.selectAll("*").interrupt().remove();
      newRenderFunction();
      app.visContainer.style("opacity", 0);
      app.visContainer.transition()
        .duration(400)
        .style("opacity", 1);
      app.openInfoPanel(
        app.visualizationTitles[app.currentVis],
        app.visualizationDescriptions[app.currentVis],
        "visualization"
      );
    });
};

// Function to show the info panel with details
app.openInfoPanel = function (
  title, content, type, logo = "", industry = "", topFunctionalities = "",
  yearCreation = "", employeesOnLinkedIn = "", followersOnLinkedIn = "",
  websiteMonthlyVisitors = "", URL = "", contextCategory = ""
) {
  if (type === "category") contextCategory = title;
  const panel = d3.select("#info-panel");
  let infoHtml = '';

  if (type === "category") {
    infoHtml = `
      <h2>${title}</h2>
      ${content}
      <button id="zoom-button">Zoom</button>
    `;
  } else if (type === "company") {
    let logoHtml = "";
    if (logo && logo.trim() !== "") {
      if (URL && URL.trim() !== "") {
        logoHtml = `<a href="${URL}" target="_blank" rel="noopener noreferrer">
                      <img src="${logo}" alt="${title} logo" style="max-width: 100px; max-height: 100px; height: auto; width: auto; margin-right: 20px;">
                    </a>`;
      } else {
        logoHtml = `<img src="${logo}" alt="${title} logo" style="max-width: 100px; max-height: 100px; height: auto; width: auto; margin-right: 20px;">`;
      }
    }
    const toInt = str => !str ? "" : isNaN(parseInt(str.replace(/,/g, ""))) ? "" : parseInt(str.replace(/,/g, ""));
    const additionalInfoHtml = (yearCreation || employeesOnLinkedIn || followersOnLinkedIn || websiteMonthlyVisitors) ? `
      <div style="border-top: 1px solid #5acc8e; margin: 10px 0;"></div>
      <div style="font-size: 0.8em; margin: 5px 0;">
        ${toInt(yearCreation) ? `<p><strong>Year Creation:</strong> ${toInt(yearCreation)}</p>` : ""}
        ${toInt(employeesOnLinkedIn) ? `<p><strong>Employees on LinkedIn:</strong> ${toInt(employeesOnLinkedIn)}</p>` : ""}
        ${toInt(followersOnLinkedIn) ? `<p><strong>Followers on LinkedIn:</strong> ${toInt(followersOnLinkedIn)}</p>` : ""}
        ${toInt(websiteMonthlyVisitors) ? `<p><strong>Website Monthly Visitors:</strong> ${toInt(websiteMonthlyVisitors)}</p>` : ""}
      </div>
    ` : "";
    infoHtml = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h2 style="margin: 0;">${title}</h2>
        ${logoHtml}
      </div>
      ${industry || additionalInfoHtml ? `
        <div style="text-align: left;">
          ${industry ? `<p style="font-size: 0.8em; margin: 2px 0;"><strong>Industry:</strong> ${industry}</p>` : ""}
          ${additionalInfoHtml}
        </div>
      ` : ""}
      <div style="border-top: 1px solid #5acc8e; margin: 10px 0;"></div>
      <p style="margin: 10px 0;">${content}</p>
      ${topFunctionalities ? `
        <div style="border-top: 1px solid #5acc8e; margin: 10px 0;"></div>
        <p style="margin: 10px 0;">${topFunctionalities}</p>
      ` : ""}
    `;
  } else { // type === "visualization"
    infoHtml = `
      <h2>${title}</h2>
      <p>${content}</p>
    `;

    if (app.currentListItems) {
      infoHtml += `<div id="list-container"><ul id="list">`;
      app.currentListItems.forEach(item => {
        const hasDeepDives = app.deepDivesMap && app.deepDivesMap[item] && app.deepDivesMap[item].length > 0;
        const itemClass = hasDeepDives ? 'list-item with-triangle' : 'list-item';
        infoHtml += `<li class="${itemClass}" data-pb="${item}">${item}</li>`;
      });
      infoHtml += `</ul></div>`;
    }
  }

  if (contextCategory && app.deepDivesMap && app.deepDivesMap[contextCategory]) {
    const deepDives = app.deepDivesMap[contextCategory];
    if (deepDives.length > 0) {
      infoHtml += `<div style="border-top: 1px solid #5acc8e; margin: 10px 0;"></div>
                   <p style="margin: 10px 0; text-align: left; padding-left: 0; margin-left: 0;"><strong>Deep Dives:</strong></p>`;
      deepDives.forEach(dive => {
        infoHtml += `<p style="margin: 5px 0; text-align: left; padding-left: 0; margin-left: 0;">
                       <a href="${dive.deep_dive_link}" target="_blank">${dive.deep_dive}</a>
                     </p>`;
      });
    }
  }

  d3.select("#info-content").html(infoHtml);

  if (type === "visualization") {
    d3.selectAll("#list .list-item")
      .on("mouseenter", function () {
        const pb = d3.select(this).attr("data-pb");
        const arcGroup = d3.select(`.pb-group[data-pb="${pb}"], .Transversal-group[data-pb="${pb}"]`);
        if (!arcGroup.empty()) {
          arcGroup.dispatch("mouseenter");
          d3.select(this).classed("highlighted", true);
        }
      })
      .on("mouseleave", function () {
        const pb = d3.select(this).attr("data-pb");
        const arcGroup = d3.select(`.pb-group[data-pb="${pb}"], .Transversal-group[data-pb="${pb}"]`);
        if (!arcGroup.empty()) {
          arcGroup.dispatch("mouseleave");
          d3.select(this).classed("highlighted", false);
        }
      })
      .on("click", function () {
        const pb = d3.select(this).attr("data-pb");
        const arcGroup = d3.select(`.pb-group[data-pb="${pb}"], .Transversal-group[data-pb="${pb}"]`);
        if (!arcGroup.empty()) {
          arcGroup.node().dispatchEvent(new MouseEvent("click", { bubbles: true }));
        }
      });
  }

  if (type === "category") {
    d3.select("#zoom-button").on("click", app.zoomToCategory);
  }

  app.currentInfoType = type;
  if (type === "visualization") {
    d3.select("#close-panel").style("display", "none");
  } else {
    d3.select("#close-panel").style("display", "block");
  }

  if (panel.classed("open")) {
    panel.classed("open", false);
    setTimeout(() => panel.classed("open", true), 300);
  } else {
    panel.classed("open", true);
  }
};

// Handles the toggle switch between charts
const toggle = d3.select("#vis-toggle");

toggle.on("change", function () {
  const selectedVis = this.checked ? "vis2" : "vis1";
  app.currentVis = selectedVis;
  if (selectedVis === "vis1") {
    d3.select("#vis1-label").classed("active", true);
    d3.select("#vis2-label").classed("active", false);
    app.switchVisualization(app.renderVisualization1);
  } else {
    d3.select("#vis1-label").classed("active", false);
    d3.select("#vis2-label").classed("active", true);
    app.switchVisualization(app.renderVisualization2);
  }
});

// Runs when the page loads
window.addEventListener("load", function () {
  // d3.csv("/data/deep_dives.csv").then(function (data) {
  d3.csv("/tech-radar-viz/data/deep_dives.csv").then(function (data) {
    app.deepDivesMap = {};
    data.forEach(d => {
      const category = d.category;
      if (!app.deepDivesMap[category]) app.deepDivesMap[category] = [];
      app.deepDivesMap[category].push({
        deep_dive: d.deep_dive,
        deep_dive_link: d.deep_dive_link
      });
    });
  }).catch(function (error) {
    console.error("Error loading deep_dives.csv:", error);
  });

  const initialToggleState = document.getElementById("vis-toggle").checked;
  app.currentVis = initialToggleState ? "vis2" : "vis1";

  if (app.currentVis === "vis1") {
    d3.select("#vis1-label").classed("active", true);
    app.renderVisualization1();
  } else {
    d3.select("#vis2-label").classed("active", true);
    app.renderVisualization2();
  }

  // Add event listener for the close button
  d3.select("#close-panel").on("click", function () {
    if (app.currentInfoType !== "visualization") {
      app.openInfoPanel(
        app.visualizationTitles[app.currentVis],
        app.visualizationDescriptions[app.currentVis],
        "visualization"
      );
      if (app.currentClearPersistent) app.currentClearPersistent();
    }
  });

  // Add event listener for the search box
  const searchBox = document.getElementById('search-box');
  searchBox.addEventListener('input', function () {
    app.searchTerm = this.value.toLowerCase();
    app.applyFilters();
  });

  app.openInfoPanel(
    app.visualizationTitles[app.currentVis],
    app.visualizationDescriptions[app.currentVis],
    "visualization"
  );
});

// Function to make filter dropdowns
app.createFilters = function (filterColumns, data) {
  const filterContainer = d3.select("#filter-container");
  filterContainer.selectAll("*").remove();
  const uniqueValues = {};

  filterColumns.forEach(col => {
    uniqueValues[col] = [...new Set(data.flatMap(d => d[col] ? d[col].split(", ").map(v => v.trim()).filter(Boolean) : []))].sort();
  });

  const filters = filterContainer.selectAll(".filter")
    .data(filterColumns)
    .enter()
    .append("div")
    .attr("class", "filter")
    .style("position", "relative");

  filters.each(function (col) {
    const button = d3.select(this).append("button")
      .attr("class", "filter-button")
      .append("span")
      .text(col);

    const dropdown = d3.select(this).append("div")
      .attr("class", "filter-dropdown");

    const optionsContainer = dropdown.append("div")
      .attr("class", "filter-options");

    uniqueValues[col].forEach(val => {
      const label = optionsContainer.append("label");
      label.append("input")
        .attr("type", "checkbox")
        .attr("value", val);
      label.append("span").text(val);
    });

    d3.select(this).select(".filter-button")
      .on("click", function (event) {
        event.stopPropagation();
        const dropdown = d3.select(this.parentNode).select(".filter-dropdown");
        const isOpen = dropdown.classed("open");
        filterContainer.selectAll(".filter-dropdown").classed("open", false);
        dropdown.classed("open", !isOpen);
      });
  });

  d3.select(document).on("click", function (event) {
    if (!event.target.closest(".filter")) {
      filterContainer.selectAll(".filter-dropdown").classed("open", false);
    }
  });

  const clearButton = filterContainer.append("button")
    .attr("class", "clear-filters")
    .text("Clear")
    .on("click", () => {
      filterContainer.selectAll(".filter-options input[type='checkbox']")
        .property("checked", false);
      app.applyFilters(data);
    });

  filterContainer.selectAll(".filter-options input[type='checkbox']")
    .on("change", () => app.applyFilters(data));
};

// Function to filter the chart based on selections
app.applyFilters = function () {
  const filterContainer = d3.select("#filter-container");
  const filters = {};

  filterContainer.selectAll(".filter").each(function () {
    const col = d3.select(this).select(".filter-button span").text();
    const selectedValues = [];
    d3.select(this).selectAll(".filter-options input[type='checkbox']:checked").each(function () {
      selectedValues.push(this.value);
    });
    if (selectedValues.length > 0) filters[col] = selectedValues;
  });

  d3.selectAll(".company-logo, .company-circle").each(function (d) {
    const companyData = d;
    let isVisible = true;

    Object.keys(filters).forEach(col => {
      const companyValues = companyData[col] ? companyData[col].split(", ").map(v => v.trim()) : [];
      const matches = filters[col].some(val => companyValues.includes(val));
      if (!matches) isVisible = false;
    });

    if (app.searchTerm && app.searchTerm.trim() !== '') {
      const words = companyData.words.toLowerCase().split(',');
      const searchMatches = words.some(word => word.includes(app.searchTerm));
      if (!searchMatches) isVisible = false;
    }

    d3.select(this)
      .style("pointer-events", isVisible ? "auto" : "none")
      .transition()
      .duration(300)
      .style("opacity", isVisible ? 1 : 0);
  });
};

// Function to add mouse and click actions to companies
app.attachCompanyEventHandlers = function (selection, companyObj) {
  selection
    .on("mouseover", function (event) {
      d3.select("#tooltip")
        .style("display", "block")
        .text(companyObj.company);
    })
    .on("mousemove", function (event) {
      d3.select("#tooltip")
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY + 10) + "px");
    })
    .on("mouseout", function () {
      d3.select("#tooltip").style("display", "none");
    })
    .on("click", function (event) {
      event.stopPropagation();
      app.currentClearPersistent();
      d3.selectAll(".company-logo, .company-circle").classed("selected", false);
      d3.select(this).classed("selected", true);

      var parentGroup = d3.select(this.parentNode);
      parentGroup.classed("frozen", true);

      if (parentGroup.select("path.arc-glow").size() > 0) {
        parentGroup.select("path.arc-glow")
          .classed("persistent", true)
          .transition().duration(400)
          .attr("stroke-width", 4);
      } else if (parentGroup.select("circle").size() > 0) {
        parentGroup.select("circle")
          .classed("persistent", true)
          .transition().duration(400)
          .attr("stroke-width", 4);
      }

      d3.select("#subcat-title")
        .interrupt()
        .transition()
        .duration(200)
        .style("opacity", 1)
        .text(parentGroup.attr("data-pb"));

      app.openInfoPanel(
        companyObj.company, companyObj.summary || "No summary available", "company",
        companyObj.logo, companyObj.industry, companyObj.topFunctionalities,
        companyObj.yearCreation, companyObj.employeesOnLinkedIn, companyObj.followersOnLinkedIn,
        companyObj.websiteMonthlyVisitors, companyObj.url, parentGroup.attr("data-pb")
      );
    });
};

// Helper functions to turn text into numbers
function parseEmployees(str) {
  if (!str) return NaN;
  return parseInt(str.replace(/,/g, ""), 10);
}

function parseYear(str) {
  if (!str) return NaN;
  return parseInt(str, 10);
}

// Function to zoom into a category and plot companies
app.zoomToCategory = function () {
  if (app.zoomContainer) {
    app.zoomContainer.remove();
  }

  app.visContainer
    .style("pointer-events", "none")
    .transition()
    .duration(300)
    .style("opacity", 0);

  app.visContainer.selectAll(".company-logo, .company-circle")
    .style("pointer-events", "none");

  d3.select("#vis-toggle").attr("disabled", true);
  d3.select("#vis-toggle-container").style("display", "none");
  d3.select("#back-arrow-container").style("display", "block");

  app.zoomContainer = app.zoomGroup.append("g").attr("class", "zoom-container");

  const padding = 25;
  const logoSize = 20;
  const offset = 100;
  const jitterAmount = 10;

  const completeCompanies = app.currentCategoryCompanies.filter(c => {
    const employees = parseEmployees(c.employeesOnLinkedIn);
    const year = parseYear(c.yearCreation);
    return !isNaN(employees) && employees > 0 && !isNaN(year);
  });

  const missingYearOnly = app.currentCategoryCompanies.filter(c => {
    const employees = parseEmployees(c.employeesOnLinkedIn);
    const year = parseYear(c.yearCreation);
    return !isNaN(employees) && employees > 0 && isNaN(year);
  });

  const missingEmployeesOnly = app.currentCategoryCompanies.filter(c => {
    const employees = parseEmployees(c.employeesOnLinkedIn);
    const year = parseYear(c.yearCreation);
    return (isNaN(employees) || employees <= 0) && !isNaN(year);
  });

  const missingBoth = app.currentCategoryCompanies.filter(c => {
    const employees = parseEmployees(c.employeesOnLinkedIn);
    const year = parseYear(c.yearCreation);
    return (isNaN(employees) || employees <= 0) && isNaN(year);
  });

  if (completeCompanies.length > 0 || missingEmployeesOnly.length > 0) {
    const companiesWithYear = app.currentCategoryCompanies.filter(c => !isNaN(parseYear(c.yearCreation)));
    const employeesExtent = d3.extent(completeCompanies.concat(missingYearOnly), c => parseEmployees(c.employeesOnLinkedIn));
    const yearExtent = d3.extent(companiesWithYear, c => parseYear(c.yearCreation));
    const minEmployees = Math.max(1, employeesExtent[0]);

    const xScale = d3.scaleLinear()
      .domain([yearExtent[0], yearExtent[1]])
      .range([-app.width / 2 + padding, app.width / 2 - padding]);

    const yFixed = 0; // Fixed y position for all logos

    /*     const yScale = d3.scaleLog()
          .domain([yearExtent[0], yearExtent[1]])
          .range([app.height / 2 - padding, -app.height / 2 + padding]); */

    completeCompanies.forEach(companyObj => {
      const employees = parseEmployees(companyObj.employeesOnLinkedIn);
      const year = parseYear(companyObj.yearCreation);
      const x = xScale(year);
      /* const y = yScale(year); */
      /* const y = app.height / 2 - 30; */
      const y = app.height / 2 - (20 + Math.random() * 400);

      let newImage = app.zoomContainer.append("image")
        .datum(companyObj)
        .attr("class", "company-logo")
        .attr("xlink:href", companyObj.logo)
        .attr("width", logoSize)
        .attr("height", logoSize)
        .attr("x", x - logoSize / 2)
        .attr("y", y - logoSize / 2);

      app.attachCompanyEventHandlers(newImage, companyObj);

      newImage.node().addEventListener("error", function () {
        d3.select(this).remove();
        let fallbackCircle = app.zoomContainer.append("circle")
          .datum(companyObj)
          .attr("class", "company-circle")
          .attr("cx", x)
          .attr("cy", y)
          .attr("r", 4)
          .style("fill", "rgba(200,200,200,0.5)");
        app.attachCompanyEventHandlers(fallbackCircle, companyObj);
      });
    });

    app.zoomContainer.append("g")
      .attr("transform", `translate(0, ${app.height / 2})`)
      .call(d3.axisBottom(xScale).ticks(5).tickFormat(d3.format("d"))) // changed here
      .attr("class", "axis");

    /*     app.zoomContainer.append("g")
          .attr("transform", `translate(${-app.width / 2}, 0)`)
          .call(d3.axisLeft(yScale).ticks(5, d3.format("d")))
          .attr("class", "axis"); */

    app.zoomContainer.append("text")
      .attr("x", 0)
      .attr("y", app.height / 2 + 40)
      .attr("text-anchor", "middle")
      .text("Year of Creation");

    /*     app.zoomContainer.append("text")
          .attr("x", -app.width / 2 - 40)
          .attr("y", 0)
          .attr("text-anchor", "middle")
          .attr("transform", `rotate(-90, ${-app.width / 2 - 40}, 0)`)
          .text("Year of Creation"); */

    if (missingYearOnly.length > 0) {
      const baseYMissingYear = app.height / 2 + offset;
      missingYearOnly.forEach(companyObj => {
        const employees = parseEmployees(companyObj.employeesOnLinkedIn);
        const x = xScale(parseYear(companyObj.yearCreation));
        /* const y = baseYMissingYear + (Math.random() - 0.5) * jitterAmount; */
        const y = app.height / 2 - (10 + Math.random() * 10);

        let newImage = app.zoomContainer.append("image")
          .datum(companyObj)
          .attr("class", "company-logo")
          .attr("xlink:href", companyObj.logo)
          .attr("width", logoSize)
          .attr("height", logoSize)
          .attr("x", x - logoSize / 2)
          .attr("y", y - logoSize / 2);

        app.attachCompanyEventHandlers(newImage, companyObj);

        newImage.node().addEventListener("error", function () {
          d3.select(this).remove();
          let fallbackCircle = app.zoomContainer.append("circle")
            .datum(companyObj)
            .attr("class", "company-circle")
            .attr("cx", x)
            .attr("cy", y)
            .attr("r", 4)
            .style("fill", "rgba(200,200,200,0.5)");
          app.attachCompanyEventHandlers(fallbackCircle, companyObj);
        });
      });

      app.zoomContainer.append("text")
        .attr("x", 0)
        .attr("y", baseYMissingYear - 20);
    }

    if (missingEmployeesOnly.length > 0) {
      const baseXMissingEmployees = -app.width / 2 - offset;
      missingEmployeesOnly.forEach(companyObj => {
        const year = parseYear(companyObj.yearCreation);
        /* const y = yScale(year); */
        const x = baseXMissingEmployees + (Math.random() - 0.5) * jitterAmount;

        let newImage = app.zoomContainer.append("image")
          .datum(companyObj)
          .attr("class", "company-logo")
          .attr("xlink:href", companyObj.logo)
          .attr("width", logoSize)
          .attr("height", logoSize)
          .attr("x", x - logoSize / 2)
          .attr("y", y - logoSize / 2);

        app.attachCompanyEventHandlers(newImage, companyObj);

        newImage.node().addEventListener("error", function () {
          d3.select(this).remove();
          let fallbackCircle = app.zoomContainer.append("circle")
            .datum(companyObj)
            .attr("class", "company-circle")
            .attr("cx", x)
            .attr("cy", y)
            .attr("r", 4)
            .style("fill", "rgba(200,200,200,0.5)");
          app.attachCompanyEventHandlers(fallbackCircle, companyObj);
        });
      });

      app.zoomContainer.append("text")
        .attr("x", baseXMissingEmployees)
        .attr("y", 0)
        .attr("transform", `rotate(-90, ${baseXMissingEmployees}, 0)`);
    }
  }

  if (missingBoth.length > 0) {
    const gridOffset = 100;
    const gridGroup = app.zoomContainer.append("g")
      .attr("transform", `translate(${-app.width / 2 - offset - gridOffset}, ${app.height / 2 + offset})`);

    gridGroup.append("text")
      .attr("x", 0)
      .attr("y", -20);

    const columns = 5;
    const cellSize = 40;

    missingBoth.forEach((companyObj, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;
      const x = col * cellSize;
      const y = row * cellSize;

      let newImage = gridGroup.append("image")
        .datum(companyObj)
        .attr("class", "company-logo")
        .attr("xlink:href", companyObj.logo)
        .attr("width", logoSize)
        .attr("height", logoSize)
        .attr("x", x - logoSize / 2)
        .attr("y", y - logoSize / 2);

      app.attachCompanyEventHandlers(newImage, companyObj);

      newImage.node().addEventListener("error", function () {
        d3.select(this).remove();
        let fallbackCircle = gridGroup.append("circle")
          .datum(companyObj)
          .attr("class", "company-circle")
          .attr("cx", x)
          .attr("cy", y)
          .attr("r", 4)
          .style("fill", "rgba(200,200,200,0.5)");
        app.attachCompanyEventHandlers(fallbackCircle, companyObj);
      });
    });
  }
};

// Makes back arrow take you back
d3.select("#back-arrow").on("click", function (event) {
  event.stopPropagation();
  app.revertZoom();
});

// Function to go back to main chart
app.revertZoom = function () {
  app.zoomContainer.style("pointer-events", "none");
  app.zoomContainer.transition()
    .duration(400)
    .style("opacity", 0)
    .on("end", function () {
      app.zoomContainer.remove();
    });

  app.visContainer.transition()
    .duration(400)
    .style("opacity", 1)
    .on("end", function () {
      app.visContainer.style("pointer-events", "auto");
      app.visContainer.selectAll(".company-logo, .company-circle")
        .style("pointer-events", "auto");
    });

  d3.select("#vis-toggle").attr("disabled", null);
  d3.select("#vis-toggle-container").style("display", "flex");
  d3.select("#back-arrow-container").style("display", "none");

  app.openInfoPanel(
    app.visualizationTitles[app.currentVis],
    app.visualizationDescriptions[app.currentVis],
    "visualization"
  );
  if (app.currentClearPersistent) app.currentClearPersistent();
};

