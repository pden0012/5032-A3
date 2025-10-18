<template>
  <div class="map-container">
    <h1>Mental Health Resources Map</h1>
    
    <!-- map controls with search and navigation -->
    <div class="map-controls" role="region" aria-label="Map search and navigation controls">
      <div class="search-section">
        <input 
          v-model="searchQuery" 
          @keyup.enter="searchByTextGoogle"
          placeholder="Search places of interest..."
          class="search-input"
          aria-label="Search for places of interest"
          aria-describedby="search-instructions"
        />
        <button @click="searchByTextGoogle" class="search-btn" aria-label="Search for the entered location">
          Search
        </button>
      </div>
      <div class="control-buttons">
        <button @click="getCurrentLocation" class="control-btn location-btn" aria-label="Get my current location">
          My Location
        </button>
        <button @click="searchNearbyHospitalsGoogle" class="control-btn" aria-label="Find nearby mental health support">
          Support
        </button>
        <button @click="navigateLastTwoGoogle" class="control-btn navigate-btn" aria-label="Show navigation routes between markers">
          Navigate
        </button>
        <button @click="clearMarkers" class="control-btn clear-btn" aria-label="Clear all markers and routes">
          Clear All
        </button>
      </div>
    </div>
    
    <!-- search instructions for screen readers -->
    <div id="search-instructions" class="sr-only">
      Search for places of interest like landmarks, tourist attractions, or mental health facilities. Press Enter or click Search to find locations on the map.
    </div>
    
    <!-- mapbox map container -->
    <div id="map" class="map"></div>
    
    <!-- route info display -->
    <div v-if="routeInfo" class="route-info">
      <div class="route-details">
        <span class="mode">Mode: {{ routeInfo.mode }}</span>
        <span class="distance">Distance: {{ routeInfo.distance }}</span>
        <span class="duration">Time: {{ routeInfo.duration }}</span>
      </div>
    </div>
    
    <!-- usage instructions for map features -->
    <div class="instructions">
      <h2>Instructions</h2>
      <p>• Search for places of interest using the search box</p>
      <p>• Click "Navigate" to show routes between markers</p>
      <p>• Click "My Location" to get your current position</p>
      <p>• Click anywhere on the map to add custom markers</p>
      <p>• Remove individual markers or clear all</p>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import mapboxgl from 'mapbox-gl'
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'
import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'

// mapbox public token for development and testing
const MAPBOX_TOKEN = 'pk.eyJ1IjoiZGF2aWQxMjMzMzQ1NiIsImEiOiJjbTJyYmV6aTExZWczMmtweW1yM2VhcWhwIn0.D2mLsX9srM4Yg789Cmbfyg'
// google maps api key (provided by user)
const GOOGLE_MAPS_API_KEY = 'AIzaSyALzSmKQMmeW3Tm0TRm_5kqTyPA99DPGAA'

export default {
  name: 'Map',
  setup() {
    const map = ref(null)
    const markers = ref([]) // user and poi markers data
    const mapMarkers = ref([]) // mapbox marker instances
    const poiMarkers = ref([]) // separate list for hospital/clinic markers
    const searchQuery = ref('')
    const geocoder = ref(null)
    const routeLines = ref([])
    const routesInfo = ref([])
    const routeInfo = ref(null) // current route distance and time
    // google maps state
    const googleReady = ref(false)
    let gMap = null
    let gPlaces = null
    let gDirectionsService = null
    let gDirectionsRenderer = null
    const navigationMode = ref(false)
    
    /**
     * calculate total distance between consecutive markers using haversine formula
     * computes the sum of distances between all marker pairs in sequence
     * returns zero if fewer than two markers are present
     */
    const totalDistance = computed(() => {
      if (markers.value.length < 2) return 0
      
      let total = 0
      for (let i = 0; i < markers.value.length - 1; i++) {
        const distance = calculateDistance(markers.value[i], markers.value[i + 1])
        total += distance
      }
      return total
    })
    
    /**
     * calculate distance between two geographic points using haversine formula
     * takes latitude and longitude coordinates for two points
     * returns distance in kilometers accounting for earth's curvature
     */
    const calculateDistance = (point1, point2) => {
      const R = 6371 // earth radius in kilometers
      const dLat = (point2.lat - point1.lat) * Math.PI / 180
      const dLon = (point2.lng - point1.lng) * Math.PI / 180
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
      return R * c
    }
    
    /**
     * initialize mapbox map with melbourne as default center
     * sets up map container, click handlers, and navigation controls
     * configures map style and initial viewport settings
     */
    const initMap = () => {
      mapboxgl.accessToken = MAPBOX_TOKEN
      
      map.value = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [144.9631, -37.8136], // melbourne coordinates
        zoom: 10
      })
      
      // add click handler to create markers on map click
      map.value.on('click', async (e) => {
        addMarker(e.lngLat.lng, e.lngLat.lat)
        // after user drops a point, auto search nearby hospitals/clinics
        await showNearbyHealthcare(e.lngLat.lng, e.lngLat.lat)
      })
      
      // add navigation controls for zoom and pan
      map.value.addControl(new mapboxgl.NavigationControl(), 'top-right')
      
      // initialize geocoder for place search with error handling
      try {
        geocoder.value = new MapboxGeocoder({
          accessToken: MAPBOX_TOKEN,
          mapboxgl: mapboxgl,
          placeholder: 'Search places...',
          marker: false
        })
        
        // add geocoder to map
        map.value.addControl(geocoder.value, 'top-left')
        
        // handle geocoder result
        geocoder.value.on('result', (e) => {
          const result = e.result
          addMarker(result.center[0], result.center[1])
          searchQuery.value = result.place_name
        })
      } catch (error) {
        console.warn('MapboxGeocoder failed to initialize:', error)
        // continue without geocoder if it fails
      }
      
      // handle map load errors
      map.value.on('error', (e) => {
        console.warn('Mapbox error:', e)
        // fallback: show simple message if map fails to load
        document.getElementById('map').innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;background:#f8f9fa;color:#333;"><div><h2>Map Loading...</h2><p>If map doesn\'t appear, try refreshing the page</p></div></div>'
      })
    }

    /**
     * load google maps script then init
     */
    const loadGoogleMaps = () => {
      return new Promise((resolve, reject) => {
        if (window.google && window.google.maps) {
          resolve()
          return
        }
        const script = document.createElement('script')
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&v=weekly`
        script.async = true
        script.defer = true
        script.onload = () => resolve()
        script.onerror = reject
        document.head.appendChild(script)
      })
    }

    /**
     * init google map and services
     */
    const initGoogleMap = () => {
      try {
        const center = { lat: -37.8136, lng: 144.9631 }
        gMap = new window.google.maps.Map(document.getElementById('map'), { center, zoom: 13 })
        gPlaces = new window.google.maps.places.PlacesService(gMap)
        gDirectionsService = new window.google.maps.DirectionsService()
        gDirectionsRenderer = new window.google.maps.DirectionsRenderer({ suppressMarkers: true })
        gDirectionsRenderer.setMap(gMap)
        // click to add marker and auto load nearby healthcare
        gMap.addListener('click', async (e) => {
          addGMarker(e.latLng.lng(), e.latLng.lat(), 'Point', 'user')
          await nearbyHealthcareGoogle(e.latLng)
        })
        googleReady.value = true
      } catch (e) {
        console.error('initGoogleMap error', e)
      }
    }

    const addGMarker = (lng, lat, title, kind='user') => {
      const pos = { lat, lng }
      const m = new window.google.maps.Marker({ position: pos, map: gMap, label: kind === 'poi' ? 'H' : undefined, title })
      mapMarkers.value.push({ remove: () => m.setMap(null) })
      markers.value.push({ lng, lat, title, kind })
      if (kind === 'poi') poiMarkers.value.push({ remove: () => m.setMap(null) })
      if (title) {
        const infowindow = new window.google.maps.InfoWindow({ content: `<div style=\"font-size:12px\"><div><strong>${title}</strong></div><div style=\"margin-top:6px;display:flex;gap:6px\"><button id=\"nav-btn\" style=\"padding:4px 8px;background:#28a745;color:#fff;border:none;cursor:pointer\">Navigate</button><button id=\"nearby-btn\" style=\"padding:4px 8px;background:#007bff;color:#fff;border:none;cursor:pointer\">Nearby</button></div></div>` })
        m.addListener('click', () => {
          infowindow.open({ anchor: m, map: gMap })
          setTimeout(() => {
            const btn = document.getElementById('nav-btn')
            if (btn) btn.onclick = () => navigateToNearestUser({ lng, lat })
            const near = document.getElementById('nearby-btn')
            if (near) near.onclick = () => nearbyHealthcareGoogle(new window.google.maps.LatLng(lat, lng))
          }, 0)
        })
      }
    }

    const nearbyHealthcareGoogle = (latLng) => {
      return new Promise((resolve) => {
        // Use new Places API instead of deprecated nearbySearch
        if (window.google.maps.places.Place) {
          const request = {
            location: latLng,
            radius: 4000,
            keyword: 'mental health hospital clinic medical center counseling therapy support helpline crisis intervention',
            type: ['hospital', 'health']
          }
          
          // Try using the new Places API
          try {
            window.google.maps.places.Place.searchNearby(request).then((results) => {
              if (results && results.length > 0) {
                results.slice(0, 8).forEach(r => {
                  if (r.location) {
                    addGMarker(r.location.lng(), r.location.lat(), r.displayName || 'Hospital', 'poi')
                  }
                })
              }
              resolve()
            }).catch(() => {
              // Fallback: use text search if nearby search fails
              searchHealthcareByText(latLng).then(resolve)
            })
          } catch (error) {
            console.warn('New Places API not available, using fallback')
            searchHealthcareByText(latLng).then(resolve)
          }
        } else {
          // Fallback: use text search
          searchHealthcareByText(latLng).then(resolve)
        }
      })
    }

    const searchHealthcareByText = (latLng) => {
      return new Promise((resolve) => {
        const request = {
          query: 'mental health hospital clinic medical center counseling therapy support helpline crisis intervention',
          location: latLng,
          radius: 4000
        }
        
        gPlaces.textSearch(request, (results, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
            results.slice(0, 8).forEach(r => addGMarker(r.geometry.location.lng(), r.geometry.location.lat(), r.name, 'poi'))
          }
          resolve()
        })
      })
    }

    // Support button: search around current map center for mental health services (Google Places)
    const searchNearbyHospitalsGoogle = () => {
      if (!googleReady.value || !gMap) return
      const center = gMap.getCenter()
      nearbyHealthcareGoogle(center)
    }

    const drawSingleRouteGoogle = async (start, end) => {
      const mode = window.google.maps.TravelMode.DRIVING // changed to driving per request
      gDirectionsService.route({ 
        origin: { lat: start.lat, lng: start.lng }, 
        destination: { lat: end.lat, lng: end.lng }, 
        travelMode: mode,
        language: 'en' // force English language
      }, (res, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          gDirectionsRenderer.setDirections(res)
          const leg = res.routes[0].legs[0]
          // format distance and time for display in English
          const distance = leg.distance.text
          const duration = leg.duration.text
          const travelMode = mode === window.google.maps.TravelMode.WALKING ? 'Walking' : 'Driving'
          routeInfo.value = { mode: travelMode, distance, duration }
          routesInfo.value = []
          routesInfo.value.push({ distance: leg.distance.value, duration: leg.duration.value })
        } else {
          console.warn('Directions failed', status)
          routeInfo.value = null
        }
      })
    }
    
    /**
     * add new marker to map and update marker collections
     * creates numbered marker element and adds to both data arrays
     * adjusts map view to fit all markers when multiple exist
     * supports custom titles for places of interest
     */
    const addMarker = (lng, lat, title = null, kind = 'user') => {
      const markerData = { lng, lat, title: title || `Marker ${markers.value.length + 1}`, kind } // create marker data
      markers.value.push(markerData) // add to marker array
      
      // create numbered marker element
      const el = document.createElement('div')
      el.className = kind === 'poi' ? 'poi-marker' : 'custom-marker'
      el.innerHTML = kind === 'poi' ? 'H' : markers.value.length.toString()
      
      // add marker to map
      const marker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat]) // set coordinates
        .addTo(map.value) // add to map
      
      // add popup if title exists
      if (title) {
        const popupEl = document.createElement('div')
        popupEl.innerHTML = `<div style="font-size:12px"><div><strong>${title}</strong></div><button id="nav-btn" style="margin-top:6px;padding:4px 8px;background:#28a745;color:#fff;border:none;cursor:pointer">Navigate</button></div>`
        const popup = new mapboxgl.Popup().setDOMContent(popupEl)
        marker.setPopup(popup)
        // when user clicks navigate on a POI, draw single route from last user marker
        popup.on('open', () => {
          const btn = popupEl.querySelector('#nav-btn')
          if (btn) {
            btn.addEventListener('click', () => {
              navigateToNearestUser({ lng, lat })
            })
          }
        })
      }
      
      mapMarkers.value.push(marker) // add to marker instance array
      if (kind === 'poi') {
        poiMarkers.value.push(marker)
      }
      
      // adjust map view if multiple markers exist
      if (markers.value.length > 1) {
        fitMapToMarkers() // fit all markers
      }
    }

    /**
     * searchByTextGoogle
     * use Places text search to move map to result and then load nearby hospitals
     */
    const searchByTextGoogle = () => {
      try {
        if (!searchQuery.value || !googleReady.value || !gMap) return
        const request = { query: searchQuery.value, fields: ['name', 'geometry'] }
        const service = new window.google.maps.places.PlacesService(gMap)
        service.findPlaceFromQuery(request, (results, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && results && results[0]) {
            const r = results[0]
            const loc = r.geometry.location
            gMap.setCenter(loc)
            addGMarker(loc.lng(), loc.lat(), r.name || searchQuery.value, 'poi')
            nearbyHealthcareGoogle(loc)
          }
        })
      } catch (e) { console.error('searchByTextGoogle error', e) }
    }

    /**
     * find nearest user marker (non-poi); draw route from that to dest
     */
    const navigateToNearestUser = async (dest) => {
      let origin = null
      try {
        const userPoints = markers.value.filter(m => m.kind !== 'poi')
        if (userPoints.length === 0) {
          // no origin yet: try current location as start
          await new Promise((resolve, reject) => {
            if (!navigator.geolocation) return reject(new Error('geo not supported'))
            navigator.geolocation.getCurrentPosition((pos) => {
              if (googleReady.value && gMap) {
                addGMarker(pos.coords.longitude, pos.coords.latitude, 'Me', 'user')
              } else {
                addMarker(pos.coords.longitude, pos.coords.latitude, 'Me', 'user')
              }
              resolve()
            }, reject, { enableHighAccuracy: true, timeout: 8000, maximumAge: 120000 })
          })
          origin = markers.value.filter(m => m.kind !== 'poi').slice(-1)[0]
        } else {
          origin = userPoints[userPoints.length - 1]
        }
        if (!origin) return
        if (googleReady.value) {
          await drawSingleRouteGoogle(origin, dest)
        } else {
          await drawSingleRoute(origin, dest)
        }
      } catch (e) {
        console.error('navigateToNearestUser error', e)
      }
    }
    
    /**
     * remove specific marker by array index
     * removes marker from both map display and data arrays
     * updates marker numbering and adjusts map view if markers remain
     */
    const removeMarker = (index) => {
      if (mapMarkers.value[index]) {
        mapMarkers.value[index].remove()
        mapMarkers.value.splice(index, 1)
      }
      
      markers.value.splice(index, 1)
      updateMarkerNumbers()
      
      if (markers.value.length > 0) {
        fitMapToMarkers()
      }
    }
    
    /**
     * clear all markers from map and reset collections
     * removes all markers from map display and empties data arrays
     * resets marker count and map view to initial state
     */
    const clearMarkers = () => {
      // remove all marker instances
      mapMarkers.value.forEach(marker => marker.remove())
      poiMarkers.value.forEach(marker => marker.remove())
      mapMarkers.value = []
      poiMarkers.value = []

      // clear route lines and info
      routeLines.value.forEach(line => {
        if (map.value.getSource(line.id)) {
          map.value.removeLayer(line.id)
          map.value.removeSource(line.id)
        }
      })
      routeLines.value = []
      routesInfo.value = []
      routeInfo.value = null // clear route info display

      // reset data arrays
      markers.value = []
      navigationMode.value = false

      // reset map view to default
      if (map.value) {
        map.value.flyTo({ center: [144.9631, -37.8136], zoom: 10 })
      }
    }
    
    /**
     * navigate between places by showing routes between markers
     * creates driving routes between consecutive markers using mapbox directions api
     * displays route lines on map with different colors for each segment
     * provides visual navigation guidance between places of interest
     */
    const navigateBetweenPlaces = async () => {
      if (markers.value.length < 2) {
        alert('Need at least 2 markers to draw route') // not enough markers
        return
      }
      
      try {
        // clear previous routes first
        routesInfo.value = []
        routeLines.value.forEach(line => {
          if (map.value.getSource(line.id)) {
            map.value.removeLayer(line.id) // remove route layer
            map.value.removeSource(line.id) // remove route data
          }
        })
        routeLines.value = [] // clear route array
        
        navigationMode.value = true // enable navigation mode
        
        // draw routes between adjacent markers
        for (let i = 0; i < markers.value.length - 1; i++) {
          const start = markers.value[i] // start point
          const end = markers.value[i + 1] // end point
          
          const response = await fetch(
            `https://api.mapbox.com/directions/v5/mapbox/driving/${start.lng},${start.lat};${end.lng},${end.lat}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
          )
          const data = await response.json()
          
          if (data.routes && data.routes.length > 0) {
            const route = data.routes[0] // get first route
            const routeId = `route-${i}` // route ID
            
            // add route data to map
            map.value.addSource(routeId, {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: route.geometry // route geometry data
              }
            })
            
            // add route display layer
            map.value.addLayer({
              id: routeId,
              type: 'line',
              source: routeId,
              layout: {
                'line-join': 'round', // rounded connections
                'line-cap': 'round' // rounded endpoints
              },
              paint: {
                'line-color': i % 2 === 0 ? '#007bff' : '#28a745', // alternate colors: blue and green
                'line-width': 4, // route width
                'line-opacity': 0.8 // transparency
              }
            })
            
            routeLines.value.push({
              id: routeId,
              distance: route.distance, // distance in meters
              duration: route.duration // time in seconds
            })
            routesInfo.value.push({ distance: route.distance, duration: route.duration })
          }
        }
        
        // adjust map to show all routes
        if (markers.value.length > 0) {
          const bounds = new mapboxgl.LngLatBounds() // create bounds box
          markers.value.forEach(marker => bounds.extend([marker.lng, marker.lat])) // include all markers
          map.value.fitBounds(bounds, { padding: 50 }) // fit to bounds with 50px padding
        }
        
      } catch (error) {
        console.error('Navigation error:', error)
        alert('Failed to draw route, try again') // error message
      }
    }

    // google version: draw route between last two points
    const navigateLastTwoGoogle = async () => {
      const userPoints = markers.value.filter(m => m.kind !== 'poi')
      const poiPoints = markers.value.filter(m => m.kind === 'poi')
      
      if (userPoints.length === 0 && poiPoints.length === 0) {
        alert('Please add at least one marker or search for places first')
        return
      }
      
      // If only one user point, try to use current location as second point
      if (userPoints.length === 1 && poiPoints.length === 0) {
        try {
          await new Promise((resolve, reject) => {
            if (!navigator.geolocation) return reject(new Error('geo not supported'))
            navigator.geolocation.getCurrentPosition((pos) => {
              if (googleReady.value && gMap) {
                addGMarker(pos.coords.longitude, pos.coords.latitude, 'My Location', 'user')
              } else {
                addMarker(pos.coords.longitude, pos.coords.latitude, 'My Location', 'user')
              }
              resolve()
            }, reject, { enableHighAccuracy: true, timeout: 8000, maximumAge: 120000 })
          })
        } catch (e) {
          console.warn('Could not get current location:', e)
          alert('Need at least 2 markers to draw route, or enable location services')
          return
        }
      }
      
      // Now try to find two points for navigation
      const updatedUserPoints = markers.value.filter(m => m.kind !== 'poi')
      const updatedPoiPoints = markers.value.filter(m => m.kind === 'poi')
      
      if (updatedUserPoints.length >= 2) {
        // Navigate between last two user points
        const a = updatedUserPoints[updatedUserPoints.length - 2]
        const b = updatedUserPoints[updatedUserPoints.length - 1]
        if (googleReady.value) await drawSingleRouteGoogle(a, b)
      } else if (updatedUserPoints.length === 1 && updatedPoiPoints.length >= 1) {
        // Navigate from user point to nearest POI
        const userPoint = updatedUserPoints[0]
        const nearestPOI = updatedPoiPoints[0]
        if (googleReady.value) await drawSingleRouteGoogle(userPoint, nearestPOI)
      } else {
        alert('Need at least 2 markers to draw route')
      }
    }

    /**
     * drawSingleRoute
     * build one route between origin and dest, replace previous route
     */
    const drawSingleRoute = async (start, end) => {
      try {
        // clear previous
        routesInfo.value = []
        routeLines.value.forEach(line => {
          if (map.value.getSource(line.id)) {
            map.value.removeLayer(line.id)
            map.value.removeSource(line.id)
          }
        })
        routeLines.value = []
        const profile = travelMode.value === 'walking' ? 'walking' : 'driving'
        const response = await fetch(`https://api.mapbox.com/directions/v5/mapbox/${profile}/${start.lng},${start.lat};${end.lng},${end.lat}?geometries=geojson&access_token=${MAPBOX_TOKEN}`)
        const data = await response.json()
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0]
          const routeId = 'route-single'
          map.value.addSource(routeId, { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: route.geometry } })
          map.value.addLayer({ id: routeId, type: 'line', source: routeId, layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#ff7f0e', 'line-width': 4, 'line-opacity': 0.85 } })
          routeLines.value.push({ id: routeId, distance: route.distance, duration: route.duration })
          routesInfo.value.push({ distance: route.distance, duration: route.duration })
          const bounds = new mapboxgl.LngLatBounds()
          bounds.extend([start.lng, start.lat])
          bounds.extend([end.lng, end.lat])
          map.value.fitBounds(bounds, { padding: 50 })
        }
      } catch (e) {
        console.error('drawSingleRoute error', e)
        alert('Failed to draw route')
      }
    }
    
    /**
     * update marker numbers after removal to maintain sequence
     * renumbers all remaining markers to maintain consecutive numbering
     * updates marker display text to reflect current array positions
     */
    const updateMarkerNumbers = () => {
      mapMarkers.value.forEach((marker, index) => {
        const el = marker.getElement()
        el.innerHTML = (index + 1).toString()
      })
    }
    
    /**
     * adjust map bounds to fit all current markers
     * calculates bounding box containing all markers
     * adjusts map viewport to show all markers with padding
     */
    const fitMapToMarkers = () => {
      if (markers.value.length === 0) return
      
      const bounds = new mapboxgl.LngLatBounds()
      markers.value.forEach(marker => {
        bounds.extend([marker.lng, marker.lat])
      })
      
      map.value.fitBounds(bounds, { padding: 50 })
    }
    
    /**
     * search for places of interest using mapbox geocoding api
     * performs forward geocoding to find coordinates for place names
     * focuses on tourist attractions, landmarks, and points of interest
     * adds markers for search results and updates map view
     */
    const searchPlacesOfInterest = async () => {
      if (!searchQuery.value.trim()) return // if search box is empty, don't search
      
      try {
        // try direct search first, no extra keywords, more accurate this way
        let searchTerm = searchQuery.value.trim()
        let response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchTerm)}.json?access_token=${MAPBOX_TOKEN}&limit=3&proximity=144.9631,-37.8136&country=AU`
        )
        let data = await response.json()
        
        // if direct search gets no results, add keywords and try again
        if (!data.features || data.features.length === 0) {
          searchTerm = `${searchQuery.value} tourist attraction landmark` // add tourist keywords
          response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchTerm)}.json?access_token=${MAPBOX_TOKEN}&limit=3&proximity=144.9631,-37.8136&country=AU`
          )
          data = await response.json()
        }
        
        if (data.features && data.features.length > 0) {
          // only add first result, avoid map getting too messy
          const feature = data.features[0] // get first result
          addMarker(feature.center[0], feature.center[1], feature.place_name) // add marker
          
          // smart zoom: adjust zoom level based on place importance
          let zoomLevel = 13 // default zoom level
          if (feature.place_type.includes('poi')) {
            zoomLevel = 15 // if it's a point of interest, zoom in more
          } else if (feature.place_type.includes('place')) {
            zoomLevel = 12 // if it's a city, zoom out a bit
          }
          
          // smoothly fly to search result location
          map.value.flyTo({
            center: feature.center,
            zoom: zoomLevel, // use smart zoom level
            duration: 2000 // 2 second animation time
          })
          
          // update search box to show found place name
          searchQuery.value = feature.place_name
        } else {
          alert('Can\'t find this place, try a different name') // no results found message
        }
      } catch (error) {
        console.error('Search error:', error)
        alert('Search failed, try again') // error message
      }
    }

    /**
     * searchNearbyHospitals
     * find hospitals near current center (or Melbourne default) and add top 3 markers
     */
    const searchNearbyHospitals = async () => {
      try {
        const center = map.value ? map.value.getCenter() : { lng: 144.9631, lat: -37.8136 }
        // try 1: categories filter (preferred for POI)
        let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent('hospital')}.json?access_token=${MAPBOX_TOKEN}&types=poi&categories=hospital,clinic,doctor,medical,pharmacy&limit=5&proximity=${center.lng},${center.lat}&country=AU`
        let res = await fetch(url)
        let data = await res.json()
        // try 2: keyword fallback with larger limit
        if (!data.features || data.features.length === 0) {
          url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent('hospital clinic medical center')}.json?access_token=${MAPBOX_TOKEN}&types=poi&limit=8&proximity=${center.lng},${center.lat}&country=AU`
          res = await fetch(url)
          data = await res.json()
        }
        // try 3: bbox within current map bounds
        if ((!data.features || data.features.length === 0) && map.value) {
          const b = map.value.getBounds()
          const bbox = `${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`
          url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent('hospital')}.json?access_token=${MAPBOX_TOKEN}&types=poi&categories=hospital,clinic,doctor&limit=8&bbox=${bbox}&country=AU`
          res = await fetch(url)
          data = await res.json()
        }

        if (data.features && data.features.length) {
          data.features.forEach((f) => addMarker(f.center[0], f.center[1], f.text || f.place_name, 'poi'))
          map.value.flyTo({ center: [data.features[0].center[0], data.features[0].center[1]], zoom: 13 })
        } else {
          // final fallback: Overpass (OpenStreetMap) within 3km radius
          const over = await fetchHospitalsFromOverpass(center.lng, center.lat)
          if (over.length) {
            over.forEach(p => addMarker(p.lng, p.lat, p.name || 'Hospital/Clinic', 'poi'))
            map.value.flyTo({ center: [over[0].lng, over[0].lat], zoom: 13 })
          } else {
            alert('No nearby hospitals found')
          }
        }
      } catch (e) {
        console.error('Hospital search error', e)
        alert('Failed to search hospitals')
      }
    }

    /**
     * showNearbyHealthcare
     * auto search clinics/hospitals around a clicked point
     */
    const showNearbyHealthcare = async (lng, lat) => {
      try {
        // remove previous POI markers
        poiMarkers.value.forEach(m => m.remove && m.remove())
        poiMarkers.value = []
        // try 1: categories near clicked point
        let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent('hospital')}.json?access_token=${MAPBOX_TOKEN}&types=poi&categories=hospital,clinic,doctor,medical&limit=5&proximity=${lng},${lat}&country=AU`
        let res = await fetch(url)
        let data = await res.json()
        // try 2: keyword fallback
        if (!data.features || data.features.length === 0) {
          url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent('hospital clinic medical center')}.json?access_token=${MAPBOX_TOKEN}&types=poi&limit=8&proximity=${lng},${lat}&country=AU`
          res = await fetch(url)
          data = await res.json()
        }
        if (data.features && data.features.length) {
          data.features.forEach((f) => addMarker(f.center[0], f.center[1], f.text || f.place_name, 'poi'))
        } else {
          const over = await fetchHospitalsFromOverpass(lng, lat)
          over.forEach(p => addMarker(p.lng, p.lat, p.name || 'Hospital/Clinic', 'poi'))
        }
      } catch (e) { console.error('showNearbyHealthcare error', e) }
    }

    /**
     * sosNearestHelp
     * from current location find nearest healthcare poi and navigate
     */
    const sosNearestHelp = async () => {
      try {
        // get current location first
        await new Promise((resolve, reject) => {
          if (!navigator.geolocation) return reject(new Error('geolocation not supported'))
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              addMarker(pos.coords.longitude, pos.coords.latitude, 'Me', 'user')
              resolve()
            },
            (err) => reject(err),
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 120000 }
          )
        })
        const origin = markers.value[markers.value.length - 1]
        // search around origin using robust pipeline
        let list = []
        try {
          const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent('hospital')}.json?access_token=${MAPBOX_TOKEN}&types=poi&categories=hospital,clinic,doctor,medical&limit=5&proximity=${origin.lng},${origin.lat}&country=AU`
          const res = await fetch(url)
          const data = await res.json()
          if (data.features && data.features.length) {
            list = data.features.map(f => ({ lng: f.center[0], lat: f.center[1], name: f.text || f.place_name }))
          }
        } catch {}
        if (list.length === 0) {
          list = await fetchHospitalsFromOverpass(origin.lng, origin.lat)
        }
        if (list.length === 0) {
          alert('No help points nearby, try zooming out or moving the map')
          return
        }
        // choose nearest
        list.sort((a, b) => Math.hypot(a.lng - origin.lng, a.lat - origin.lat) - Math.hypot(b.lng - origin.lng, b.lat - origin.lat))
        const target = list[0]
        addMarker(target.lng, target.lat, target.name || 'Help', 'poi')
        await drawSingleRoute(origin, target)
      } catch (e) {
        console.error('sosNearestHelp error', e)
        alert('Failed to find nearest help')
      }
    }

    /**
     * fetchHospitalsFromOverpass
     * OpenStreetMap Overpass fallback within ~3000m
     */
    const fetchHospitalsFromOverpass = async (lng, lat) => {
      const radius = 3000
      const query = `\n[out:json];\n(\n  node["amenity"~"hospital|clinic|doctors|pharmacy"](around:${radius},${lat},${lng});\n  way["amenity"~"hospital|clinic|doctors|pharmacy"](around:${radius},${lat},${lng});\n);\nout center;\n`
      const endpoints = [
        'https://overpass.kumi.systems/api/interpreter',
        'https://overpass-api.de/api/interpreter',
        'https://overpass.openstreetmap.ru/api/interpreter'
      ]
      const points = []
      for (let i = 0; i < endpoints.length; i++) {
        try {
          const res = await fetch(endpoints[i], {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
            body: new URLSearchParams({ data: query })
          })
          if (!res.ok) {
            // 429/5xx: 退避后尝试下一个节点
            await new Promise(r => setTimeout(r, 500 * (i + 1)))
            continue
          }
          const ct = res.headers.get('content-type') || ''
          if (!ct.includes('application/json')) { continue }
          const json = await res.json()
          for (const el of json.elements || []) {
            if (el.type === 'node') {
              points.push({ lng: el.lon, lat: el.lat, name: el.tags && el.tags.name })
            } else if (el.type === 'way' && el.center) {
              points.push({ lng: el.center.lon, lat: el.center.lat, name: el.tags && el.tags.name })
            }
          }
          if (points.length) break
        } catch (e) {
          // 忽略并尝试下一个
          await new Promise(r => setTimeout(r, 300 * (i + 1)))
        }
      }
      points.sort((a,b)=> (Math.hypot(a.lng-lng, a.lat-lat) - Math.hypot(b.lng-lng, b.lat-lat)))
      return points.slice(0,5)
    }
    
    /**
     * get user's current location using browser geolocation api
     * requests permission and adds marker at user's coordinates
     * centers map view on user's location with appropriate zoom
     */
    const getCurrentLocation = () => {
      if (!navigator.geolocation) {
        alert('Your browser doesn\'t support location feature')
        return
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          if (googleReady.value && gMap) {
            addGMarker(longitude, latitude, 'Me', 'user')
            gMap.setCenter({ lat: latitude, lng: longitude })
            gMap.setZoom(15)
          } else if (map.value) {
            addMarker(longitude, latitude)
            map.value.flyTo({ center: [longitude, latitude], zoom: 15, duration: 1500 })
          }
        },
        (error) => {
          console.error('Location error:', error)
          alert('Failed to get location, check browser permissions')
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      )
    }
    
    /**
     * cleanup function to prevent memory leaks
     * removes map instance and clears all resources when component unmounts
     * prevents page freezing when navigating away from map
     */
    const cleanup = () => {
      try {
        // remove all markers
        mapMarkers.value.forEach(marker => marker.remove())
        
        // remove all route lines
        routeLines.value.forEach(line => {
          if (map.value && map.value.getSource(line.id)) {
            map.value.removeLayer(line.id)
            map.value.removeSource(line.id)
          }
        })
        
        // remove map instance
        if (map.value) {
          map.value.remove()
          map.value = null
        }
        
        // clear arrays
        markers.value = []
        mapMarkers.value = []
        routeLines.value = []
        geocoder.value = null
      } catch (error) {
        console.warn('Cleanup error:', error)
      }
    }
    
    onMounted(async () => {
      // try google first for better POI; fallback to mapbox if fails
      try {
        await loadGoogleMaps()
        initGoogleMap()
      } catch (e) {
        console.warn('Google Maps load failed, fallback to Mapbox', e)
        initMap()
      }
    })
    
    onUnmounted(() => {
      cleanup()
    })
    
    return {
      map,
      markers,
      totalDistance,
      searchQuery,
      addMarker,
      removeMarker,
      clearMarkers,
      searchPlacesOfInterest,
      searchByTextGoogle,
      getCurrentLocation,
      navigateBetweenPlaces,
      navigationMode,
      routeLines,
      routesInfo,
      routeInfo,
      searchNearbyHospitals,
      // google
      drawSingleRouteGoogle,
      searchNearbyHospitalsGoogle,
      showNearbyHealthcare,
      navigateLastTwoGoogle
      // travel mode & sos
      
    }
  }
}
</script>

<style scoped>
.map-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 1rem;
}

/* screen reader only text */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.map-controls {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.search-section {
  display: flex;
  gap: 0.5rem;
  flex: 1;
}

.search-input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #ccc;
}

.search-btn, .control-btn {
  padding: 0.5rem 1rem;
  border: none;
  cursor: pointer;
}

.search-btn {
  background-color: #28a745;
  color: white;
}

.control-buttons {
  display: flex;
  gap: 0.5rem;
}

.control-btn {
  background-color: #007bff;
  color: white;
}

.navigate-btn {
  background-color: #28a745;
}

.clear-btn {
  background-color: #dc3545;
}

.distance-display {
  background-color: #28a745;
  color: white;
  padding: 0.5rem 1rem;
}

.map {
  width: 100%;
  height: 400px;
  border: 1px solid #ccc;
  margin-bottom: 1rem;
}

/* route info display */
.route-info {
  margin: 1rem 0;
  padding: 1rem;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
}

.route-details {
  display: flex;
  gap: 2rem;
  font-weight: bold;
}

.route-details .mode {
  color: #6c757d;
}

.route-details .distance {
  color: #007bff;
}

.route-details .duration {
  color: #28a745;
}

.markers-list {
  background-color: #f8f9fa;
  padding: 1rem;
  margin-bottom: 1rem;
}

.marker-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid #ddd;
}

.marker-number {
  background-color: #007bff;
  color: white;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
}

.marker-coords {
  flex: 1;
  font-family: monospace;
}

.remove-btn {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
}

.instructions {
  background-color: #f8f9fa;
  padding: 1rem;
  border: 1px solid #ddd;
}

:global(.custom-marker) {
  background-color: #007bff;
  color: white;
  width: 25px;
  height: 25px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  border: 2px solid white;
}

@media (max-width: 768px) {
  .map-controls {
    flex-direction: column;
  }
  
  .map {
    height: 300px;
  }
}
</style>
