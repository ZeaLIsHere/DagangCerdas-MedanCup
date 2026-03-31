// DagangCerdas — Peta UMKM Sekitar
// Visual map representation dengan marker-style list
// MapView akan aktif saat build production dengan API key valid

import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { formatDistance } from '../../services/geo/haversine';
import { DEMO_USER } from '../../utils/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_HEIGHT = 220;

interface MapMarkerItem {
  id: string;
  type: 'user' | 'umkm' | 'vendor';
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  distance?: number;
}

interface UMKMMapProps {
  userLocation: { latitude: number; longitude: number };
  nearbyUMKM: MapMarkerItem[];
  vendors: MapMarkerItem[];
  radiusKm?: number;
  onMarkerPress?: (marker: MapMarkerItem) => void;
}

// Normalize lat/lng to pixel position within the visual map
function toMapPosition(
  lat: number, lng: number,
  centerLat: number, centerLng: number,
  mapWidth: number, mapHeight: number,
  zoom: number = 0.08,
): { left: number; top: number } {
  const x = ((lng - centerLng) / zoom) * mapWidth + mapWidth / 2;
  const y = ((centerLat - lat) / zoom) * mapHeight + mapHeight / 2;
  return {
    left: Math.max(10, Math.min(mapWidth - 30, x)),
    top: Math.max(10, Math.min(mapHeight - 30, y)),
  };
}

export function UMKMMap({
  userLocation,
  nearbyUMKM,
  vendors,
  radiusKm = 5,
  onMarkerPress,
}: UMKMMapProps) {
  const [selectedMarker, setSelectedMarker] = useState<MapMarkerItem | null>(null);
  const mapWidth = SCREEN_WIDTH - 32; // accounting for padding

  const handleMarkerPress = (marker: MapMarkerItem) => {
    setSelectedMarker(prev => prev?.id === marker.id ? null : marker);
    onMarkerPress?.(marker);
  };

  // Get position for each marker
  const userPos = toMapPosition(
    userLocation.latitude, userLocation.longitude,
    userLocation.latitude, userLocation.longitude,
    mapWidth, MAP_HEIGHT
  );

  return (
    <View style={styles.wrapper}>
      {/* Visual Map Area */}
      <View style={styles.mapArea}>
        {/* Grid lines for map feel */}
        <View style={styles.gridOverlay}>
          {[0.2, 0.4, 0.6, 0.8].map(p => (
            <View key={`h${p}`} style={[styles.gridLine, styles.gridLineH, { top: `${p * 100}%` }]} />
          ))}
          {[0.2, 0.4, 0.6, 0.8].map(p => (
            <View key={`v${p}`} style={[styles.gridLine, styles.gridLineV, { left: `${p * 100}%` }]} />
          ))}
        </View>

        {/* Radius circle */}
        <View style={[styles.radiusCircle, {
          left: userPos.left - 60,
          top: userPos.top - 60,
        }]} />

        {/* UMKM markers */}
        {nearbyUMKM.map((u) => {
          const pos = toMapPosition(
            u.latitude, u.longitude,
            userLocation.latitude, userLocation.longitude,
            mapWidth, MAP_HEIGHT
          );
          const isSelected = selectedMarker?.id === u.id;
          return (
            <TouchableOpacity
              key={u.id}
              style={[
                styles.marker, styles.markerUMKM,
                { left: pos.left - 12, top: pos.top - 12 },
                isSelected && styles.markerSelected,
              ]}
              onPress={() => handleMarkerPress(u)}
            >
              <Ionicons name="people" size={12} color="#FFFFFF" />
            </TouchableOpacity>
          );
        })}

        {/* Vendor markers */}
        {vendors.map((v) => {
          const pos = toMapPosition(
            v.latitude, v.longitude,
            userLocation.latitude, userLocation.longitude,
            mapWidth, MAP_HEIGHT
          );
          const isSelected = selectedMarker?.id === v.id;
          return (
            <TouchableOpacity
              key={v.id}
              style={[
                styles.marker, styles.markerVendor,
                { left: pos.left - 12, top: pos.top - 12 },
                isSelected && styles.markerSelected,
              ]}
              onPress={() => handleMarkerPress(v)}
            >
              <Ionicons name="business" size={12} color="#FFFFFF" />
            </TouchableOpacity>
          );
        })}

        {/* User marker (on top) */}
        <View style={[styles.userMarker, { left: userPos.left - 16, top: userPos.top - 16 }]}>
          <Ionicons name="storefront" size={16} color="#FFFFFF" />
        </View>

        {/* Coordinate label */}
        <View style={styles.coordLabel}>
          <Text style={styles.coordText}>
            {userLocation.latitude.toFixed(3)}°N, {userLocation.longitude.toFixed(3)}°E
          </Text>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary[500] }]} />
          <Text style={styles.legendText}>Toko Anda</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
          <Text style={styles.legendText}>UMKM ({nearbyUMKM.length})</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
          <Text style={styles.legendText}>Vendor ({vendors.length})</Text>
        </View>
      </View>

      {/* Selected marker info */}
      {selectedMarker && (
        <View style={styles.infoCard}>
          <Ionicons
            name={selectedMarker.type === 'umkm' ? 'people' : 'business'}
            size={18}
            color={selectedMarker.type === 'umkm' ? colors.success : '#FF9800'}
          />
          <View style={styles.infoCardContent}>
            <Text style={styles.infoCardTitle}>{selectedMarker.title}</Text>
            <Text style={styles.infoCardDesc} numberOfLines={1}>{selectedMarker.description}</Text>
          </View>
          {selectedMarker.distance !== undefined && (
            <Text style={styles.infoCardDist}>{formatDistance(selectedMarker.distance)}</Text>
          )}
          <TouchableOpacity onPress={() => setSelectedMarker(null)}>
            <Ionicons name="close-circle" size={18} color={colors.neutral[400]} />
          </TouchableOpacity>
        </View>
      )}

      {/* Location list */}
      <View style={styles.locationList}>
        {[...nearbyUMKM, ...vendors].sort((a, b) => (a.distance || 99) - (b.distance || 99)).slice(0, 5).map(item => (
          <TouchableOpacity
            key={item.id}
            style={[styles.locationItem, selectedMarker?.id === item.id && styles.locationItemActive]}
            onPress={() => handleMarkerPress(item)}
          >
            <View style={[
              styles.locationDot,
              { backgroundColor: item.type === 'umkm' ? colors.success : '#FF9800' },
            ]} />
            <Text style={styles.locationName} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.locationDist}>
              {item.distance !== undefined ? formatDistance(item.distance) : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },

  // Map area
  mapArea: {
    height: MAP_HEIGHT,
    backgroundColor: '#E8F0FE',
    position: 'relative',
    overflow: 'hidden',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(33, 150, 243, 0.08)',
  },
  gridLineH: {
    left: 0,
    right: 0,
    height: 1,
  },
  gridLineV: {
    top: 0,
    bottom: 0,
    width: 1,
  },

  // Radius circle
  radiusCircle: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(33, 150, 243, 0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(33, 150, 243, 0.2)',
    borderStyle: 'dashed',
  },

  // Markers
  marker: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  markerUMKM: {
    backgroundColor: colors.success,
  },
  markerVendor: {
    backgroundColor: '#FF9800',
  },
  markerSelected: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: colors.primary[500],
    elevation: 6,
  },
  userMarker: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 10,
  },

  // Coordinate label
  coordLabel: {
    position: 'absolute',
    bottom: 6,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  coordText: {
    fontSize: 9,
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },

  // Legend
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    color: colors.text.secondary,
    fontWeight: '500',
  },

  // Info card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.neutral[50],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardTitle: {
    ...typography.labelSm,
    color: colors.text.primary,
  },
  infoCardDesc: {
    fontSize: 10,
    color: colors.text.tertiary,
  },
  infoCardDist: {
    ...typography.caption,
    color: colors.primary[600],
    fontWeight: '700',
  },

  // Location list
  locationList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    gap: spacing.sm,
  },
  locationItemActive: {
    backgroundColor: colors.primary[50],
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
  },
  locationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  locationName: {
    ...typography.bodySm,
    color: colors.text.primary,
    flex: 1,
  },
  locationDist: {
    ...typography.caption,
    color: colors.primary[600],
    fontWeight: '600',
  },
});
