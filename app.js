function initMap() {
  // hardcoded on iowa for now
  const iowa = { lat: 41.8780, lng: -93.0977 };

  const map = new google.maps.Map(document.getElementById("map"), {
    center: iowa,
    zoom: 7,
  });

  // placeholder midpoint marker
  new google.maps.Marker({
    position: iowa,
    map: map,
    title: "Midpoint",
  });
}