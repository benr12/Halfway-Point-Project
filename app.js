// Stores the Google Map object
let map;

// Markers for the two users and the midpoint
let markerA, markerB, midpointMarker;

// Google Maps services
let placesService;    // Finds nearby places
let distanceService;  // Calculates driving times
let geocoder;         // Turns coordinates into an address

// State used across the app
let placeMarkers = [];      // Markers for suggested places
let selectedType = "cafe"; // Default place type
let lastMidpoint = null;   // Saved midpoint for refreshing results

// Shortcut for document.querySelector
const $ = (selector) => document.querySelector(selector);


// Runs when Google Maps loads
function initMap() {

  // Starting map location
  const iowa = { lat: 41.8780, lng: -93.0977 };

  // Create the map
  map = new google.maps.Map($("#map"), {
    center: iowa,
    zoom: 7,
  });

  // Initialize Google Maps services
  placesService = new google.maps.places.PlacesService(map);
  distanceService = new google.maps.DistanceMatrixService();
  geocoder = new google.maps.Geocoder();

  // Enable address autocomplete for both inputs
  const autocompleteA = new google.maps.places.Autocomplete($("#location-a"));
  const autocompleteB = new google.maps.places.Autocomplete($("#location-b"));

  // Update radius text and refresh places when slider changes
  $("#radius-slider")?.addEventListener("input", () => {
    updateRadiusLabel();
    if (lastMidpoint) searchNearby(lastMidpoint);
  });

  // Set the initial radius label
  updateRadiusLabel();

  // Handle Coffee / Restaurant / Park buttons
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {

      // Update active button styling
      document.querySelectorAll(".filter-btn")
        .forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      // Decide which place type to search for
      const text = btn.textContent.toLowerCase();
      selectedType =
        text.includes("coffee") ? "cafe" :
        text.includes("restaurant") ? "restaurant" :
        "park";

      // Refresh results if midpoint already exists
      if (lastMidpoint) searchNearby(lastMidpoint);
    });
  });

  // Handle Find Midpoint button
  $(".search-btn").addEventListener("click", () => {

    // Get selected places from autocomplete
    const placeA = autocompleteA.getPlace();
    const placeB = autocompleteB.getPlace();

    // Make sure both addresses were selected correctly
    if (!placeA?.geometry || !placeB?.geometry) {
      alert("Please select both locations from the dropdown suggestions");
      return;
    }

    // Get latitude and longitude for each place
    const latA = placeA.geometry.location.lat();
    const lngA = placeA.geometry.location.lng();
    const latB = placeB.geometry.location.lat();
    const lngB = placeB.geometry.location.lng();

    // Calculate the midpoint between the two locations
    const midpoint = {
      lat: (latA + latB) / 2,
      lng: (lngA + lngB) / 2
    };

    // Save midpoint so other features can use it
    lastMidpoint = new google.maps.LatLng(midpoint.lat, midpoint.lng);

    // Remove old markers
    markerA?.setMap(null);
    markerB?.setMap(null);
    midpointMarker?.setMap(null);

    // Marker for first user
    markerA = new google.maps.Marker({
      position: { lat: latA, lng: lngA },
      map,
      title: "Your Location",
      icon: "http://maps.google.com/mapfiles/ms/icons/green-dot.png"
    });

    // Marker for second user
    markerB = new google.maps.Marker({
      position: { lat: latB, lng: lngB },
      map,
      title: "Person B",
      icon: "http://maps.google.com/mapfiles/ms/icons/green-dot.png"
    });

    // Marker for midpoint
    midpointMarker = new google.maps.Marker({
      position: midpoint,
      map,
      title: "Midpoint",
      icon: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
    });

    // Adjust map to show all markers
    const bounds = new google.maps.LatLngBounds();
    bounds.extend({ lat: latA, lng: lngA });
    bounds.extend({ lat: latB, lng: lngB });
    bounds.extend(midpoint);
    map.fitBounds(bounds);

    // Update related UI sections
    updateETAs(placeA.geometry.location, placeB.geometry.location, lastMidpoint);
    updateMidpointLabel(lastMidpoint);
    searchNearby(lastMidpoint);
  });
}


// Updates the text next to the radius slider
function updateRadiusLabel() {
  const slider = $("#radius-slider");
  const label = $(".radius-value");
  if (slider && label) label.textContent = `${slider.value} miles`;
}

// Converts miles to meters for Google APIs
function radiusMeters() {
  return Number($("#radius-slider")?.value || 5) * 1609.34;
}

// Removes all existing place markers from the map
function clearPlaceMarkers() {
  placeMarkers.forEach(m => m.setMap(null));
  placeMarkers = [];
}


// Searches for nearby places around the midpoint
function searchNearby(midpoint) {
  if (!placesService) return;

  clearPlaceMarkers();

  placesService.nearbySearch(
    {
      location: midpoint,
      radius: radiusMeters(),
      type: selectedType,
    },
    (results, status) => {

      const list = $(".place-list");
      if (!list) return;
      list.innerHTML = "";

      if (status !== "OK" || !results?.length) {
        list.innerHTML = `<p class="empty-state">No places found.</p>`;
        return;
      }

      const infoWindow = new google.maps.InfoWindow();

      results.slice(0, 5).forEach((place) => {

        // Create a marker for each place
        const marker = new google.maps.Marker({
          map,
          position: place.geometry.location,
          title: place.name,
        });

        // Show place details when marker is clicked
        marker.addListener("click", () => {
          infoWindow.setContent(`
            <strong>${place.name}</strong><br/>
            ${place.vicinity ?? ""}<br/>
            ⭐ ${place.rating ?? "—"}<br/>
            <a target="_blank"
               href="https://www.google.com/maps/place/?q=place_id:${place.place_id}">
               Open in Google Maps
            </a>
          `);
          infoWindow.open(map, marker);
        });

        placeMarkers.push(marker);

        // Create a card in the sidebar
        const card = document.createElement("div");
        card.className = "place-card";
        card.innerHTML = `
          <h4>${place.name}</h4>
          <p>${place.vicinity ?? ""}</p>
          ⭐ ${place.rating ?? "—"}
        `;

        // Clicking the card focuses the map on that place
        card.onclick = () => {
          map.panTo(marker.getPosition());
          map.setZoom(14);
          google.maps.event.trigger(marker, "click");
        };

        list.appendChild(card);
      });
    }
  );
}


// Updates driving time estimates for both users
function updateETAs(a, b, midpoint) {
  const etas = document.querySelectorAll(".route-card .eta");
  if (!etas.length) return;

  const getETA = (index, origin) => {
    distanceService.getDistanceMatrix(
      {
        origins: [origin],
        destinations: [midpoint],
        travelMode: "DRIVING",
      },
      (res, status) => {
        const time = res?.rows?.[0]?.elements?.[0]?.duration?.text;
        etas[index].textContent = `⏱️ Estimated: ${status === "OK" ? time : "—"}`;
      }
    );
  };

  getETA(0, a);
  getETA(1, b);
}


// Updates the text that shows where the midpoint is located
function updateMidpointLabel(midpoint) {
  const label = $(".weather-location");
  if (!label) return;

  geocoder.geocode({ location: midpoint }, (results, status) => {
    if (status === "OK" && results?.[0]) {
      label.textContent = results[0].formatted_address;
    }
  });

  // Weather is just a placeholder for now not weather API
  $(".temp") && ($(".temp").textContent = "—°F");
  $(".condition") && ($(".condition").textContent = "⛅");
}
