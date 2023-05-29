import * as GEOLIB from 'geolib'

/**
 * Converts latitude/longitude points into 2D points in coordinate space
 * This is necessary, as working directly with lat/long would cause distortion in some directions
 * @param {array} objPos [lat, long] coordinates of a point
 * @param {array} centerPos [lat, long] coordinates of (arbitrary) center point 
 */
export function GPSRelativePosition(objPos, centerPos) {
    // Get GPS distance
    const dist = GEOLIB.getDistance(objPos, centerPos)

    // Get bearing angle
    const bearing = GEOLIB.getRhumbLineBearing(objPos, centerPos)

    // Calculate X by centerPosi.x + distance * cos(rad)
    const x = centerPos[0] + (dist * Math.cos(bearing * Math.PI / 180))

    // Calculate Y by centerPosi.y + distance * sin(rad)
    const y = centerPos[1] + (dist * Math.sin(bearing * Math.PI / 180))

    // Reverse X
    return [-x / 100, y / 100]
}