# ImpactLabs Tech Radar Visualization

# Overview

This repository contains a web-based visualization tool developed by ImpactLabs to map companies to planetary boundaries and technology radar categories. The project leverages D3.js to create interactive sunburst charts, providing insights into companies' contributions to sustainability and their roles across various industries and regions. The tool features two primary views: the Planetary Boundary View and the Categories View, each with interactive elements like tooltips, company logos, filters, and detailed info panels.

# Features
Two Visualization Modes:

- Planetary Boundary View: Maps companies to planetary boundaries, highlighting their sustainability contributions.
- Categories View: Maps companies to technology radar categories, showcasing their roles in industries and regions.

Built using D3.js, with arcs representing categories or boundaries.
Company logos or fallback circles are positioned within arcs, avoiding overlap.
Hover effects highlight arcs and display category names.
Clicking an arc or company logo opens a detailed info panel.

Filters:
- Filter by "Tech Radar Categories", "Industry", and "Region of Activity" in the Planetary Boundary View.
- Filter by "Industry" and "Region of Activity" in the Categories View.
- Includes a search bar for keyword-based filtering.

Info Panels:
- Displays visualization titles and descriptions on load.
- Shows detailed company information (e.g., summary, industry, year of creation) upon clicking a company logo.
- Provides category details and a "Zoom" button in the Categories View to explore companies in a scatter plot.

Deep Dive Indicators:
In the Categories View, categories with deep dives are marked with a triangle indicator, linking to external resources.

Zoom and Navigation:
Supports zooming and panning on the charts.
A "Zoom" feature in the Categories View allows users to explore companies in a scatter plot based on year of creation and number of employees.
A back arrow reverts to the main chart view.


Responsive Design:
Styled with CSS for a modern, futuristic look using gradients and shadows.
Optimized for readability and interaction with hover effects and transitions.


# Key Files 
- index.html: The main HTML file that sets up the structure of the web page, including the SVG canvas, toggle switch for visualization modes, info panel, and filter/search UI elements.
- styles.css: Defines the styling for the visualizations, including futuristic color gradients, hover effects, and layout for the info panel, filters, and toggle switch.
- eventHandlers.js: Contains shared logic for both visualizations, including:
  -  Setup of the SVG canvas, zoom behavior, and global settings (e.g., chart dimensions, colors).
  - Functions for creating filters, applying filters, handling company interactions (e.g., tooltips, clicks), and managing the info panel.
  - Logic for switching between visualizations and zooming into categories.
- visualization_planetary_boundaries.js: Implements the Planetary Boundary View:
  Loads data from Updated_Dataframe.csv.
  Renders a sunburst chart with arcs for planetary boundaries and a central "Transversal" circle.
  Places company logos or fallback circles within arcs, ensuring no overlap.
  Adds filters and interaction handlers.
- visualization_IL_categories.js: Implements the Categories View:
  - Loads data from Updated_Exploded_Tech_Radar_Categories_Data.csv and category descriptions from Category_descriptions.csv.
  - Renders a sunburst chart with arcs for technology radar categories.
  - Includes deep dive indicators (triangles) for categories with additional resources.
  - Supports zooming into a category to view a scatter plot of companies.
- data/: Contains CSV files with company data, category descriptions, and deep dive links used to populate the visualizations.

# Dependencies
- D3.js: Used for creating and manipulating the sunburst charts and interactive elements.
- Roboto Font: Included via Google Fonts for consistent typography.
- Math.seedrandom: Used for deterministic random placement of company logos to ensure consistent layouts.

# Installation
- Clone the Repository:
git clone <repository-url>
cd <repository-directory>
- Set Up a Local Server:
use a tool like live-server if you have Node.js installed:
"
npm install -g live-server
live-server
"
Open in Browser
