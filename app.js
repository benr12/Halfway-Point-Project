let map;
let markerA, markerB, midpointMarker;

function initMap() {
  // hardcoded on iowa for now
  const iowa = { lat: 41.8780, lng: -93.0977 };

  map = new google.maps.Map(document.getElementById("map"), {
    center: iowa,
    zoom: 7,
  });

  // hook up autocomplete to both inputs
  const autocompleteA = new google.maps.places.Autocomplete(
    document.getElementById("location-a")
  );
  const autocompleteB = new google.maps.places.Autocomplete(
    document.getElementById("location-b")
  );

  // wire up the search button
  document.querySelector(".search-btn").addEventListener("click", () => {
    const placeA = autocompleteA.getPlace();
    const placeB = autocompleteB.getPlace();

    // make sure both have real coordinates
    if (!placeA?.geometry || !placeB?.geometry) {
      alert("Please select both locations from the dropdown suggestions");
      return;
    }

    const latA = placeA.geometry.location.lat();
    const lngA = placeA.geometry.location.lng();
    const latB = placeB.geometry.location.lat();
    const lngB = placeB.geometry.location.lng();

    // calculate midpoint (simple average for now)
    const midLat = (latA + latB) / 2;
    const midLng = (lngA + lngB) / 2;
    const midpoint = { lat: midLat, lng: midLng };

    // drop markers for A, B, and midpoint
    if (markerA) markerA.setMap(null);
    if (markerB) markerB.setMap(null);
    if (midpointMarker) midpointMarker.setMap(null);

    markerA = new google.maps.Marker({ position: { lat: latA, lng: lngA }, map, title: "Your Location" });
    markerB = new google.maps.Marker({ position: { lat: latB, lng: lngB }, map, title: "Person B" });
    midpointMarker = new google.maps.Marker({ position: midpoint, map, title: "Midpoint" });

    // zoom map to fit all three markers
    const bounds = new google.maps.LatLngBounds();
    bounds.extend({ lat: latA, lng: lngA });
    bounds.extend({ lat: latB, lng: lngB });
    bounds.extend(midpoint);
    map.fitBounds(bounds);
  });
}