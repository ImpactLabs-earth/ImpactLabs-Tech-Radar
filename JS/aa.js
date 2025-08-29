// Create a global storage space called `app` to keep things both charts can use
const app = {}; // `const` means `app` won’t point to a new object, but we can add stuff to it

// Add titles for the two charts to `app`
app.visualizationTitles = {
  vis1: "ImpactLabs Tech Radar - Planetary Boundary View",
  vis2: "ImpactLabs Tech Radar - Categories View"
};

// Add descriptions for the two charts to `app`
app.visualizationDescriptions = {
  vis1: "TEST - This visualization maps companies to planetary boundaries, highlighting their contributions to sustainability across various categories.",
  vis2: "TEST - This visualization maps companies to technology radar categories, highlighting their roles in various industries and regions."
};

// Set up numbers that control how the chart looks
app.width = 800;
app.height = 800;
app.radius = 300;
app.pointRadius = 2;
app.logoSize = 6.5;
app.ringGap = 7;
app.outerLeafReduction = 10;
app.marginFactor = 5.5;
app.transversalRadius = 142;
app.centerLogoSize = 75;

// Set up colors for the chart
app.futuristicColors = [
  "#00b894", "#00cec9", "#0984e3", "#6c5ce7",
  "#74b9ff", "#a29bfe", "#55efc4", "#81ecec"
];
app.colorScale = d3.scaleOrdinal().range(app.futuristicColors);

// Set up the drawing area (SVG)
app.svg = d3.select("#chart");
app.zoomGroup = app.svg.append("g");
app.visContainer = app.zoomGroup.append("g").attr("class", "vis-container");

// Set up zooming and panning
app.zoom = d3.zoom()
  .scaleExtent([0.1, 10])
  .on("zoom", event => app.zoomGroup.attr("transform", event.transform));

app.svg.call(app.zoom);
app.svg.call(app.zoom.transform, d3.zoomIdentity.translate(window.innerWidth/3.5, window.innerHeight/3.6));

// Function to switch between charts with a fade
app.switchVisualization = function(newRenderFunction) {
  d3.select("#info-panel").classed("open", false);
  if (app.zoomContainer) app.zoomContainer.remove();
  app.visContainer.transition()
    .duration(400)
    .style("opacity", 0)
    .on("end", function() {
      app.visContainer.selectAll("*").interrupt().remove();
      newRenderFunction();
      app.visContainer.style("opacity", 0);
      app.visContainer.transition()
        .duration(400)
        .style("opacity", 1);
    });
};

// Function to show the info panel with details
app.openInfoPanel = function(
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
  if (type === "category") {
    d3.select("#zoom-button").on("click", app.zoomToCategory);
  }
  if (panel.classed("open")) {
    panel.classed("open", false);
    setTimeout(() => panel.classed("open", true), 300);
  } else {
    panel.classed("open", true);
  }
};

// Makes the "X" button close the info panel
d3.select("#close-panel").on("click", function() {
  d3.select("#info-panel").classed("open", false);
  if (app.currentClearPersistent) app.currentClearPersistent();
});

// Handles the toggle switch between charts
const toggle = d3.select("#vis-toggle");
toggle.on("change", function() {
  const selectedVis = this.checked ? "vis2" : "vis1";
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
window.addEventListener("load", function() {
  // d3.csv("/data/deep_dives.csv").then(function(data) {
  d3.csv("/tech-radar-viz/data/deep_dives.csv").then(function(data) {
    app.deepDivesMap = {};
    data.forEach(d => {
      const category = d.category;
      if (!app.deepDivesMap[category]) app.deepDivesMap[category] = [];
      app.deepDivesMap[category].push({
        deep_dive: d.deep_dive,
        deep_dive_link: d.deep_dive_link
      });
    });
  }).catch(function(error) {
    console.error("Error loading deep_dives.csv:", error);
  });

  const initialToggleState = document.getElementById("vis-toggle").checked;
  if (initialToggleState) {
    d3.select("#vis2-label").classed("active", true);
    app.renderVisualization2();
  } else {
    d3.select("#vis1-label").classed("active", true);
    app.renderVisualization1();
  }
});

// Function to make filter dropdowns
app.createFilters = function(filterColumns, data) {
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

  filters.each(function(col) {
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
      .on("click", function(event) {
        event.stopPropagation();
        const dropdown = d3.select(this.parentNode).select(".filter-dropdown");
        const isOpen = dropdown.classed("open");
        filterContainer.selectAll(".filter-dropdown").classed("open", false);
        dropdown.classed("open", !isOpen);
      });
  });

  d3.select(document).on("click", function(event) {
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
app.applyFilters = function(data) {
  const filterContainer = d3.select("#filter-container");
  const filters = {};

  filterContainer.selectAll(".filter").each(function() {
    const col = d3.select(this).select(".filter-button span").text();
    const selectedValues = [];
    d3.select(this).selectAll(".filter-options input[type='checkbox']:checked").each(function() {
      selectedValues.push(this.value);
    });
    if (selectedValues.length > 0) filters[col] = selectedValues;
  });

  d3.selectAll(".company-logo, .company-circle").each(function(d) {
    const companyData = d;
    let isVisible = true;

    Object.keys(filters).forEach(col => {
      const companyValues = companyData[col] ? companyData[col].split(", ").map(v => v.trim()) : [];
      const matches = filters[col].some(val => companyValues.includes(val));
      if (!matches) isVisible = false;
    });

    d3.select(this)
      .style("pointer-events", isVisible ? "auto" : "none")
      .transition()
      .duration(300)
      .style("opacity", isVisible ? 1 : 0);
  });
};

// Function to add mouse and click actions to companies
app.attachCompanyEventHandlers = function(selection, companyObj) {
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

// Function to zoom into a category
app.zoomToCategory = function() {
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
  const validCompanies = app.currentCategoryCompanies.filter(c => {
    const employees = parseEmployees(c.employeesOnLinkedIn);
    const year = parseYear(c.yearCreation);
    return !isNaN(employees) && !isNaN(year);
  });

  if (validCompanies.length === 0) {
    app.zoomContainer.append("text")
      .attr("x", 0)
      .attr("y", 0)
      .attr("text-anchor", "middle")
      .text("No companies with valid data");
    return;
  }

  const employeesExtent = d3.extent(validCompanies, c => parseEmployees(c.employeesOnLinkedIn));
  const yearExtent = d3.extent(validCompanies, c => parseYear(c.yearCreation));
  const xScale = d3.scaleLinear()
    .domain(employeesExtent)
    .range([-app.width / 2, app.width / 2]);
  const yScale = d3.scaleLinear()
    .domain(yearExtent)
    .range([app.height / 2, -app.height / 2]);

  validCompanies.forEach(function(companyObj) {
    const employees = parseEmployees(companyObj.employeesOnLinkedIn);
    const year = parseYear(companyObj.yearCreation);
    const x = xScale(employees);
    const y = yScale(year);
    const logoSize = 20;
    let newImage = app.zoomContainer.append("image")
      .datum(companyObj)
      .attr("class", "company-logo")
      .attr("xlink:href", companyObj.logo)
      .attr("width", logoSize)
      .attr("height", logoSize)
      .attr("x", x - logoSize / 2)
      .attr("y", y - logoSize / 2);
    app.attachCompanyEventHandlers(newImage, companyObj);

    newImage.node().addEventListener("error", function() {
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
    .call(d3.axisBottom(xScale).ticks(5));
  app.zoomContainer.append("g")
    .attr("transform", `translate(${-app.width / 2}, 0)`)
    .call(d3.axisLeft(yScale).ticks(5));
  app.zoomContainer.append("text")
    .attr("x", 0)
    .attr("y", app.height / 2 + 40)
    .attr("text-anchor", "middle")
    .text("Employees on LinkedIn");
  app.zoomContainer.append("text")
    .attr("x", -app.width / 2 - 40)
    .attr("y", 0)
    .attr("text-anchor", "middle")
    .attr("transform", `rotate(-90, ${-app.width / 2 - 40}, 0)`)
    .text("Year of Creation");
};

// Makes back arrow take you back
d3.select("#back-arrow").on("click", function(event) {
  event.stopPropagation();
  app.revertZoom();
});

// Function to go back to main chart
app.revertZoom = function() {
  app.zoomContainer.style("pointer-events", "none");
  app.zoomContainer.transition()
    .duration(400)
    .style("opacity", 0)
    .on("end", function() {
      app.zoomContainer.remove();
    });

  app.visContainer.transition()
    .duration(400)
    .style("opacity", 1)
    .on("end", function() {
      app.visContainer.style("pointer-events", "auto");
      app.visContainer.selectAll(".company-logo, .company-circle")
        .style("pointer-events", "auto");
    });

  d3.select("#vis-toggle").attr("disabled", null);
  d3.select("#vis-toggle-container").style("display", "flex");
  d3.select("#back-arrow-container").style("display", "none");
};