<template>
  <div class="map-container">
    <h1>Mental Health Resources Map</h1>
    
    <!-- map controls with search and navigation -->
    <div class="map-controls" role="region" aria-label="Map search and navigation controls">
      <div class="search-section">
        <input 
          v-model="searchQuery" 
          @keyup.enter="searchPlacesOfInterest"
          placeholder="Search places of interest..."
          class="search-input"
          aria-label="Search for places of interest"
          aria-describedby="search-instructions"
        />
        <button @click="searchPlacesOfInterest" class="search-btn" aria-label="Search for the entered location">
          Search
        </button>
      </div>
      <div class="control-buttons">
        <button @click="getCurrentLocation" class="control-btn location-btn" aria-label="Get my current location">
          My Location
        </button>
        <button @click="navigateBetweenPlaces" class="control-btn navigate-btn" aria-label="Show navigation routes between markers">
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
    
    <!-- markers list showing coordinates and remove options -->
    <div v-if="markers.length > 0" class="markers-list">
      <h3>Markers ({{ markers.length }})</h3>
      <div v-for="(marker, index) in markers" :key="index" class="marker-item">
        <span class="marker-number">{{ index + 1 }}</span>
        <span class="marker-coords">
          {{ marker.lng.toFixed(4) }}, {{ marker.lat.toFixed(4) }}
        </span>
        <button @click="removeMarker(index)" class="remove-btn">Remove</button>
      </div>
    </div>
    
    <!-- usage instructions for map features -->
    <div class="instructions">
      <h3>Instructions</h3>
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

export default {
  name: 'Map',
  setup() {
    const map = ref(null)
    const markers = ref([])
    const mapMarkers = ref([])
    const searchQuery = ref('')
    const geocoder = ref(null)
    const routeLines = ref([])
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
      map.value.on('click', (e) => {
        addMarker(e.lngLat.lng, e.lngLat.lat)
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
        document.getElementById('map').innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;background:#f8f9fa;color:#666;"><div><h3>Map Loading...</h3><p>If map doesn\'t appear, try refreshing the page</p></div></div>'
      })
    }
    
    /**
     * add new marker to map and update marker collections
     * creates numbered marker element and adds to both data arrays
     * adjusts map view to fit all markers when multiple exist
     * supports custom titles for places of interest
     */
    const addMarker = (lng, lat, title = null) => {
      const markerData = { lng, lat, title: title || `Marker ${markers.value.length + 1}` } // create marker data
      markers.value.push(markerData) // add to marker array
      
      // create numbered marker element
      const el = document.createElement('div')
      el.className = 'custom-marker'
      el.innerHTML = markers.value.length.toString() // show marker number
      
      // add marker to map
      const marker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat]) // set coordinates
        .addTo(map.value) // add to map
      
      // add popup if title exists
      if (title) {
        marker.setPopup(new mapboxgl.Popup().setText(title)) // set popup content
      }
      
      mapMarkers.value.push(marker) // add to marker instance array
      
      // adjust map view if multiple markers exist
      if (markers.value.length > 1) {
        fitMapToMarkers() // fit all markers
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
      mapMarkers.value.forEach(marker => marker.remove())
      
      // clear route lines
      routeLines.value.forEach(line => {
        if (map.value.getSource(line.id)) {
          map.value.removeLayer(line.id)
          map.value.removeSource(line.id)
        }
      })
      routeLines.value = []
      
      mapMarkers.value = []
      markers.value = []
      navigationMode.value = false
      
      // reset map view to default
      map.value.flyTo({
        center: [144.9631, -37.8136], // Melbourne coordinates
        zoom: 10
      })
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
     * get user's current location using browser geolocation api
     * requests permission and adds marker at user's coordinates
     * centers map view on user's location with appropriate zoom
     */
    const getCurrentLocation = () => {
      if (!navigator.geolocation) {
        alert('Your browser doesn\'t support location feature') // browser doesn't support location
        return
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords // get lat/lng coordinates
          addMarker(longitude, latitude) // add current location marker
          
          // smoothly fly to user location
          map.value.flyTo({
            center: [longitude, latitude], // set map center
            zoom: 15, // zoom to level 15, see more clearly
            duration: 1500 // 1.5 second animation time
          })
        },
        (error) => {
          console.error('Location error:', error)
          alert('Failed to get location, check browser permissions') // location failed
        },
        {
          enableHighAccuracy: true, // enable high accuracy location
          timeout: 10000, // 10 second timeout
          maximumAge: 300000 // cache for 5 minutes
        }
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
    
    onMounted(() => {
      initMap()
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
      getCurrentLocation,
      navigateBetweenPlaces,
      navigationMode,
      routeLines
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
